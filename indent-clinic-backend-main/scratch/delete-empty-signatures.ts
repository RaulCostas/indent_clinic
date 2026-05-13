import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../.env') });

async function deleteEmptySignatures() {
  console.log('--- Eliminando registros de firmas vacíos ---');
  
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

    // En firmas_digitales, eliminamos los que tengan firmaData vacío o NULL
    const result = await connection.query(`
      DELETE FROM "firmas_digitales" 
      WHERE "firmaData" IS NULL OR "firmaData" = ''
    `);
    console.log('Registros eliminados de firmas_digitales:', result);

    await connection.close();
    console.log('--- Limpieza de registros completada ---');
  } catch (error) {
    console.error('Error fatal:', error);
  }
}

deleteEmptySignatures();
