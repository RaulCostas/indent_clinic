import { createConnection } from 'typeorm';
import axios from 'axios';

async function migrateCloudSignatures() {
  console.log('--- Iniciando Migración en la NUBE (Supabase) ---');
  
  try {
    const connection = await createConnection({
      type: 'postgres',
      host: 'db.vtpdcimxcakktpnqjylc.supabase.co',
      port: 5432,
      username: 'postgres',
      password: 'boquenze654',
      database: 'postgres',
      synchronize: false,
      logging: false,
    });

    console.log('Conexión con Supabase establecida con éxito.');

    // 1. Buscar todas las firmas con HTTPS
    const legacySignatures = await connection.query(`
      SELECT id, "tipoDocumento", "documentoId", "firmaData" 
      FROM firmas_digitales 
      WHERE "firmaData" LIKE 'https%'
    `);

    console.log(`Se encontraron ${legacySignatures.length} firmas para convertir.`);

    let count = 0;
    for (const f of legacySignatures) {
      try {
        console.log(`[${count + 1}/${legacySignatures.length}] Convirtiendo firma ${f.id}...`);
        
        const res = await axios.get(f.firmaData, { responseType: 'arraybuffer' });
        const contentType = res.headers['content-type'] || 'image/png';
        const base64 = `data:${contentType};base64,${Buffer.from(res.data).toString('base64')}`;
        
        // Update main table
        await connection.query('UPDATE firmas_digitales SET "firmaData" = $1 WHERE id = $2', [base64, f.id]);
        
        // Sync with modules
        const { tipoDocumento, documentoId } = f;
        if (tipoDocumento === 'paciente') {
          await connection.query('UPDATE pacientes SET "firmaFC" = $1 WHERE id = $2', [base64, documentoId]);
        } else if (tipoDocumento === 'proforma' || tipoDocumento === 'presupuesto') {
          await connection.query('UPDATE proformas SET "firma" = $1 WHERE id = $2', [base64, documentoId]);
        } else if (tipoDocumento === 'receta') {
          await connection.query('UPDATE receta SET "firma" = $1 WHERE id = $2', [base64, documentoId]);
        } else if (tipoDocumento === 'historia_clinica') {
          await connection.query('UPDATE historia_clinica SET "firmaPaciente" = $1 WHERE id = $2', [base64, documentoId]);
        }
        
        count++;
      } catch (e) {
        console.error(`Error en firma ${f.id}:`, e.message);
      }
    }

    await connection.close();
    console.log(`--- Migración terminada. Se rescataron ${count} firmas ---`);
  } catch (error) {
    console.error('Error fatal en la migración cloud:', error);
  }
}

migrateCloudSignatures();
