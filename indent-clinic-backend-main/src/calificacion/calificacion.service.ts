import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Calificacion } from './entities/calificacion.entity';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';
import { UpdateCalificacionDto } from './dto/update-calificacion.dto';

@Injectable()
export class CalificacionService {
    constructor(
        @InjectRepository(Calificacion)
        private calificacionRepository: Repository<Calificacion>,
    ) { }

    async create(createCalificacionDto: CreateCalificacionDto) {
        try {
            const calificacion = this.calificacionRepository.create(createCalificacionDto);
            return await this.calificacionRepository.save(calificacion);
        } catch (error) {
            console.error('Error creating calificacion:', error);
            throw error;
        }
    }

    async findAll(page: number = 1, limit: number = 10, search: string = '', clinicaId?: number) {
        try {
            const skip = (page - 1) * limit;

            const queryBuilder = this.calificacionRepository.createQueryBuilder('calificacion')
                .leftJoinAndSelect('calificacion.personal', 'personal')
                .leftJoinAndSelect('calificacion.paciente', 'paciente')
                .leftJoinAndSelect('calificacion.evaluador', 'evaluador');

            if (clinicaId) {
                queryBuilder.andWhere('personal.clinicaId = :clinicaId', { clinicaId });
            }

            if (search) {
                queryBuilder.andWhere(
                    '(personal.nombre ILIKE :search OR personal.paterno ILIKE :search OR personal.materno ILIKE :search OR paciente.nombre ILIKE :search OR paciente.paterno ILIKE :search OR paciente.materno ILIKE :search)',
                    { search: `%${search}%` }
                );
            }

            queryBuilder
                .orderBy('calificacion.fecha', 'DESC')
                .skip(skip)
                .take(limit);

            const [data, total] = await queryBuilder.getManyAndCount();

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            console.error('Error finding calificaciones:', error);
            throw error;
        }
    }

    findOne(id: number) {
        return this.calificacionRepository.findOne({
            where: { id },
            relations: ['personal', 'paciente', 'evaluador']
        });
    }

    async findByPersonal(personalId: number) {
        return this.calificacionRepository.find({
            where: { personalId },
            relations: ['personal', 'paciente', 'evaluador'],
            order: { fecha: 'DESC' }
        });
    }

    async update(id: number, updateCalificacionDto: UpdateCalificacionDto) {
        await this.calificacionRepository.update(id, updateCalificacionDto);
        return this.findOne(id);
    }

    async remove(id: number) {
        const calificacion = await this.findOne(id);
        if (calificacion) {
            return this.calificacionRepository.remove(calificacion);
        }
        return null;
    }

    async getEstadisticas(personalId: number, year: number, month: number) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            const calificaciones = await this.calificacionRepository
                .createQueryBuilder('calificacion')
                .where('calificacion.personalId = :personalId', { personalId })
                .andWhere('calificacion.fecha >= :startDate', { startDate })
                .andWhere('calificacion.fecha <= :endDate', { endDate })
                .getMany();

            const stats = {
                Malo: 0,
                Regular: 0,
                Bueno: 0,
                total: calificaciones.length
            };

            calificaciones.forEach(cal => {
                if (cal.calificacion === 'Malo') stats.Malo++;
                else if (cal.calificacion === 'Regular') stats.Regular++;
                else if (cal.calificacion === 'Bueno') stats.Bueno++;
            });

            return stats;
        } catch (error) {
            console.error('Error getting estadisticas:', error);
            throw error;
        }
    }
}
