
const { Client } = require('pg');

async function fix() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'postgrespg',
        database: 'indent_clinic',
    });

    try {
        await client.connect();
        const res = await client.query("UPDATE proformas SET \"clinicaId\" = 2 WHERE \"pacienteId\" = 49 AND \"clinicaId\" IS NULL");
        console.log(`Updated ${res.rowCount} proformas for paciente 49.`);
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

fix();
