import { DataSource } from 'typeorm';

async function debug() {
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgrespg', 
        database: 'indent_clinic',
    });

    try {
        await ds.initialize();
        console.log('DB Connected');
        
        // Find recent payments for 500
        const payments = await ds.query('SELECT * FROM pagos WHERE monto = 500 OR monto = 500.00 ORDER BY "id" DESC LIMIT 5');
        console.log('Recent 500 payments:', JSON.stringify(payments, null, 2));

        if (payments.length > 0) {
            const pid = payments[0].pacienteId;
            const proformas = await ds.query(`SELECT * FROM proformas WHERE "pacienteId" = ${pid}`);
            console.log('Patient Proformas:', JSON.stringify(proformas, null, 2));
        }

        await ds.destroy();
    } catch (e) {
        console.error(e);
    }
}

debug();
