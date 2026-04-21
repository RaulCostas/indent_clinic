
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkData() {
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
        const today = new Date().toISOString().split('T')[0];
        console.log(`Checking appointments for today (${today})...`);
        const res = await client.query("SELECT COUNT(*) FROM agenda WHERE fecha = $1 AND estado != 'eliminado'", [today]);
        console.log(`Appointments today: ${res.rows[0].count}`);
        
        const resTotal = await client.query("SELECT COUNT(*) FROM agenda WHERE estado != 'eliminado'");
        console.log(`Total active appointments: ${resTotal.rows[0].count}`);
        
        const sample = await client.query("SELECT id, fecha, hora, \"pacienteId\", \"doctorId\", clinicaId FROM agenda WHERE estado != 'eliminado' LIMIT 3");
        console.log("Sample records:", JSON.stringify(sample.rows, null, 2));
        
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

checkData();
