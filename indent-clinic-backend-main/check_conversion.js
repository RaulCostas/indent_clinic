
const { DataSource } = require('typeorm');
const path = require('path');

// Dynamically require entities from dist
const entitiesPath = path.join(__dirname, 'dist');
const Proforma = require(path.join(entitiesPath, 'proformas/entities/proforma.entity')).Proforma;
const ProformaDetalle = require(path.join(entitiesPath, 'proformas/entities/proforma-detalle.entity')).ProformaDetalle;

const AppDataSource = new DataSource({
    type: 'postgres',
    url: 'postgresql://postgres:postgrespg@localhost:5433/indent_clinic',
    entities: [Proforma, ProformaDetalle],
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("Connected to DB");

        const proformas = await AppDataSource.getRepository(Proforma).find({
            order: { id: 'DESC' },
            take: 5,
            relations: ['detalles']
        });

        console.log("LAST 5 PROFORMAS:");
        proformas.forEach(p => {
            console.log(`ID: ${p.id}, Numero: ${p.numero}, Paciente: ${p.pacienteId}, Clinica: ${p.clinicaId}, Total: ${p.total}, Items: ${p.detalles.length}`);
            p.detalles.forEach(d => {
                console.log(`  - Item ID: ${d.id}, Arancel: ${d.arancelId}, Total: ${d.total}`);
            });
        });

        await AppDataSource.destroy();
    } catch (err) {
        console.error("Error:", err);
    }
}

run();
