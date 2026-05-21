import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidadMedida } from './entities/unidad_medida.entity';
import { CreateUnidadMedidaDto, UpdateUnidadMedidaDto } from './dto/create-unidad_medida.dto';

@Injectable()
export class UnidadMedidaService {
    constructor(
        @InjectRepository(UnidadMedida)
        private unidadMedidaRepository: Repository<UnidadMedida>,
    ) { }

    async create(createUnidadMedidaDto: CreateUnidadMedidaDto): Promise<UnidadMedida> {
        const newUnidadMedida = this.unidadMedidaRepository.create(createUnidadMedidaDto);
        return await this.unidadMedidaRepository.save(newUnidadMedida);
    }

    async findAll(estado?: string): Promise<UnidadMedida[]> {
        const query = this.unidadMedidaRepository.createQueryBuilder('unidad_medida');
        
        if (estado) {
            query.where('unidad_medida.estado = :estado', { estado });
        }
        
        query.orderBy('unidad_medida.id', 'DESC');
        
        return await query.getMany();
    }

    async findOne(id: number): Promise<UnidadMedida> {
        const unidadMedida = await this.unidadMedidaRepository.findOne({ where: { id } });
        if (!unidadMedida) {
            throw new NotFoundException(`Unidad de medida con id ${id} no encontrada`);
        }
        return unidadMedida;
    }

    async update(id: number, updateUnidadMedidaDto: UpdateUnidadMedidaDto): Promise<UnidadMedida> {
        const unidadMedida = await this.findOne(id);
        Object.assign(unidadMedida, updateUnidadMedidaDto);
        return await this.unidadMedidaRepository.save(unidadMedida);
    }

    async remove(id: number): Promise<void> {
        const unidadMedida = await this.findOne(id);
        await this.unidadMedidaRepository.remove(unidadMedida);
    }
}
