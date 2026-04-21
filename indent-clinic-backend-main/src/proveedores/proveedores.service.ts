import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './entities/proveedor.entity';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class ProveedoresService {
    constructor(
        @InjectRepository(Proveedor)
        private proveedoresRepository: Repository<Proveedor>,
    ) { }

    async create(createProveedorDto: CreateProveedorDto) {
        const inputStr = createProveedorDto.proveedor.trim();
        const normalizedInput = normalizeString(inputStr);

        const allRecords = await this.proveedoresRepository.find();
        const existing = allRecords.find(r => normalizeString(r.proveedor) === normalizedInput);

        if (existing) {
            throw new BadRequestException('El proveedor ya existe');
        }

        createProveedorDto.proveedor = inputStr;
        const proveedor = this.proveedoresRepository.create(createProveedorDto);
        return this.proveedoresRepository.save(proveedor);
    }

    async findAll(search?: string, page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;
        const where = search
            ? { proveedor: ILike(`%${search}%`) }
            : {};

        const [data, total] = await this.proveedoresRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: { proveedor: 'ASC' },
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
        return this.proveedoresRepository.findOneBy({ id });
    }

    async update(id: number, updateProveedorDto: UpdateProveedorDto) {
        if (updateProveedorDto.proveedor) {
            const inputStr = updateProveedorDto.proveedor.trim();
            const normalizedInput = normalizeString(inputStr);

            const allRecords = await this.proveedoresRepository.find();
            const existing = allRecords.find(r => normalizeString(r.proveedor) === normalizedInput);

            if (existing && existing.id !== id) {
                throw new BadRequestException('El proveedor ya existe');
            }
            updateProveedorDto.proveedor = inputStr;
        }

        return this.proveedoresRepository.update(id, updateProveedorDto);
    }

    remove(id: number) {
        return this.proveedoresRepository.delete(id);
    }
}
