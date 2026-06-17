import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';
import axios from 'axios';

dotenv.config({ path: join(__dirname, '../.env') });

async function migrateAndSyncSignatures() {
  console.log('--- Iniciando Misión de Rescate y Conversión a Base64 ---');
  
  try {
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: false,
      logging: false,
    });

    console.log('Conexión establecida.');

    // 1. Buscar todas las firmas con HTTPS en la tabla principal
    const legacySignatures = await connection.query(`
      SELECT id, "tipoDocumento", "documentoId", "firmaData" 
      FROM firmas_digitales 
      WHERE "firmaData" LIKE 'https%'
    `);

    console.log(`Se encontraron ${legacySignatures.length} firmas para convertir.`);

    for (const firma of legacySignatures) {
      try {
        console.log(`Convirtiendo firma ID ${firma.id} (${firma.tipoDocumento})...`);
        
        // Descargar imagen
        const response = await axios.get(firma.firmaData, { responseType: 'arraybuffer' });
        const contentType = response.headers['content-type'] || 'image/png';
        const base64 = `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`;

        // 2. Actualizar tabla firmas_digitales
        await connection.query(
          'UPDATE firmas_digitales SET "firmaData" = $1 WHERE id = $2',
          [base64, firma.id]
        );

        // 3. Sincronizar con la tabla correspondiente
        const { tipoDocumento, documentoId } = firma;
        if (tipoDocumento === 'paciente') {
          await connection.query('UPDATE pacientes SET "firmaFC" = $1 WHERE id = $2', [base64, documentoId]);
        } else if (tipoDocumento === 'proforma' || tipoDocumento === 'presupuesto') {
          await connection.query('UPDATE proformas SET "firma" = $1 WHERE id = $2', [base64, documentoId]);
        } else if (tipoDocumento === 'receta') {
          await connection.query('UPDATE receta SET "firma" = $1 WHERE id = $2', [base64, documentoId]);
        } else if (tipoDocumento === 'historia_clinica') {
          await connection.query('UPDATE historia_clinica SET "firmaPaciente" = $1 WHERE id = $2', [base64, documentoId]);
        }

        console.log(`✓ Firma ${firma.id} sincronizada correctamente.`);
      } catch (err) {
        console.error(`✗ Error convirtiendo firma ${firma.id}:`, err.message);
      }
    }

    await connection.close();
    console.log('--- Misión de Rescate Completada ---');
  } catch (error) {
    console.error('Error fatal en la migración:', error);
  }
}

migrateAndSyncSignatures();
