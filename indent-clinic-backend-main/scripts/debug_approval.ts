
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgrespg',
    database: 'curare',
    logging: false,
});

async function run() {
    try {
        await dataSource.initialize();
        console.log('Connected to database');

        const users = await dataSource.query(`SELECT id, name, codigo_proforma FROM "user"`);
        console.table(users);

        // Simulate lookup
        // Assuming user enters a code, let's see which users match
        const codes = users.map((u: any) => u.codigo_proforma).filter((c: any) => c);
        console.log('Codes found:', codes);

        // Check for duplicates
        const duplicates = codes.filter((item: any, index: any) => codes.indexOf(item) !== index);
        if (duplicates.length > 0) {
            console.log('WARNING: Duplicate codes found:', duplicates);
        } else {
            console.log('No duplicate codes found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await dataSource.destroy();
    }
}

run();
