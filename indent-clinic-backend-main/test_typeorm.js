
const { DataSource } = require('typeorm');
const { Agenda } = require('./dist/agenda/entities/agenda.entity'); // Use compiled
const { Clinica } = require('./dist/clinicas/entities/clinica.entity');
const { Paciente } = require('./dist/pacientes/entities/paciente.entity');
const { Doctor } = require('./dist/doctors/entities/doctor.entity');
const { Proforma } = require('./dist/proformas/entities/proforma.entity');
const { User } = require('./dist/users/entities/user.entity');

const AppDataSource = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:postgrespg@localhost:5433/indent_clinic',
    synchronize: true, // Test if this causes the crash
    entities: [Agenda, Clinica, Paciente, Doctor, Proforma, User],
});

AppDataSource.initialize()
    .then(() => {
        console.log("Initialization successful");
        process.exit(0);
    })
    .catch(err => {
        console.error("Initialization failed:", err);
        process.exit(1);
    });
