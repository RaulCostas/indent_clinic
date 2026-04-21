import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Cubeta } from './entities/cubeta.entity';
import { CreateCubetaDto } from './dto/create-cubeta.dto';
import { UpdateCubetaDto } from './dto/update-cubeta.dto';

@Injectable()
export class CubetasService {
    constructor(
        @InjectRepository(Cubeta)
        private cubetaRepository: Repository<Cubeta>,
    ) { }

    async create(createDto: CreateCubetaDto): Promise<Cubeta> {
        await this.checkDuplicate(createDto);
        const cubeta = this.cubetaRepository.create(createDto);
        return await this.cubetaRepository.save(cubeta);
    }

    async findAll(page: number = 1, limit: number = 10, search: string = '', dentro_fuera: string = '', clinicaId?: number): Promise<{ data: Cubeta[], total: number, page: number, limit: number, totalPages: number }> {
        const skip = (page - 1) * limit;

        const whereCondition: any[] = [
            { descripcion: ILike(`%${search}%`) },
            { codigo: ILike(`%${search}%`) }
        ];

        if (dentro_fuera) {
            whereCondition.forEach(condition => {
                condition.dentro_fuera = dentro_fuera;
            });
            // Also handle case where search is empty but filter is present
            if (search === '') {
                // Reset whereCondition to just the filter if search is empty to avoid OR logic issues if not handled carefully, 
                // but here we are using OR for search fields. 
                // If search is present, we want (desc LIKE %s% OR code LIKE %s%) AND dentro_fuera = val
                // TypeORM 'where' array is OR. Object properties are AND.
                // So we need: [{ desc: Like, dentro_fuera: val }, { code: Like, dentro_fuera: val }]
            }
        }

        // Refined query construction
        let where: any = [
            { descripcion: ILike(`%${search}%`) },
            { codigo: ILike(`%${search}%`) }
        ];

        if (dentro_fuera) {
            where = where.map(condition => ({ ...condition, dentro_fuera }));
        }

        if (clinicaId) {
            where = where.map(condition => ({ ...condition, clinicaId }));
        }

        const [data, total] = await this.cubetaRepository.findAndCount({
            where: where,
            order: { id: 'DESC' },
            take: limit,
            skip: skip,
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number): Promise<Cubeta> {
        const cubeta = await this.cubetaRepository.findOne({ where: { id } });
        if (!cubeta) {
            throw new Error('Cubeta not found');
        }
        return cubeta;
    }

    async update(id: number, updateDto: UpdateCubetaDto): Promise<Cubeta> {
        await this.checkDuplicate(updateDto, id);
        await this.cubetaRepository.update(id, updateDto);
        return this.findOne(id);
    }

    private async checkDuplicate(dto: Partial<Cubeta>, id?: number) {
        const { codigo, clinicaId } = dto;

        if (codigo && clinicaId) {
            const query = this.cubetaRepository.createQueryBuilder('cubeta')
                .where('TRIM(LOWER(cubeta.codigo)) = :codigo', { codigo: codigo.trim().toLowerCase() })
                .andWhere('cubeta.clinicaId = :clinicaId', { clinicaId });

            if (id) query.andWhere('cubeta.id != :id', { id });

            const exists = await query.getOne();
            if (exists) throw new BadRequestException(['Este código de cubeta ya está registrado en esta clínica']);
        }
    }

    async remove(id: number): Promise<void> {
        await this.cubetaRepository.delete(id);
    }

    async resetAll(): Promise<{ message: string, cubetasReset: number, jobsCleared: number }> {
        // Reset ALL cubetas to DENTRO (no WHERE clause to affect all records)
        const cubetasResult = await this.cubetaRepository.query(
            `UPDATE cubetas SET dentro_fuera = 'DENTRO'`
        );

        // Clear all idCubeta assignments from trabajos_laboratorios
        const jobsResult = await this.cubetaRepository.query(
            `UPDATE trabajos_laboratorios SET "idCubeta" = NULL WHERE "idCubeta" IS NOT NULL`
        );

        return {
            message: 'Reset completed successfully',
            cubetasReset: cubetasResult[1] || 0,
            jobsCleared: jobsResult[1] || 0
        };
    }
}
