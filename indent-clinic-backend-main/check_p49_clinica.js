
const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'postgrespg',
        database: 'indent_clinic',
    });

    try {
        await client.connect();
        const res = await client.query("SELECT id, \"clinicaId\" FROM pacientes WHERE id = 49");
        console.log("PACIENTE 49 CLINICA:", res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

check();
