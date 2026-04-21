
const { Client } = require('pg');
const d = require('dotenv');
const path = require('path');
d.config({ path: path.join(__dirname, '.env') });

async function checkClinicas() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgrespg',
        database: process.env.DB_DATABASE || 'indent_clinic',
    });

    try {
        await client.connect();
        console.log("Connected to Postgres");
        const res = await client.query("SELECT id, nombre, activo FROM clinicas");
        console.log("Clinicas in DB:", JSON.stringify(res.rows, null, 2));
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}
checkClinicas();
