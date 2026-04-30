const { DataSource } = require('typeorm');
const { Agenda } = require('./dist/agenda/entities/agenda.entity');
const { Clinica } = require('./dist/clinicas/entities/clinica.entity');
const { Paciente } = require('./dist/pacientes/entities/paciente.entity');
const { Doctor } = require('./dist/doctors/entities/doctor.entity');
const { Proforma } = require('./dist/proformas/entities/proforma.entity');
const { User } = require('./dist/users/entities/user.entity');
const { HistoriaClinica } = require('./dist/historia_clinica/entities/historia_clinica.entity');

const AppDataSource = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:postgrespg@localhost:5433/indent_clinic',
    entities: [Agenda, Clinica, Paciente, Doctor, Proforma, User, HistoriaClinica],
});

async function debug() {
    await AppDataSource.initialize();
    
    const today = new Date().toISOString().split('T')[0]; // Simple today
    console.log('Today (ISO):', today);

    const query = `
        SELECT 
            p.id as "pacienteId",
            p.nombre, p.paterno, p.materno,
            a.fecha, a.hora, a.estado,
            c.nombre as "clinicaNombre"
        FROM agenda a
        JOIN pacientes p ON p.id = a."pacienteId"
        LEFT JOIN clinicas c ON c.id = a."clinicaId"
        WHERE a.fecha <= '${today}' 
          AND LOWER(a.estado) = 'atendido'
    `;
    
    const results = await AppDataSource.query(query);
    console.log('Total atendidos (including those with HC):', results.length);
    
    if (results.length > 0) {
        console.log('First 5 atendidos:', results.slice(0, 5));
    }

    const queryWithNotExists = `
        SELECT 
            p.id as "pacienteId",
            p.nombre, p.paterno, p.materno,
            a.fecha, a.hora, a.estado,
            c.nombre as "clinicaNombre"
        FROM agenda a
        JOIN pacientes p ON p.id = a."pacienteId"
        LEFT JOIN clinicas c ON c.id = a."clinicaId"
        WHERE a.fecha <= '${today}' 
          AND LOWER(a.estado) = 'atendido'
          AND NOT EXISTS (
              SELECT 1 
              FROM historia_clinica hc 
              WHERE hc."pacienteId" = a."pacienteId" 
                AND hc.fecha = a.fecha
          )
    `;
    
    const finalResults = await AppDataSource.query(queryWithNotExists);
    console.log('Final results (without HC):', finalResults.length);
    if (finalResults.length > 0) {
        console.log('First 5 final results:', finalResults.slice(0, 5));
    } else {
        // Check why they are excluded
        console.log('Checking why results are excluded...');
        for (const r of results.slice(0, 5)) {
            const hcs = await AppDataSource.query(`SELECT id, fecha FROM historia_clinica WHERE "pacienteId" = ${r.pacienteId}`);
            console.log(`Paciente ${r.pacienteId} (${r.nombre}) has HCs:`, hcs);
            console.log(`Expected match for appointment date: ${r.fecha}`);
        }
    }

    await AppDataSource.destroy();
}

debug();
