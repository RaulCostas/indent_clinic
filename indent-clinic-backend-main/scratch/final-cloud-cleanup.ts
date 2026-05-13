import { createConnection } from 'typeorm';

async function cleanupCloudModules() {
  console.log('--- Limpiando Tablas de Módulos en la NUBE (Respetando histórico) ---');
  
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

    const tables = [
      { name: 'pacientes', column: 'firmaFC' },
      { name: 'proformas', column: 'firma' },
      { name: 'receta', column: 'firma' },
      { name: 'historia_clinica', column: 'firmaPaciente' }
    ];

    for (const t of tables) {
      console.log(`Limpiando "${t.name}"...`);
      const result = await connection.query(`
        UPDATE "${t.name}" 
        SET "${t.column}" = NULL 
        WHERE "${t.column}" LIKE 'https%'
      `);
      console.log(`✓ ${t.name} actualizada.`);
    }

    await connection.close();
    console.log('--- Limpieza completada con éxito ---');
  } catch (error) {
    console.error('Error fatal en la limpieza cloud:', error);
  }
}

cleanupCloudModules();
