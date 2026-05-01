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
    console.log("Searching for payments on 2026-05-01...");
    const res = await client.query(`
        SELECT 
            p.id, 
            p.fecha, 
            p.monto, 
            p."proformaId", 
            p."historiaClinicaId", 
            p.observaciones, 
            pac.id as "pacienteId",
            pac.nombre, 
            pac.paterno 
        FROM pagos p 
        JOIN pacientes pac ON p."pacienteId" = pac.id 
        WHERE p.fecha >= '2026-05-01' 
        ORDER BY p.id DESC 
        LIMIT 20
    `);
    console.table(res.rows);
    await client.end();
}

run().catch(console.error);
