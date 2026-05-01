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
    console.log("Checking treatments for Proforma #101...");
    const res = await client.query(`
        SELECT 
            id, 
            fecha, 
            tratamiento, 
            precio, 
            descuento, 
            "precioConDescuento", 
            cancelado, 
            "estadoTratamiento", 
            "proformaId"
        FROM historia_clinica 
        WHERE "proformaId" = 101 
        ORDER BY fecha ASC, id ASC
    `);
    console.table(res.rows);
    await client.end();
}

run().catch(console.error);
