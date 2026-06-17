
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgrespg',
    database: 'indent_clinic',
    logging: false,
});

async function run() {
    try {
        await dataSource.initialize();
        console.log('Connected to database');

        const countQuery = `
            SELECT COUNT(*) as count
            FROM agenda a
            WHERE a.fecha <= '2026-05-03' 
              AND LOWER(a.estado) = 'atendido'
              AND a."pacienteId" IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 
                  FROM historia_clinica hc 
                  WHERE hc."pacienteId" = a."pacienteId" 
                    AND hc.fecha = a.fecha
              );
        `;

        const beforeCount = await dataSource.query(countQuery);
        console.log(`Found ${beforeCount[0].count} missing clinical history records for valid patients.`);

        if (Number(beforeCount[0].count) === 0) {
            console.log('No records to migrate.');
            return;
        }

        const insertQuery = `
            INSERT INTO historia_clinica (
                "pacienteId", 
                fecha, 
                tratamiento, 
                observaciones, 
                "doctorId", 
                "clinicaId", 
                "estadoTratamiento", 
                "estadoPresupuesto", 
                "precio", 
                "descuento", 
                "precioConDescuento", 
                cancelado,
                "createdAt",
                "updatedAt"
            )
            SELECT 
                a."pacienteId", 
                a.fecha, 
                'CONSULTA (MIGRACIÓN)', 
                'Registro automático por actualización de versión - Limpieza de dashboard', 
                a."doctorId", 
                a."clinicaId", 
                'terminado', 
                'terminado', 
                0, 0, 0, true,
                NOW(),
                NOW()
            FROM agenda a
            WHERE a.fecha <= '2026-05-03' 
              AND LOWER(a.estado) = 'atendido'
              AND a."pacienteId" IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 
                  FROM historia_clinica hc 
                  WHERE hc."pacienteId" = a."pacienteId" 
                    AND hc.fecha = a.fecha
              );
        `;

        await dataSource.query(insertQuery);
        console.log('Migration INSERT completed.');

        const afterCount = await dataSource.query(countQuery);
        console.log(`Remaining missing records: ${afterCount[0].count}`);

    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await dataSource.destroy();
    }
}

run();
