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
    console.log("Checking payments for Proforma of HC #109...");
    const res = await client.query(`
        SELECT * FROM pagos 
        WHERE "proformaId" = (SELECT "proformaId" FROM historia_clinica WHERE id = 109)
    `);
    console.table(res.rows);
    await client.end();
}

run().catch(console.error);
