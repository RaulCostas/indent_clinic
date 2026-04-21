import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { PrecioLaboratorio } from './entities/precio-laboratorio.entity';
import { CreatePrecioLaboratorioDto } from './dto/create-precio-laboratorio.dto';
import { UpdatePrecioLaboratorioDto } from './dto/update-precio-laboratorio.dto';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class PreciosLaboratoriosService {
    constructor(
        @InjectRepository(PrecioLaboratorio)
        private preciosLaboratoriosRepository: Repository<PrecioLaboratorio>,
    ) { }

    async create(createPrecioLaboratorioDto: CreatePrecioLaboratorioDto) {
        const inputStr = createPrecioLaboratorioDto.detalle.trim();
        const normalizedInput = normalizeString(inputStr);

        const allRecords = await this.preciosLaboratoriosRepository.find();
        const existing = allRecords.find(r => 
            normalizeString(r.detalle) === normalizedInput && 
            r.idLaboratorio == createPrecioLaboratorioDto.idLaboratorio
        );

        if (existing) {
            throw new BadRequestException('Ya existe un detalle con este nombre para el laboratorio seleccionado');
        }

        createPrecioLaboratorioDto.detalle = inputStr;
        const precioLaboratorio = this.preciosLaboratoriosRepository.create(createPrecioLaboratorioDto);
        return this.preciosLaboratoriosRepository.save(precioLaboratorio);
    }

    async findAll(page: number = 1, limit: number = 10, search?: string, laboratorioId?: number) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.detalle = ILike(`%${search}%`);
        }

        if (laboratorioId) {
            where.idLaboratorio = laboratorioId;
        }

        const [data, total] = await this.preciosLaboratoriosRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: {
                detalle: 'ASC',
            },
            relations: ['laboratorio'],
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number) {
        const precioLaboratorio = await this.preciosLaboratoriosRepository.findOne({
            where: { id },
            relations: ['laboratorio'],
        });
        if (!precioLaboratorio) {
            throw new NotFoundException(`PrecioLaboratorio with ID ${id} not found`);
        }
        return precioLaboratorio;
    }

    async update(id: number, updatePrecioLaboratorioDto: UpdatePrecioLaboratorioDto) {
        if (updatePrecioLaboratorioDto.detalle) {
            const inputStr = updatePrecioLaboratorioDto.detalle.trim();
            const normalizedInput = normalizeString(inputStr);

            const allRecords = await this.preciosLaboratoriosRepository.find();
            
            const currentRecord = await this.findOne(id);
            const recordLabId = updatePrecioLaboratorioDto.idLaboratorio ?? currentRecord.idLaboratorio;

            const existing = allRecords.find(r => 
                normalizeString(r.detalle) === normalizedInput && 
                r.idLaboratorio == recordLabId
            );

            if (existing && existing.id !== id) {
                throw new BadRequestException('Ya existe un detalle con este nombre para el laboratorio seleccionado');
            }
            updatePrecioLaboratorioDto.detalle = inputStr;
        }

        const precioLaboratorio = await this.preciosLaboratoriosRepository.preload({
            id,
            ...updatePrecioLaboratorioDto,
        });
        if (!precioLaboratorio) {
            throw new NotFoundException(`PrecioLaboratorio with ID ${id} not found`);
        }
        return this.preciosLaboratoriosRepository.save(precioLaboratorio);
    }

    async remove(id: number) {
        const precioLaboratorio = await this.findOne(id);
        return this.preciosLaboratoriosRepository.remove(precioLaboratorio);
    }
}
