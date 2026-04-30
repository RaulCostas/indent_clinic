const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function wipe() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query('DELETE FROM whatsapp_sessions');
    console.log(`Deleted ${res.rowCount} corrupted session keys.`);
    await client.end();
}
wipe().catch(console.error);
