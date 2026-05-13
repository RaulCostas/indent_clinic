const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'indent_clinic',
  password: 'postgrespg',
  port: 5434,
});

async function checkSignatures() {
  await client.connect();
  const res = await client.query('SELECT id, "firmaFC" FROM pacientes WHERE "firmaFC" IS NOT NULL AND "firmaFC" != \'\' LIMIT 5');
  console.log('Pacientes con firmaFC:');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

checkSignatures().catch(err => {
  console.error(err);
  process.exit(1);
});
