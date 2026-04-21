import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CreateEspecialidadDto } from './dto/create-especialidad.dto';
import { UpdateEspecialidadDto } from './dto/update-especialidad.dto';
import { Especialidad } from './entities/especialidad.entity';

import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class EspecialidadService {
    constructor(
        @InjectRepository(Especialidad)
        private especialidadRepository: Repository<Especialidad>,
        @InjectRepository(HistoriaClinica)
        private historiaClinicaRepository: Repository<HistoriaClinica>,
    ) { }

    async create(createEspecialidadDto: CreateEspecialidadDto) {
        const especialidadName = createEspecialidadDto.especialidad.trim();
        const normalizedInput = normalizeString(especialidadName);

        const allEspecialidades = await this.especialidadRepository.find();
        const existing = allEspecialidades.find(e => normalizeString(e.especialidad) === normalizedInput);
        
        if (existing) {
            throw new BadRequestException('Ya existe una especialidad con este nombre');
        }

        const especialidad = this.especialidadRepository.create({
            ...createEspecialidadDto,
            especialidad: especialidadName
        });
        return this.especialidadRepository.save(especialidad);
    }

    async getStatistics(year: number, month: number, status: string, clinicaId?: number): Promise<any[]> {
        // Date and Clinic Filter
        let dateCondition = 'hc.estadoTratamiento = :estadoTrat';
        const params: any = { estadoTrat: 'terminado' };

        if (year) {
            dateCondition += ' AND EXTRACT(YEAR FROM hc.fecha) = :year';
            params.year = year;
        }
        if (month) {
            dateCondition += ' AND EXTRACT(MONTH FROM hc.fecha) = :month';
            params.month = month;
        }

        const qb = this.especialidadRepository.createQueryBuilder('especialidad')
            .leftJoin(
                'historia_clinica',
                'hc',
                `hc.especialidadId = especialidad.id AND ${dateCondition}`,
                params
            )
            .leftJoin('hc.proforma', 'p') // Join with proforma to get clinicaId
            .leftJoin('hc.doctor', 'd')
            .select([
                'especialidad.id AS "id"',
                'especialidad.especialidad AS "nombre"',
                'COALESCE(SUM(hc.cantidad), 0) AS "cantidad"'
            ])
            .groupBy('especialidad.id')
            .addGroupBy('especialidad.especialidad')
            .orderBy('"cantidad"', 'DESC');

        if (clinicaId) {
            qb.andWhere('(p.clinicaId = :clinicaId OR hc.proformaId IS NULL)', { clinicaId });
            // Note: If proformaId is NULL, we might still want to show it or exclude it.
            // But since clinicians want to filter by clinic, and proforma is the source of clinicId,
            // we'll filter by p.clinicaId.
            // If the user wants strict filtering:
            qb.andWhere('p.clinicaId = :clinicaId', { clinicaId });
        }

        if (status && status !== 'ambos') {
            qb.andWhere('d.estado = :status', { status: status.toLowerCase() });
        }

        const rawResults = await qb.getRawMany();

        return rawResults.map(r => ({
            id: r.id,
            nombre: r.nombre,
            cantidad: parseInt(r.cantidad)
        }));
    }

    async findAll(search?: string, page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;
        const where = search
            ? { especialidad: ILike(`%${search}%`) }
            : {};

        const [data, total] = await this.especialidadRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: { especialidad: 'ASC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    findOne(id: number) {
        return this.especialidadRepository.findOneBy({ id });
    }

    async update(id: number, updateEspecialidadDto: UpdateEspecialidadDto) {
        if (updateEspecialidadDto.especialidad) {
            const especialidadName = updateEspecialidadDto.especialidad.trim();
            const normalizedInput = normalizeString(especialidadName);

            const allEspecialidades = await this.especialidadRepository.find();
            const existing = allEspecialidades.find(e => normalizeString(e.especialidad) === normalizedInput);
            
            if (existing && existing.id !== id) {
                throw new BadRequestException('Ya existe otra especialidad con este nombre');
            }
            updateEspecialidadDto.especialidad = especialidadName;
        }
        return this.especialidadRepository.update(id, updateEspecialidadDto);
    }

    remove(id: number) {
        return this.especialidadRepository.delete(id);
    }
}
