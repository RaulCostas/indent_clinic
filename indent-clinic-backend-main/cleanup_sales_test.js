
const { Client } = require('pg');
const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'indent_clinic'
});

async function clearTestingData() {
    try {
        await client.connect();
        console.log('Connected to database for cleanup.');

        // Delete test egreso
        const egresoRes = await client.query('DELETE FROM egresos WHERE id = 9');
        console.log(`Deleted ${egresoRes.rowCount} egreso(s).`);

        // Delete all sales details first (due to foreign key)
        const detailsRes = await client.query('DELETE FROM venta_producto_detalle');
        console.log(`Deleted ${detailsRes.rowCount} sales details.`);

        // Delete all sales
        const salesRes = await client.query('DELETE FROM venta_producto');
        console.log(`Deleted ${salesRes.rowCount} sales.`);

        // Reset IDs if desired (optional, but good for clean testing)
        await client.query('ALTER SEQUENCE venta_producto_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE venta_producto_detalle_id_seq RESTART WITH 1');
        console.log('Sequences reset.');

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await client.end();
    }
}

clearTestingData();
