const { Client } = require('pg');

async function debug() {
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
        
        const today = new Date().toISOString().split('T')[0];
        console.log('Today (ISO):', today);

        // Check if there are any appointments at all
        const allAppts = await client.query("SELECT COUNT(*) FROM agenda");
        console.log('Total appointments:', allAppts.rows[0].count);

        // Check distinct states
        const states = await client.query("SELECT DISTINCT estado FROM agenda");
        console.log('Distinct states:', states.rows.map(r => r.estado));

        const query = `
            SELECT 
                p.id as "pacienteId",
                p.nombre, p.paterno, p.materno,
                a.fecha, a.hora, a.estado
            FROM agenda a
            JOIN pacientes p ON p.id = a."pacienteId"
            WHERE a.fecha <= '${today}' 
              AND LOWER(a.estado) = 'atendido'
        `;
        
        const results = await client.query(query);
        console.log('Total atendidos (including those with HC):', results.rows.length);
        
        if (results.rows.length > 0) {
            console.log('First 5 atendidos:', results.rows.slice(0, 5));
        }

        const queryWithNotExists = `
            SELECT 
                p.id as "pacienteId",
                p.nombre, p.paterno, p.materno,
                a.fecha, a.hora, a.estado
            FROM agenda a
            JOIN pacientes p ON p.id = a."pacienteId"
            WHERE a.fecha <= '${today}' 
              AND LOWER(a.estado) = 'atendido'
              AND NOT EXISTS (
                  SELECT 1 
                  FROM historia_clinica hc 
                  WHERE hc."pacienteId" = a."pacienteId" 
                    AND hc.fecha = a.fecha
              )
        `;
        
        const finalResults = await client.query(queryWithNotExists);
        console.log('Final results (without HC):', finalResults.rows.length);
        
        if (finalResults.rows.length > 0) {
            console.log('First 5 final results:', finalResults.rows.slice(0, 5));
        } else if (results.rows.length > 0) {
            console.log('Checking why results are excluded...');
            for (const r of results.rows.slice(0, 5)) {
                const hcRes = await client.query(`SELECT id, fecha FROM historia_clinica WHERE "pacienteId" = ${r.pacienteId}`);
                console.log(`Paciente ${r.pacienteId} (${r.nombre}) has HCs:`, hcRes.rows);
                console.log(`Expected match for appointment date: ${r.fecha.toISOString().split('T')[0]}`);
            }
        }

        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

debug();
