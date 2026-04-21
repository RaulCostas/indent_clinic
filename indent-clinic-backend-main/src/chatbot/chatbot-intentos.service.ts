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
                keywords: 'saldo, deuda, cuenta, cuanto debo, estado de cuenta',
                action: 'CONSULTAR_SALDO',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'cita, cuando, turno, hora, agendar',
                action: 'CONSULTAR_CITA',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'presupuesto, proforma, cotizacion, plan, precio',
                action: 'CONSULTAR_PRESUPUESTO',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'hola, buenos dias, buenas tardes, buenas noches, info, menu, menú',
                action: 'MENU_PRINCIPAL',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'ubicacion, direccion, donde, mapa, sucursal',
                action: 'CONSULTAR_DIRECCION',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'horario, atencion, abierto, cierran',
                action: 'CONSULTAR_HORARIO',
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
            // Check by Action AND Target to identify the "Logical Intent"
            // We use 'target' explicitly now in defaults array to match DB
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
                // Update keywords if they changed in seed
                if (exists.keywords !== d.keywords) {
                    console.log(`Updating keywords for intent: ${d.action} (${d.target})`);
                    exists.keywords = d.keywords;
                    await this.intentoRepository.save(exists);
                }
            }

            if (d.action === 'TEXTO_LIBRE' && exists && exists.replyTemplate && exists.replyTemplate.includes('Curare Centro Dental')) {
                // Migration: Fix branding name in existing records
                console.log('Updating legacy branding in chatbot intent...');
                exists.replyTemplate = exists.replyTemplate.replace('Curare Centro Dental', 'Clinica Dental');
                await this.intentoRepository.save(exists);
            }
        }

        // 3. Remove deprecated single-character keywords or misconfigured intents from DB
        const deprecated = ['A', 'B', '1', '2', '3'];
        for (const k of deprecated) {
            await this.intentoRepository.delete({ keywords: k });
        }

        // Specific cleanup for redundant inventory intents
        // We want to KEEP USUARIO and REMOVE PACIENTE
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
