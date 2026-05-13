import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirmaDigital } from './entities/firma-digital.entity';
import { CreateFirmaDto } from './dto/create-firma.dto';
import { VerifyFirmaDto } from './dto/verify-firma.dto';
import * as crypto from 'crypto';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

import { Paciente } from '../pacientes/entities/paciente.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { Receta } from '../receta/entities/receta.entity';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Injectable()
export class FirmasService {
    constructor(
        @InjectRepository(FirmaDigital)
        private firmaRepository: Repository<FirmaDigital>,
        @InjectRepository(Paciente)
        private pacienteRepository: Repository<Paciente>,
        @InjectRepository(Proforma)
        private proformaRepository: Repository<Proforma>,
        @InjectRepository(Receta)
        private recetaRepository: Repository<Receta>,
        @InjectRepository(HistoriaClinica)
        private hcRepository: Repository<HistoriaClinica>,
        private readonly storageService: SupabaseStorageService,
    ) { }

    /**
     * Generate SHA-256 hash from document data
     */
    generateDocumentHash(documentData: any): string {
        const dataString = JSON.stringify(documentData);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Create a new digital signature
     */
    async create(createFirmaDto: CreateFirmaDto, usuarioId: number): Promise<FirmaDigital> {
        if (createFirmaDto.firmaData && createFirmaDto.firmaData.startsWith('data:image')) {
            try {
                createFirmaDto.firmaData = await this.storageService.uploadBase64('clinica-media', `signature-digital-${usuarioId}-${Date.now()}`, createFirmaDto.firmaData);
            } catch (error) {
                console.warn('[FirmasService] Supabase upload failed or not configured, saving as Base64 in database:', error.message);
                // Si falla Supabase (por ejemplo, en local sin config), dejamos la data como Base64
            }
        }

        // If hashDocumento is missing, generate a default one to satisfy DB constraints
        if (!createFirmaDto.hashDocumento) {
            createFirmaDto.hashDocumento = this.generateDocumentHash({
                tipo: createFirmaDto.tipoDocumento,
                id: createFirmaDto.documentoId,
                date: new Date().toISOString()
            });
        }

        const firma = await this.firmaRepository.save(this.firmaRepository.create({
            ...createFirmaDto,
            usuarioId,
            timestamp: new Date(),
        }));

        // ─── SYNC TO ENTITY ───
        try {
            const { tipoDocumento, documentoId, firmaData } = firma;
            if (tipoDocumento === 'paciente') {
                await this.pacienteRepository.update(documentoId, { firmaFC: firmaData });
            } else if (tipoDocumento === 'proforma' || tipoDocumento === 'presupuesto') {
                await this.proformaRepository.update(documentoId, { firma: firmaData });
            } else if (tipoDocumento === 'receta') {
                await this.recetaRepository.update(documentoId, { firma: firmaData });
            } else if (tipoDocumento === 'historia_clinica') {
                await this.hcRepository.update(documentoId, { firmaPaciente: firmaData });
            }
        } catch (error) {
            console.error('[FirmasService] Failed to sync signature to entity:', error.message);
        }

        return firma;
    }

    /**
     * Get all signatures for a specific document
     */
    async findByDocumento(tipoDocumento: string, documentoId: number): Promise<FirmaDigital[]> {
        return await this.firmaRepository.find({
            where: {
                tipoDocumento,
                documentoId,
            },
            relations: ['usuario'],
            order: {
                timestamp: 'ASC',
            },
        });
    }

    /**
     * Get a single signature by ID
     */
    async findOne(id: number): Promise<FirmaDigital> {
        const firma = await this.firmaRepository.findOne({
            where: { id },
            relations: ['usuario'],
        });

        if (!firma) {
            throw new NotFoundException(`Firma con ID ${id} no encontrada`);
        }

        return firma;
    }

    /**
     * Verify signature integrity
     */
    async verify(id: number, verifyFirmaDto: VerifyFirmaDto): Promise<{ valid: boolean; message: string }> {
        const firma = await this.findOne(id);

        if (firma.hashDocumento === verifyFirmaDto.hashDocumento) {
            // Update verification status
            firma.verificado = true;
            await this.firmaRepository.save(firma);

            return {
                valid: true,
                message: 'Firma verificada correctamente. El documento no ha sido modificado.',
            };
        } else {
            return {
                valid: false,
                message: 'ADVERTENCIA: El hash del documento no coincide. El documento puede haber sido modificado después de la firma.',
            };
        }
    }

    async getFirmaBase64(id: number): Promise<{ base64: string }> {
        const firma = await this.findOne(id);
        if (!firma.firmaData) throw new BadRequestException('La firma no tiene datos de imagen');

        // Si ya es base64, lo retornamos tal cual
        if (firma.firmaData.startsWith('data:image')) {
            return { base64: firma.firmaData };
        }

        // Si es una URL de Supabase, intentamos descargarla vía backend (donde tenemos acceso service_role)
        try {
            const base64 = await this.storageService.downloadAsBase64('clinica-media', firma.firmaData);
            return { base64 };
        } catch (error) {
            console.error('[FirmasService] Error downloading image:', error);
            throw new BadRequestException('No se pudo recuperar la imagen de la firma');
        }
    }

    /**
     * Get all signatures by user
     */
    async findByUsuario(usuarioId: number): Promise<FirmaDigital[]> {
        return await this.firmaRepository.find({
            where: { usuarioId },
            relations: ['usuario'],
            order: {
                timestamp: 'DESC',
            },
        });
    }

    /**
     * Delete a signature (admin only)
     */
    async remove(id: number): Promise<void> {
        const firma = await this.findOne(id);
        await this.firmaRepository.remove(firma);
    }

    /**
     * Get signature statistics
     */
    async getStats(): Promise<any> {
        const total = await this.firmaRepository.count();
        const verificadas = await this.firmaRepository.count({ where: { verificado: true } });

        const porTipo = await this.firmaRepository
            .createQueryBuilder('firma')
            .select('firma.tipoDocumento', 'tipo')
            .addSelect('COUNT(*)', 'count')
            .groupBy('firma.tipoDocumento')
            .getRawMany();

        return {
            total,
            verificadas,
            noVerificadas: total - verificadas,
            porTipo,
        };
    }

    /**
     * Run the database migration to copy signatures to entities
     */
    async getMigrationStats() {
        const counts = await this.firmaRepository.query(`
            SELECT 
                (SELECT COUNT(*) FROM firmas_digitales) as total_firmas,
                (SELECT COUNT(*) FROM pacientes WHERE "firmaFC" IS NOT NULL) as pacientes_migrados,
                (SELECT COUNT(*) FROM proformas WHERE "firma" IS NOT NULL) as proformas_migradas,
                (SELECT COUNT(*) FROM receta WHERE "firma" IS NOT NULL) as recetas_migradas,
                (SELECT COUNT(*) FROM historia_clinica WHERE "firmaPaciente" IS NOT NULL) as hc_migradas
        `);
        const types = await this.firmaRepository.query(`
            SELECT "tipoDocumento", COUNT(*) as count FROM firmas_digitales GROUP BY "tipoDocumento"
        `);
        
        // Check how many HC signatures have a matching HC record
        const hcMatches = await this.firmaRepository.query(`
            SELECT COUNT(*) as valid_hc_ids 
            FROM firmas_digitales fd
            INNER JOIN historia_clinica hc ON fd."documentoId" = hc.id
            WHERE fd."tipoDocumento" = 'historia_clinica'
        `);

        // Check if maybe documentoId is actually pacienteId for HC?
        const hcMatchesAsPaciente = await this.firmaRepository.query(`
            SELECT COUNT(*) as valid_paciente_ids_for_hc 
            FROM firmas_digitales fd
            INNER JOIN pacientes p ON fd."documentoId" = p.id
            WHERE fd."tipoDocumento" = 'historia_clinica'
        `);

        return { counts: counts[0], types, hcMatches: hcMatches[0], hcMatchesAsPaciente: hcMatchesAsPaciente[0] };
    }

    async runMigration() {
        console.log('[Migration] Starting signature migration...');
        
        try {
            // 1. Migrate Pacientes
            console.log('[Migration] Migrating Pacientes...');
            await this.firmaRepository.query(`
                UPDATE pacientes
                SET "firmaFC" = fd."firmaData"
                FROM firmas_digitales fd
                WHERE fd."tipoDocumento" = 'paciente' AND fd."documentoId" = pacientes.id
                AND (pacientes."firmaFC" IS NULL OR pacientes."firmaFC" = '');
            `);
            console.log(`[Migration] Pacientes migrated.`);

            // 2. Migrate Proformas
            console.log('[Migration] Migrating Proformas...');
            await this.firmaRepository.query(`
                UPDATE proformas
                SET firma = fd."firmaData"
                FROM firmas_digitales fd
                WHERE fd."tipoDocumento" = 'proforma' AND fd."documentoId" = proformas.id
                AND (proformas.firma IS NULL OR proformas.firma = '');
            `);
            console.log(`[Migration] Proformas migrated.`);

            // 3. Migrate Recetas
            console.log('[Migration] Migrating Recetas...');
            await this.firmaRepository.query(`
                UPDATE receta
                SET firma = fd."firmaData"
                FROM firmas_digitales fd
                WHERE fd."tipoDocumento" = 'receta' AND fd."documentoId" = receta.id
                AND (receta.firma IS NULL OR receta.firma = '');
            `);
            console.log(`[Migration] Recetas migrated.`);

            // 2. Migrate Historia Clinica signatures to Pacientes (Fallback for deleted HC table)
            console.log('[Migration] Migrating HC signatures to Pacientes (Fallback)...');
            await this.firmaRepository.query(`
                UPDATE pacientes
                SET "firmaFC" = fd."firmaData"
                FROM firmas_digitales fd
                WHERE fd."tipoDocumento" = 'historia_clinica' AND fd."documentoId" = pacientes.id
                AND (pacientes."firmaFC" IS NULL OR pacientes."firmaFC" = '');
            `);

            // 3. Migrate Historia Clinica signatures to current HC table (Normal join)
            console.log('[Migration] Migrating to Historia Clinica table...');
            await this.firmaRepository.query(`
                UPDATE historia_clinica
                SET "firmaPaciente" = fd."firmaData"
                FROM firmas_digitales fd
                WHERE fd."tipoDocumento" = 'historia_clinica' AND fd."documentoId" = historia_clinica.id
                AND (historia_clinica."firmaPaciente" IS NULL OR historia_clinica."firmaPaciente" = '');
            `);
            
            // 4. Try to link HC signatures to HC table via Paciente ID if ID doesn't match directly
            // (Only for records where firmaPaciente is still null)
            await this.firmaRepository.query(`
                UPDATE historia_clinica
                SET "firmaPaciente" = fd."firmaData"
                FROM firmas_digitales fd
                WHERE fd."tipoDocumento" = 'historia_clinica' AND fd."documentoId" = historia_clinica."pacienteId"
                AND (historia_clinica."firmaPaciente" IS NULL OR historia_clinica."firmaPaciente" = '');
            `);
            console.log(`[Migration] Historia Clinica migrated.`);

            return {
                success: true,
                message: 'Migration completed successfully'
            };
        } catch (error) {
            console.error('[Migration] Error running migration:', error);
            throw new BadRequestException('Migration failed: ' + error.message);
            }
    }

    async setupDb() {
        try {
            console.log('[Migration] Setting up database columns...');
            
            // Add firmaFC to pacientes
            await this.firmaRepository.query(`
                ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS "firmaFC" text;
            `);
            
            // Add firma to proformas
            await this.firmaRepository.query(`
                ALTER TABLE proformas ADD COLUMN IF NOT EXISTS "firma" text;
            `);
            
            // Add firma to receta
            await this.firmaRepository.query(`
                ALTER TABLE receta ADD COLUMN IF NOT EXISTS "firma" text;
            `);
            
            // Add firmaPaciente to historia_clinica (just in case)
            await this.firmaRepository.query(`
                ALTER TABLE historia_clinica ADD COLUMN IF NOT EXISTS "firmaPaciente" text;
            `);

            console.log('[Migration] Database columns ensured.');
            return {
                success: true,
                message: 'Database columns created successfully'
            };
        } catch (error) {
            console.error('[Migration] Failed to setup database:', error.message);
            throw new BadRequestException(`Setup failed: ${error.message}`);
        }
    async migrateToBase64() {
        const queryRunner = this.firmasRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        
        const signatures = await queryRunner.query(`
            SELECT id, "tipoDocumento", "documentoId", "firmaData" 
            FROM firmas_digitales 
            WHERE "firmaData" LIKE 'https%'
        `);

        let count = 0;
        const axios = require('axios');

        for (const f of signatures) {
            try {
                const res = await axios.get(f.firmaData, { responseType: 'arraybuffer' });
                const base64 = `data:${res.headers['content-type']};base64,${Buffer.from(res.data).toString('base64')}`;
                
                // Update main table
                await queryRunner.query('UPDATE firmas_digitales SET "firmaData" = $1 WHERE id = $2', [base64, f.id]);
                
                // Sync with modules
                if (f.tipoDocumento === 'paciente') {
                    await queryRunner.query('UPDATE pacientes SET "firmaFC" = $1 WHERE id = $2', [base64, f.documentoId]);
                } else if (f.tipoDocumento === 'proforma' || f.tipoDocumento === 'presupuesto') {
                    await queryRunner.query('UPDATE proformas SET "firma" = $1 WHERE id = $2', [base64, f.documentoId]);
                } else if (f.tipoDocumento === 'receta') {
                    await queryRunner.query('UPDATE receta SET "firma" = $1 WHERE id = $2', [base64, f.documentoId]);
                } else if (f.tipoDocumento === 'historia_clinica') {
                    await queryRunner.query('UPDATE historia_clinica SET "firmaPaciente" = $1 WHERE id = $2', [base64, f.documentoId]);
                }
                count++;
            } catch (e) {
                console.error(`Error migrating signature ${f.id}:`, e.message);
            }
        }
        await queryRunner.release();
        return { message: 'Migración completada', total: signatures.length, convertidas: count };
    }
}
