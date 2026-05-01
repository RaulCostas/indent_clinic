
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
        console.log("\nALL PROFORMAS FOR PACIENTE 49:");
        const resProformas = await client.query("SELECT id, numero, \"pacienteId\", \"clinicaId\", total, fecha FROM proformas WHERE \"pacienteId\" = 49 ORDER BY numero ASC");
        console.table(resProformas.rows);
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

check();
