import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirmaDigital } from './entities/firma-digital.entity';
import { CreateFirmaDto } from './dto/create-firma.dto';
import { VerifyFirmaDto } from './dto/verify-firma.dto';
import * as crypto from 'crypto';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

@Injectable()
export class FirmasService {
    constructor(
        @InjectRepository(FirmaDigital)
        private firmaRepository: Repository<FirmaDigital>,
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

        const firma = this.firmaRepository.create({
            ...createFirmaDto,
            usuarioId,
            timestamp: new Date(),
        });

        return await this.firmaRepository.save(firma);
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
}
