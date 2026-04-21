
const { Client } = require('pg');
const fs = require('fs');
const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'indent_clinic'
});

async function captureRealQuery() {
    try {
        await client.connect();
        const year = 2026;
        const month = 4;
        
        const query = `
            SELECT 
                v.id as "ventaId",
                v.fecha,
                v.total,
                v."comision_monto",
                v."comision_pagada",
                v."personalId",
                per.nombre as "personalNombre",
                per.paterno as "personalPaterno",
                pac.nombre as "pacienteNombre",
                vd.cantidad,
                prod.nombre as "productoNombre"
            FROM venta_producto v
            LEFT JOIN personal per ON v."personalId" = per.id
            LEFT JOIN pacientes pac ON v."pacienteId" = pac.id
            LEFT JOIN venta_producto_detalle vd ON vd."ventaId" = v.id
            LEFT JOIN producto_comercial prod ON vd."productoId" = prod.id
            WHERE EXTRACT(YEAR FROM v.fecha) = $1 
              AND EXTRACT(MONTH FROM v.fecha) = $2
        `;
        
        const res = await client.query(query, [year, month]);
        fs.writeFileSync('debug_query_output.json', JSON.stringify(res.rows, null, 2));
        console.log('Query executed. Rows found:', res.rowCount);
        console.log('Results saved to debug_query_output.json');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
captureRealQuery();
