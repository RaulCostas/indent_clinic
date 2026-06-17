import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

async function cleanSignatures() {
  console.log('--- Limpieza de firmas HTTPS (Fase 2) ---');
  
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

    const queries = [
      { table: 'receta', column: 'firma', value: 'NULL' },
      { table: 'firmas_digitales', column: 'firmaData', value: "''" },
    ];

    for (const q of queries) {
      try {
        console.log(`Limpiando "${q.table}"...`);
        const result = await connection.query(`
          UPDATE "${q.table}" 
          SET "${q.column}" = ${q.value} 
          WHERE "${q.column}" LIKE 'https%'
        `);
        console.log(`✓ ${q.table} actualizada.`);
      } catch (e) {
        console.warn(`✗ Error en ${q.table}: ${e.message}`);
      }
    }

    await connection.close();
    console.log('--- Limpieza completada ---');
  } catch (error) {
    console.error('Error fatal:', error);
  }
}

cleanSignatures();
