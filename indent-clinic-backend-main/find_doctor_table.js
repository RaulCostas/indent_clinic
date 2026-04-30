const { Client } = require('pg');
const c = new Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'indent_clinic' });
c.connect().then(async () => {
    const r = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%doctor%'");
    console.log('Doctor tables:', r.rows);
    await c.end();
});
