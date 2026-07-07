const { Client } = require('pg');

async function run() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'postgrespg',
        database: 'indent_clinic'
    });

    await client.connect();

    try {
        console.log('--- HISTORIA CLINICA PATIENT 652 ---');
        const hcRes = await client.query(`
            SELECT id, fecha, pieza, tratamiento, precio, descuento, "precioConDescuento", "montoPagado", saldo, cancelado, "proformaId", "proformaDetalleId", "estadoTratamiento" 
            FROM historia_clinica 
            WHERE "pacienteId" = 652 
            ORDER BY fecha DESC, id DESC;
        `);
        console.table(hcRes.rows);

        console.log('\n--- PAGOS PATIENT 652 ---');
        const pagosRes = await client.query(`
            SELECT id, monto, descuento, "historiaClinicaId", "proformaId", fecha 
            FROM pagos 
            WHERE "pacienteId" = 652 
            ORDER BY fecha DESC;
        `);
        console.table(pagosRes.rows);

        console.log('\n--- PROFORMAS PATIENT 652 ---');
        const proformasRes = await client.query(`
            SELECT id, "numero", total FROM proformas WHERE "pacienteId" = 652;
        `);
        console.table(proformasRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
