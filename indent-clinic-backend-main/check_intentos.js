const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'postgrespg',
  database: 'indent_clinic',
});
client.connect();
client.query('SELECT action, keywords FROM chatbot_intentos', (err, res) => {
  if (err) console.error(err);
  else console.log(res.rows);
  client.end();
});
