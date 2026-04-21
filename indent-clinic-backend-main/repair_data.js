const { Client } = require('pg');
const client = new Client({
    host: 'localhost', port: 5433, user: 'postgres', password: 'postgrespg', database: 'indent_clinic'
});

async function repair() {
    await client.connect();
    try {
        console.log('Iniciando reparación de datos para Proforma No. 3...');
        // Arreglar precios en historia_clinica para la proforma 10
        const res1 = await client.query('UPDATE historia_clinica SET precio = 70 WHERE "proformaId" = 10 AND tratamiento ILIKE \'%Extracción%\'');
        const res2 = await client.query('UPDATE historia_clinica SET precio = 1000 WHERE "proformaId" = 10 AND tratamiento ILIKE \'%Corona%\'');
        console.log(`Reparación completada. Items actualizados.`);
    } catch (e) {
        console.error('Error al reparar:', e);
    } finally {
        await client.end();
    }
}
repair();
