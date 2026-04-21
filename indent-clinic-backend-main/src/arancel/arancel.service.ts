import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { CreateArancelDto } from './dto/create-arancel.dto';
import { UpdateArancelDto } from './dto/update-arancel.dto';
import { UpdatePricesDto } from './dto/update-prices.dto';
import { Especialidad } from '../especialidad/entities/especialidad.entity';
import { Arancel } from './entities/arancel.entity';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class ArancelService {
    constructor(
        @InjectRepository(Arancel)
        private arancelRepository: Repository<Arancel>,
    ) { }

    async create(createArancelDto: CreateArancelDto) {
        try {
            const inputStr = createArancelDto.detalle.trim();
            const normalizedInput = normalizeString(inputStr);

            const allRecords = await this.arancelRepository.find();
            
            const existing = allRecords.find(r => 
                normalizeString(r.detalle) === normalizedInput && 
                r.clinicaId == createArancelDto.clinicaId
            );

            if (existing) {
                throw new BadRequestException('Ya existe un arancel con esta descripción para esta clínica');
            }

            createArancelDto.detalle = inputStr;
            const arancel = this.arancelRepository.create(createArancelDto);
            return await this.arancelRepository.save(arancel);
        } catch (error) {
            console.error('Error creating arancel:', error);
            const fs = require('fs');
            fs.appendFileSync('error_log.txt', 'CREATE ERROR: ' + error.message + '\n' + error.stack + '\n\n');
            throw error;
        }
    }

    async findAll(search?: string, page: number = 1, limit: number = 5, clinicaId?: number) {
        console.log(`ArancelService.findAll: search=${search}, cid=${clinicaId}`);
        try {
            const skip = (page - 1) * limit;
            let where: any;
            if (clinicaId) {
                where = [
                    { clinicaId: clinicaId, ...(search ? { detalle: ILike(`%${search}%`) } : {}) },
                    { clinicaId: IsNull(), ...(search ? { detalle: ILike(`%${search}%`) } : {}) }
                ];
            } else {
                where = {};
                if (search) {
                    where.detalle = ILike(`%${search}%`);
                }
            }

            const [data, total] = await this.arancelRepository.findAndCount({
                where,
                skip,
                take: limit,
                order: { detalle: 'ASC' },
                relations: ['especialidad'],
            });

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            console.error('Error finding aranceles:', error);
            const fs = require('fs');
            fs.appendFileSync('error_log.txt', 'FINDALL ERROR: ' + error.message + '\n' + error.stack + '\n\n');
            throw error;
        }
    }

    findOne(id: number) {
        return this.arancelRepository.findOne({
            where: { id },
            relations: ['especialidad'],
        });
    }

    async update(id: number, updateArancelDto: UpdateArancelDto) {
        if (updateArancelDto.detalle) {
            const inputStr = updateArancelDto.detalle.trim();
            const normalizedInput = normalizeString(inputStr);

            const allRecords = await this.arancelRepository.find();
            
            const currentRecord = await this.findOne(id);
            if (!currentRecord) throw new BadRequestException('El arancel no existe');

            const recordClinicaId = updateArancelDto.clinicaId ?? currentRecord.clinicaId;

            const existing = allRecords.find(r => 
                normalizeString(r.detalle) === normalizedInput && 
                r.clinicaId == recordClinicaId
            );

            if (existing && existing.id !== id) {
                throw new BadRequestException('Ya existe un arancel con esta descripción para esta clínica');
            }
            updateArancelDto.detalle = inputStr;
        }

        return this.arancelRepository.update(id, updateArancelDto);
    }

    remove(id: number) {
        return this.arancelRepository.delete(id);
    }

    async updatePrices(dto: UpdatePricesDto) {
        const query = this.arancelRepository.createQueryBuilder('arancel');

        if (dto.especialidadId && Number(dto.especialidadId) > 0) {
            query.where('arancel.idEspecialidad = :especialidadId', { especialidadId: dto.especialidadId });
        }

        const aranceles = await query.getMany();
        const factor = 1 + (dto.porcentaje / 100);

        for (const arancel of aranceles) {
            arancel.precio = Number((Number(arancel.precio) * factor).toFixed(2));
        }

        return this.arancelRepository.save(aranceles);
    }

    async getUsedEspecialidades() {
        const aranceles = await this.arancelRepository
            .createQueryBuilder('arancel')
            .select('DISTINCT arancel.idEspecialidad', 'id')
            .where('arancel.idEspecialidad IS NOT NULL')
            .getRawMany();

        if (aranceles.length === 0) {
            return [];
        }

        const ids = aranceles.map(a => a.id);

        return this.arancelRepository.manager.createQueryBuilder()
            .select('especialidad')
            .from(Especialidad, 'especialidad')
            .where('especialidad.id IN (:...ids)', { ids })
            .orderBy('especialidad.especialidad', 'ASC')
            .getMany();
    }
}
