import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGastosFijosDto } from './dto/create-gastos_fijos.dto';
import { UpdateGastosFijosDto } from './dto/update-gastos_fijos.dto';
import { GastosFijos } from './entities/gastos_fijos.entity';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class GastosFijosService {
    constructor(
        @InjectRepository(GastosFijos)
        private gastosFijosRepository: Repository<GastosFijos>,
    ) { }

    async create(createGastosFijosDto: CreateGastosFijosDto) {
        const inputStr = createGastosFijosDto.gasto_fijo.trim();
        const normalizedInput = normalizeString(inputStr);

        const allRecords = await this.gastosFijosRepository.find();
        
        const existing = allRecords.find(r => 
            normalizeString(r.gasto_fijo) === normalizedInput && 
            r.clinicaId == createGastosFijosDto.clinicaId
        );

        if (existing) {
            throw new BadRequestException('Ya existe un gasto fijo con este nombre para esta clínica');
        }

        createGastosFijosDto.gasto_fijo = inputStr;
        const gasto = this.gastosFijosRepository.create(createGastosFijosDto);
        return this.gastosFijosRepository.save(gasto);
    }

    findAll(clinicaId?: number) {
        if (clinicaId) {
            return this.gastosFijosRepository.find({ where: { clinicaId } });
        }
        return this.gastosFijosRepository.find();
    }

    async findOne(id: number) {
        const gasto = await this.gastosFijosRepository.findOneBy({ id });
        if (!gasto) {
            throw new NotFoundException(`Gasto Fijo #${id} not found`);
        }
        return gasto;
    }

    async update(id: number, updateGastosFijosDto: UpdateGastosFijosDto) {
        const gasto = await this.findOne(id);
        
        if (updateGastosFijosDto.gasto_fijo) {
            const inputStr = updateGastosFijosDto.gasto_fijo.trim();
            const normalizedInput = normalizeString(inputStr);

            const allRecords = await this.gastosFijosRepository.find();
            
            const recordClinicaId = updateGastosFijosDto.clinicaId ?? gasto.clinicaId;

            const existing = allRecords.find(r => 
                normalizeString(r.gasto_fijo) === normalizedInput && 
                r.clinicaId == recordClinicaId
            );

            if (existing && existing.id !== id) {
                throw new BadRequestException('Ya existe un gasto fijo con este nombre para esta clínica');
            }
            updateGastosFijosDto.gasto_fijo = inputStr;
        }

        this.gastosFijosRepository.merge(gasto, updateGastosFijosDto);
        return this.gastosFijosRepository.save(gasto);
    }

    async remove(id: number) {
        const gasto = await this.findOne(id);
        return this.gastosFijosRepository.remove(gasto);
    }
}
