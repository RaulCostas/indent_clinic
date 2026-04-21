
import { DataSource } from 'typeorm';
import { Proforma } from '../src/proformas/entities/proforma.entity';
import { ProformaDetalle } from '../src/proformas/entities/proforma-detalle.entity';
import { User } from '../src/users/entities/user.entity';
import { Paciente } from '../src/pacientes/entities/paciente.entity';

// Define minimal entities to avoid loading everything if possible, 
// but TypeORM relationships might complain. 
// I'll try to load just Proforma and User if possible, but Proforma imports others.
// Ideally I should import them all or check if I can use a raw generic update.
// Actually, raw query is safer/easier for a quick fix without entity tree.

const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgrespg',
    database: 'curare',
    // synchronise: false, don't sync!
    logging: true,
});

async function run() {
    try {
        await dataSource.initialize();
        console.log('Connected to database');

        // Execute raw update
        await dataSource.query(
            `UPDATE proformas SET usuario_aprobado = 3, fecha_aprobado = '2025-12-17' WHERE id = 4`
        );

        console.log('Update executed successfully via Raw SQL');

        const result = await dataSource.query(`SELECT id, usuario_aprobado, fecha_aprobado FROM proformas WHERE id = 4`);
        console.table(result);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await dataSource.destroy();
    }
}

run();
