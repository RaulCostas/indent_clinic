import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotIntento } from './entities/chatbot-intento.entity';

@Injectable()
export class ChatbotIntentosService implements OnModuleInit {
    constructor(
        @InjectRepository(ChatbotIntento)
        private readonly intentoRepository: Repository<ChatbotIntento>,
    ) { }

    async onModuleInit() {
        await this.seedDefaults();
    }

    async seedDefaults() {
        // 1. Cleanup Duplicates
        await this.removeDuplicates();

        // 2. Seed Defaults
        console.log('Checking default chatbot intents...');
        const defaults = [
            {
                keywords: 'hola, buenos dias, buenas tardes, buenas noches, info, menu, menú, inicio, comenzar',
                action: 'MENU_PRINCIPAL',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'citas, pacientes agendados, mi agenda',
                action: 'CONSULTAR_CITA',
                active: true,
                target: 'USUARIO'
            },
            {
                keywords: 'citas de hoy, agenda de hoy, pacientes de hoy',
                action: 'CONSULTAR_CITA_HOY',
                active: true,
                target: 'USUARIO'
            },
            {
                keywords: 'cuanto hay, cuantos hay, stock, existencia, inventario',
                action: 'CONSULTAR_INVENTARIO',
                active: true,
                target: 'USUARIO'
            }
        ];

        for (const d of defaults) {
            const exists = await this.intentoRepository.findOne({
                where: {
                    action: d.action as any,
                    target: d.target as any
                }
            });

            if (!exists) {
                console.log(`Seeding missing intent: ${d.action} (${d.target})`);
                await this.intentoRepository.save(this.intentoRepository.create(d as any));
            } else {
                if (exists.keywords !== d.keywords) {
                    console.log(`Updating keywords for intent: ${d.action} (${d.target})`);
                    exists.keywords = d.keywords;
                    await this.intentoRepository.save(exists);
                }
            }
        }

        // 3. Eliminar intents obsoletos (solo los que aún puedan existir con enum válido)
        // Los valores CONSULTAR_SALDO, CONSULTAR_PRESUPUESTO, etc. fueron eliminados
        // directamente en la BD vía SQL. No se repite aquí para evitar QueryFailedError.

        // Cleanup de intents con keywords de letras/números sueltos
        const deprecatedKeywords = ['A', 'B', '1', '2', '3'];
        for (const k of deprecatedKeywords) {
            await this.intentoRepository.delete({ keywords: k });
        }

        await this.intentoRepository.delete({ action: 'CONSULTAR_INVENTARIO' as any, target: 'PACIENTE' as any });
    }

    async removeDuplicates() {
        console.log('Running duplicate cleanup...');
        const allIntents = await this.intentoRepository.find({ order: { id: 'ASC' } });
        const uniqueMap = new Map<string, number>();
        const duplicates: number[] = [];

        for (const intent of allIntents) {
            // Create a unique key based on Action + Target + Keywords
            const key = `${intent.action}-${intent.target}-${intent.keywords}`;
            if (uniqueMap.has(key)) {
                duplicates.push(intent.id);
            } else {
                uniqueMap.set(key, intent.id);
            }
        }

        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicate intents. Removing...`);
            await this.intentoRepository.delete(duplicates);
            console.log('Duplicates removed.');
        } else {
            console.log('No duplicates found.');
        }
    }

    async create(createDto: Partial<ChatbotIntento>) {
        const intento = this.intentoRepository.create(createDto);
        return await this.intentoRepository.save(intento);
    }

    async findAll() {
        return await this.intentoRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async findAllActive() {
        return await this.intentoRepository.find({
            where: { active: true }
        });
    }

    async update(id: number, updateDto: Partial<ChatbotIntento>) {
        await this.intentoRepository.update(id, updateDto);
        return this.intentoRepository.findOne({ where: { id } });
    }

    async remove(id: number) {
        return await this.intentoRepository.delete(id);
    }
}
