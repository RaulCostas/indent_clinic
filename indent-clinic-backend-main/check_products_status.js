
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkProducts() {
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
        console.log("Checking products status in database...");
        const res = await client.query("SELECT id, nombre, estado, \"clinicaId\" FROM producto_comercial");
        
        console.log(`Found ${res.rows.length} total products.`);
        console.table(res.rows);
        
        const resActivo = await client.query("SELECT COUNT(*) FROM producto_comercial WHERE estado = 'activo'");
        console.log(`Products with status 'activo' (lowercase): ${resActivo.rows[0].count}`);
        
        const resActivoUpper = await client.query("SELECT COUNT(*) FROM producto_comercial WHERE estado = 'Activo'");
        console.log(`Products with status 'Activo' (Uppercase): ${resActivoUpper.rows[0].count}`);
        
        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

checkProducts();
