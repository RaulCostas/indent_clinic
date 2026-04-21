
const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'indent_clinic',
});

async function check() {
    try {
        await AppDataSource.initialize();
        console.log("Connected to database");
        const results = await AppDataSource.query("DESCRIBE agenda");
        console.log(JSON.stringify(results, null, 2));
        await AppDataSource.destroy();
    } catch (err) {
        console.error("Error connecting to database:", err);
    }
}

check();
