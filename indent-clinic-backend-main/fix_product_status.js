
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function fixProductStatus() {
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
        console.log("Updating products status to lowercase in database...");
        
        // Update 'Activo' to 'activo'
        const resActivo = await client.query("UPDATE producto_comercial SET estado = 'activo' WHERE estado = 'Activo'");
        console.log(`Updated ${resActivo.rowCount} products from 'Activo' to 'activo'.`);
        
        // Update 'Inactivo' to 'inactivo' just in case
        const resInactivo = await client.query("UPDATE producto_comercial SET estado = 'inactivo' WHERE estado = 'Inactivo'");
        console.log(`Updated ${resInactivo.rowCount} products from 'Inactivo' to 'inactivo'.`);
        
        await client.end();
        console.log("Migration complete.");
    } catch (err) {
        console.error("Error during migration:", err);
    }
}

fixProductStatus();
