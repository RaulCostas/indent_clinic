import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receta } from './entities/receta.entity';
import { RecetaDetalle } from './entities/receta-detalle.entity';

import { SupabaseStorageService } from '../common/storage/supabase-storage.service';
import { LocalStorageService } from '../common/storage/local-storage.service';

@Injectable()
export class RecetaService {
    constructor(
        @InjectRepository(Receta)
        private recetaRepository: Repository<Receta>,
        @InjectRepository(RecetaDetalle)
        private detalleRepository: Repository<RecetaDetalle>,
        private readonly storageService: SupabaseStorageService,
        private readonly localStorageService: LocalStorageService,
    ) { }

    async create(createRecetaDto: any) {
        // Extract detalles from DTO
        const { detalles, ...recetaData } = createRecetaDto;

        // Handle Signature (Upload to Supabase if Base64, fallback to local storage)
        if (recetaData.firma && recetaData.firma.startsWith('data:image')) {
            const bucket = 'clinica-media';
            const fileName = `signature-receta-${Date.now()}`;
            
            if (this.storageService.isConfigured()) {
                try {
                    recetaData.firma = await this.storageService.uploadBase64(bucket, fileName, recetaData.firma);
                } catch (error) {
                    console.warn('[RecetaService] Supabase upload failed, falling back to local storage:', error.message);
                    recetaData.firma = await this.localStorageService.uploadBase64(bucket, fileName, recetaData.firma);
                }
            } else {
                recetaData.firma = await this.localStorageService.uploadBase64(bucket, fileName, recetaData.firma);
            }
        }

        // Create and save the receta first WITHOUT detalles
        const newReceta = this.recetaRepository.create(recetaData);
        const savedReceta = await this.recetaRepository.save(newReceta) as unknown as Receta;

        // Now save each detalle individually
        if (detalles && detalles.length > 0) {

            for (const detalle of detalles) {
                const newDetalle = this.detalleRepository.create({
                    ...detalle,
                    recetaId: savedReceta.id
                }) as unknown as RecetaDetalle;
                await this.detalleRepository.save(newDetalle);
            }
        }

        // Fetch the complete receta with all detalles
        const completeReceta = await this.recetaRepository.findOne({
            where: { id: savedReceta.id },
            relations: ['detalles']
        });

        return completeReceta || savedReceta;
    }

    async findAll(clinicaId?: number) {
        const where: any = {};
        if (clinicaId) {
            where.clinicaId = clinicaId;
        }

        return await this.recetaRepository.find({
            where,
            relations: ['paciente', 'user', 'detalles'],
            order: {
                fecha: 'DESC',
                id: 'DESC'
            }
        });
    }

    async findOne(id: number) {
        return await this.recetaRepository.findOne({
            where: { id },
            relations: ['paciente', 'user', 'detalles']
        });
    }

    async update(id: number, updateRecetaDto: any) {
        // Handle Signature update (Upload to Supabase if Base64, fallback to local storage)
        if (updateRecetaDto.firma && updateRecetaDto.firma.startsWith('data:image')) {
            const bucket = 'clinica-media';
            const fileName = `signature-receta-${id}-${Date.now()}`;

            if (this.storageService.isConfigured()) {
                try {
                    updateRecetaDto.firma = await this.storageService.uploadBase64(bucket, fileName, updateRecetaDto.firma);
                } catch (error) {
                    console.warn('[RecetaService] Supabase upload failed during update, falling back to local storage:', error.message);
                    updateRecetaDto.firma = await this.localStorageService.uploadBase64(bucket, fileName, updateRecetaDto.firma);
                }
            } else {
                updateRecetaDto.firma = await this.localStorageService.uploadBase64(bucket, fileName, updateRecetaDto.firma);
            }
        }

        // Use save to handle relation updates/cascades if 'detalles' are provided
        // First preload to ensure it exists
        const receta = await this.recetaRepository.preload({
            id: id,
            ...updateRecetaDto,
        });
        if (!receta) {
            throw new Error(`Receta #${id} not found`);
        }
        return this.recetaRepository.save(receta);
    }

    async remove(id: number) {
        const receta = await this.findOne(id);
        if (receta) {
            return await this.recetaRepository.remove(receta);
        }
        return null;
    }

    async getFirmaBase64(id: number): Promise<{ base64: string }> {
        const receta = await this.findOne(id);
        if (!receta) throw new Error('La receta no existe');
        if (!receta.firma) throw new Error('La receta no tiene firma registrada');

        if (receta.firma.startsWith('data:image')) {
            return { base64: receta.firma };
        }

        try {
            let base64 = '';
            if (receta.firma.includes('supabase') || (this.storageService.isConfigured() && !receta.firma.includes('localhost') && !receta.firma.includes('127.0.0.1'))) {
                base64 = await this.storageService.downloadAsBase64('clinica-media', receta.firma);
            } else {
                base64 = await this.localStorageService.downloadAsBase64('clinica-media', receta.firma);
            }
            return { base64 };
        } catch (error) {
            console.error('[RecetaService] Error downloading signature:', error);
            throw new Error('No se pudo recuperar la imagen de la firma');
        }
    }
}
