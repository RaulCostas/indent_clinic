
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function fix() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    // 1. Check null sucursales
    const resNull = await client.query('SELECT count(*) FROM agenda WHERE "sucursalId" IS NULL');
    console.log('Appointments without sucursal:', resNull.rows[0].count);
    
    if (parseInt(resNull.rows[0].count) > 0) {
        // 2. Find principal sucursal
        const resSuc = await client.query('SELECT id FROM sucursales WHERE es_principal = true LIMIT 1');
        let sucursalId = resSuc.rows[0]?.id;
        
        if (!sucursalId) {
            const resFirst = await client.query('SELECT id FROM sucursales LIMIT 1');
            sucursalId = resFirst.rows[0]?.id;
        }
        
        if (sucursalId) {
            console.log('Updating appointments to sucursalId:', sucursalId);
            await client.query('UPDATE agenda SET "sucursalId" = $1 WHERE "sucursalId" IS NULL', [sucursalId]);
            console.log('Update complete.');
        } else {
            console.warn('No sucursal found to associate appointments with.');
        }
    }
    
    await client.end();
}
fix().catch(console.error);
