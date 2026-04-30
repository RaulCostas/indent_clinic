const { Client } = require('pg');
const client = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'indent_clinic' });
client.connect().then(async () => {
    const res = await client.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('agenda', 'historia_clinica') AND column_name = 'fecha'");
    console.table(res.rows);
    await client.end();
});
