
const { Client } = require('pg');
const d = require('dotenv');
const path = require('path');
d.config({ path: path.join(__dirname, '.env') });

async function fixData() {
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
        
        // Asignar sede 1 a citas sin sede
        console.log("Fixing null clinicaId in agenda...");
        const res = await client.query("UPDATE agenda SET \"clinicaId\" = 1 WHERE \"clinicaId\" IS NULL");
        console.log(`Updated ${res.rowCount} records with default clinic ID 1.`);
        
        await client.end();
        console.log("Database repair complete.");
    } catch (err) {
        console.error("Error:", err);
    }
}
fixData();
