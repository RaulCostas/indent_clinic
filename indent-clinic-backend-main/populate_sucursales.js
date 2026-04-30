
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function populate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgrespg',
        database: process.env.DB_DATABASE || 'indent_clinic',
    });

    try {
        await client.connect();
        console.log("Connected to Postgres");

        // Create table if not exists (in case synchronize hasn't run)
        await client.query(`
            CREATE TABLE IF NOT EXISTS sucursales (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(150) NOT NULL,
                direccion TEXT,
                horario TEXT,
                telefono VARCHAR(50),
                latitud DECIMAL(10,7),
                longitud DECIMAL(10,7),
                google_maps_url TEXT,
                "clinicaId" INTEGER NOT NULL,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if branches already exist
        const checkRes = await client.query("SELECT count(*) FROM sucursales");
        if (parseInt(checkRes.rows[0].count) > 0) {
            console.log("Branches already exist. Skipping population.");
        } else {
            // Insert initial branches for Clinica ID 1
            await client.query(`
                INSERT INTO sucursales (nombre, direccion, horario, "clinicaId")
                VALUES 
                ('Av. Arce', 'Av. Arce, Edificio X, Mezzanine', 'Lunes a Viernes 09:00 - 19:00, Sábados 09:00 - 13:00', 1),
                ('San Miguel', 'San Miguel, Calle 21, Edificio Y, Planta Baja', 'Lunes a Viernes 10:00 - 20:00, Sábados 09:00 - 14:00', 1)
            `);
            console.log("Initial branches populated.");
        }

        await client.end();
    } catch (err) {
        console.error("Error populating sucursales:", err);
    }
}

populate();
