const { Client } = require('pg');
const client = new Client({
    host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'indent_clinic'
});

async function audit() {
    await client.connect();
    try {
        const proformaId = 3;
        const p = (await client.query('SELECT total, sub_total, descuento FROM proformas WHERE id = $1', [proformaId])).rows[0];
        console.log('Proforma 3:', p);
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
audit();
