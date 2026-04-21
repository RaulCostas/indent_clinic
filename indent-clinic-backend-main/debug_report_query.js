
const { Client } = require('pg');
const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'indent_clinic'
});

async function debugReport() {
    try {
        await client.connect();
        console.log('--- DEBUG START ---');
        
        // 1. Verificar registros de venta
        const sales = await client.query('SELECT * FROM venta_producto');
        console.log('Ventas encontradas:', sales.rowCount);
        
        // 2. Verificar pacientes
        const pacientes = await client.query('SELECT id, nombre FROM pacientes');
        console.log('Pacientes encontrados:', pacientes.rowCount);

        // 3. Verificar detalles con nombres de productos
        const query = `
            SELECT 
                v.id as venta_id,
                p.nombre as paciente_nombre,
                vd.cantidad,
                prod.nombre as producto_nombre
            FROM venta_producto v
            LEFT JOIN pacientes p ON v."pacienteId" = p.id
            LEFT JOIN venta_producto_detalle vd ON vd."ventaId" = v.id
            LEFT JOIN producto_comercial prod ON vd."productoId" = prod.id
        `;
        const details = await client.query(query);
        console.log('RESULTADO JOIN:', JSON.stringify(details.rows, null, 2));

    } catch (err) {
        console.error('DEBUG ERROR:', err);
    } finally {
        await client.end();
    }
}

debugReport();
