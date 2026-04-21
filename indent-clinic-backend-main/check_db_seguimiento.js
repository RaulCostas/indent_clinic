const { Client } = require('pg');

async function checkSchema() {
    const client = new Client({
        connectionString: 'postgresql://postgres:postgrespg@localhost:5433/indent_clinic'
    });

    try {
        await client.connect();
        console.log('--- COLUMNS IN seguimiento_trabajo ---');
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'seguimiento_trabajo'
            ORDER BY ordinal_position;
        `);
        console.table(res.rows);
        
    } catch (err) {
        console.error('Error connecting to DB:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
