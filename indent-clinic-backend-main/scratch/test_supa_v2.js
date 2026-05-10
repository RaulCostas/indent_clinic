const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        connectionString: "postgresql://postgres.vtpdcimxcakktpnqjylc:boquenze654@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log("SUCCESS: Connection to Supabase established!");
        await client.end();
    } catch (err) {
        console.error("FAILED: Could not connect to Supabase.");
        console.error(err.message);
    }
}

testConnection();
