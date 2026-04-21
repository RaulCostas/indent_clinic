import { DataSource } from 'typeorm';
import { Pago } from './src/pagos/entities/pago.entity';
import { Paciente } from './src/pacientes/entities/paciente.entity';
import { Proforma } from './src/proformas/entities/proforma.entity';
import { HistoriaClinica } from './src/historia_clinica/entities/historia_clinica.entity';
import { Especialidad } from './src/especialidad/entities/especialidad.entity';
import { FormaPago } from './src/forma_pago/entities/forma_pago.entity';
import { Clinica } from './src/clinicas/entities/clinica.entity';
import { ComisionTarjeta } from './src/comision_tarjeta/entities/comision_tarjeta.entity';

async function debug() {
    const ds = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgrespg', 
        database: 'indent_clinic',
        entities: [Pago, Paciente, Proforma, HistoriaClinica, Especialidad, FormaPago, Clinica, ComisionTarjeta],
        synchronize: false,
    });

    try {
        await ds.initialize();
        console.log('DB Connected');
        
        // Find recent payments for 500
        const payments = await ds.query('SELECT * FROM pagos WHERE monto = 500 OR monto = \'500.00\' ORDER BY "createdAt" DESC LIMIT 5');
        console.log('Recent 500 payments:', JSON.stringify(payments, null, 2));

        // Find patient info if found
        if (payments.length > 0) {
            const pid = payments[0].pacienteId;
            const patient = await ds.query(`SELECT * FROM pacientes WHERE id = ${pid}`);
            console.log('Patient:', JSON.stringify(patient, null, 2));
            
            const allSubs = await ds.query(`SELECT * FROM pagos WHERE "pacienteId" = ${pid}`);
            console.log('Total patient payments:', allSubs.length);
        }

        await ds.destroy();
    } catch (e) {
        console.error(e);
    }
}

debug();
