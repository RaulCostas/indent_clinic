import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComisionTarjeta } from './entities/comision_tarjeta.entity';
import { CreateComisionTarjetaDto } from './dto/create-comision_tarjeta.dto';
import { UpdateComisionTarjetaDto } from './dto/update-comision_tarjeta.dto';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class ComisionTarjetaService {
    constructor(
        @InjectRepository(ComisionTarjeta)
        private comisionTarjetaRepository: Repository<ComisionTarjeta>,
    ) { }

    async create(createComisionTarjetaDto: CreateComisionTarjetaDto) {
        const inputRedBanco = createComisionTarjetaDto.redBanco.trim();
        const normalizedInput = normalizeString(inputRedBanco);

        const allComisiones = await this.comisionTarjetaRepository.find();
        const existing = allComisiones.find(c => normalizeString(c.redBanco) === normalizedInput);

        if (existing) {
            throw new BadRequestException('Ya existe una comisión para esa Red Bancaria');
        }

        const comision = this.comisionTarjetaRepository.create({
            ...createComisionTarjetaDto,
            redBanco: inputRedBanco
        });
        return this.comisionTarjetaRepository.save(comision);
    }

    findAll() {
        return this.comisionTarjetaRepository.find();
    }

    findOne(id: number) {
        return this.comisionTarjetaRepository.findOneBy({ id });
    }

    async update(id: number, updateComisionTarjetaDto: UpdateComisionTarjetaDto) {
        if (updateComisionTarjetaDto.redBanco) {
            const inputRedBanco = updateComisionTarjetaDto.redBanco.trim();
            const normalizedInput = normalizeString(inputRedBanco);

            const allComisiones = await this.comisionTarjetaRepository.find();
            const existing = allComisiones.find(c => normalizeString(c.redBanco) === normalizedInput);

            if (existing && existing.id !== id) {
                throw new BadRequestException('Ya existe una comisión para esa Red Bancaria');
            }
            updateComisionTarjetaDto.redBanco = inputRedBanco;
        }
        return this.comisionTarjetaRepository.update(id, updateComisionTarjetaDto);
    }

    remove(id: number) {
        return this.comisionTarjetaRepository.delete(id);
    }
}
