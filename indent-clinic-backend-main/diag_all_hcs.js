const { Client } = require('pg');
const client = new Client({ 
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'indent_clinic'
});

async function run() {
    await client.connect();
    console.log("Checking ALL treatments for Rodrigo Lens (#49)...");
    const res = await client.query(`
        SELECT 
            hc.id, 
            hc.fecha, 
            hc.tratamiento, 
            hc.precio, 
            hc.cancelado, 
            prof.numero as "plan"
        FROM historia_clinica hc
        LEFT JOIN proformas prof ON hc."proformaId" = prof.id
        WHERE hc."pacienteId" = 49 
        ORDER BY hc.fecha DESC, hc.id DESC
    `);
    console.table(res.rows);
    await client.end();
}

run().catch(console.error);
