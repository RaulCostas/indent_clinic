const { Client } = require('pg');
const client = new Client({
    host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'indent_clinic'
});

async function check() {
    await client.connect();
    try {
        const res = await client.query('SELECT tratamiento, precio FROM proforma_detalles WHERE "proformaId" = 10');
        console.log(JSON.stringify(res.rows, null, 2));
    } finally {
        await client.end();
    }
}
check();
