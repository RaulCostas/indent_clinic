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
        
        const today = new Date().toISOString().split('T')[0];
        console.log('Today (ISO):', today);

        const queryWithNotExists = `
            SELECT 
                p.id as "pacienteId",
                p.nombre, p.paterno, p.materno,
                a.fecha, a.hora, a.estado, a."clinicaId"
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
            ORDER BY a.fecha DESC
        `;
        
        const finalResults = await client.query(queryWithNotExists);
        console.log('Final results (without HC):', finalResults.rows.length);
        
        if (finalResults.rows.length > 0) {
            console.log('First 5 final results:', finalResults.rows.slice(0, 5));
            
            // Check clinicaId distribution
            const clinicaIds = finalResults.rows.reduce((acc, r) => {
                acc[r.clinicaId] = (acc[r.clinicaId] || 0) + 1;
                return acc;
            }, {});
            console.log('ClinicaId distribution:', clinicaIds);
        }

        await client.end();
    } catch (err) {
        console.error("Error:", err);
    }
}

debug();
