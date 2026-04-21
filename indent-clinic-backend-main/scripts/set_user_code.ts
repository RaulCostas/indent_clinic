
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgrespg',
    database: 'curare',
    logging: true,
});

async function run() {
    try {
        await dataSource.initialize();
        console.log('Connected to database');

        // Execute raw update
        await dataSource.query(
            `UPDATE "user" SET codigo_proforma = 3333 WHERE id = 3`
        );

        console.log('Update executed successfully via Raw SQL');

        const result = await dataSource.query(`SELECT id, name, codigo_proforma FROM "user" WHERE id = 3`);
        console.table(result);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await dataSource.destroy();
    }
}

run();
