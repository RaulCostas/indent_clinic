
const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'postgrespg',
        database: 'indent_clinic',
    });

    try {
        await client.connect();
        console.log("Connected to Postgres");
        
        console.log("\nLAST 5 PROFORMAS:");
        const resProformas = await client.query("SELECT id, numero, \"pacienteId\", \"clinicaId\", total, fecha FROM proformas ORDER BY id DESC LIMIT 5");
        console.table(resProformas.rows);

        if (resProformas.rows.length > 0) {
            const lastId = resProformas.rows[0].id;
            console.log(`\nDETAILS FOR PROFORMA ID ${lastId}:`);
            const resDetalles = await client.query(`SELECT id, \"arancelId\", piezas, cantidad, total FROM proforma_detalle WHERE \"proformaId\" = ${lastId}`);
            console.table(resDetalles.rows);
        }

        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

check();
