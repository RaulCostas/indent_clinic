const { Client } = require('pg');
require('dotenv').config();

const pgClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgrespg',
    database: process.env.DB_NAME || 'curare',
});

async function main() {
    console.log('='.repeat(60));
    console.log('LIMPIEZA DE BASE DE DATOS - Preparación para Entrega');
    console.log('='.repeat(60));

    try {
        await pgClient.connect();
        console.log('✓ Conectado a PostgreSQL');

        // Limpiar datos transaccionales (mantener configuraciones y usuarios)
        console.log('\nLimpiando datos transaccionales...');

        const tablesToClean = [
            'historia_clinica',
            'receta_detalle',
            'receta',
            'propuesta_detalle',
            'propuestas',
            'proforma_detalle',
            'proformas',
            'agenda',
            'ficha_medica',
            'pacientes',
            'personal',
            'recordatorio'
        ];

        for (const table of tablesToClean) {
            try {
                await pgClient.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
                console.log(`  ✓ ${table} limpiada`);
            } catch (err) {
                console.log(`  ⚠ ${table}: ${err.message}`);
            }
        }

        // Resetear secuencias
        console.log('\nReseteando secuencias...');
        const sequences = [
            'pacientes_id_seq',
            'ficha_medica_id_seq',
            'agenda_id_seq',
            'proformas_id_seq',
            'proforma_detalle_id_seq',
            'propuestas_id_seq',
            'propuesta_detalle_id_seq',
            'receta_id_seq',
            'receta_detalle_id_seq',
            'historia_clinica_id_seq',
            'personal_id_seq',
            'recordatorio_id_seq'
        ];

        for (const seq of sequences) {
            try {
                await pgClient.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
                console.log(`  ✓ ${seq} reseteada`);
            } catch (err) {
                console.log(`  ⚠ ${seq}: ${err.message}`);
            }
        }

        // Verificar datos mantenidos
        console.log('\n' + '='.repeat(60));
        console.log('DATOS MANTENIDOS (Configuración y Usuarios)');
        console.log('='.repeat(60));

        const configTables = [
            { name: 'user', label: 'Usuarios' },
            { name: 'doctor', label: 'Doctores' },
            { name: 'especialidad', label: 'Especialidades' },
            { name: 'arancel', label: 'Aranceles' },
            { name: 'laboratorio', label: 'Laboratorios' },
            { name: 'forma_pago', label: 'Formas de Pago' },
            { name: 'comision_tarjeta', label: 'Comisiones Tarjeta' },
            { name: 'categoria_paciente', label: 'Categorías Paciente' },
            { name: 'grupo_inventario', label: 'Grupos Inventario' },
            { name: 'inventario', label: 'Inventario' },
            { name: 'personal_tipo', label: 'Tipos Personal' }
        ];

        for (const table of configTables) {
            try {
                const result = await pgClient.query(`SELECT COUNT(*) as count FROM ${table.name}`);
                console.log(`  ${table.label}: ${result.rows[0].count} registros`);
            } catch (err) {
                console.log(`  ${table.label}: Error - ${err.message}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✓ Base de datos limpiada exitosamente');
        console.log('✓ Lista para entrega al cliente');
        console.log('='.repeat(60));

    } catch (err) {
        console.error('\n❌ Error fatal:', err);
    } finally {
        await pgClient.end();
        console.log('\n✓ Desconectado de PostgreSQL');
    }
}

main();
