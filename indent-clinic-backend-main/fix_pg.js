
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function fix() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgrespg',
        database: process.env.DB_DATABASE || 'indent_clinic',
    });

    try {
        await client.connect();
        console.log("Connected to Postgres");
        
        console.log("Adding observacion column...");
        await client.query("ALTER TABLE agenda ADD COLUMN IF NOT EXISTS observacion text NULL");
        
        console.log("Adding sucursal column...");
        await client.query("ALTER TABLE agenda ADD COLUMN IF NOT EXISTS sucursal varchar(100) NULL");
        
        console.log("Database updated successfully");
        await client.end();
    } catch (err) {
        console.error("Error updating database:", err);
    }
}

fix();
