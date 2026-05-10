const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        host: 'db.vtpdcimxcakktpnqjylc.supabase.co',
        port: 5432,
        user: 'postgres',
        password: 'postgrespg',
        database: 'postgres', // Supabase default
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log("SUCCESS: Connection to Supabase established with 'postgrespg'");
        await client.end();
    } catch (err) {
        console.error("FAILED: Could not connect to Supabase with 'postgrespg'");
        // console.error(err);
    }
}

testConnection();
