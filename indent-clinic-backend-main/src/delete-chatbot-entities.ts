
import { DataSource } from 'typeorm';
import { ChatbotIntento } from './chatbot/entities/chatbot-intento.entity';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433, // as found in app.module.ts
    username: 'postgres',
    password: 'postgrespg',
    database: 'curare',
    entities: [ChatbotIntento],
    synchronize: false,
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const repo = AppDataSource.getRepository(ChatbotIntento);
        const idsToDelete = [5, 6, 7];

        console.log(`Attempting to delete ChatbotIntento with IDs: ${idsToDelete.join(', ')}`);
        const result = await repo.delete(idsToDelete);
        console.log(`Deleted rows: ${result.affected}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
