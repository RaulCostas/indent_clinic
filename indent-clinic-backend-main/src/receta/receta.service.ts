import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receta } from './entities/receta.entity';
import { RecetaDetalle } from './entities/receta-detalle.entity';

@Injectable()
export class RecetaService {
    constructor(
        @InjectRepository(Receta)
        private recetaRepository: Repository<Receta>,
        @InjectRepository(RecetaDetalle)
        private detalleRepository: Repository<RecetaDetalle>,
    ) { }

    async create(createRecetaDto: any) {
        // Extract detalles from DTO
        const { detalles, ...recetaData } = createRecetaDto;

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
}
