const { Client } = require('pg');

async function wipe() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'postgrespg',
        database: 'indent_clinic'
    });
    
    try {
        await client.connect();
        const res = await client.query('DELETE FROM whatsapp_sessions');
        console.log(`Deleted ${res.rowCount} corrupted session keys.`);
        await client.end();
    } catch (e) {
        console.error('Error:', e.message);
    }
}
wipe();
