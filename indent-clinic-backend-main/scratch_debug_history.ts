import { DataSource } from 'typeorm';

async function debug() {
    const ds = new DataSource({
        type: 'postgres', host: 'localhost', port: 5433, username: 'postgres', password: 'postgrespg', database: 'indent_clinic',
    });
    try {
        await ds.initialize();
        const history = await ds.query('SELECT * FROM historia_clinica WHERE "proformaId" = 17');
        console.log('History for Proforma 17:', JSON.stringify(history, null, 2));
        await ds.destroy();
    } catch (e) { console.error(e); }
}
debug();
