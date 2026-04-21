import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordatorioPlan } from './entities/recordatorio-plan.entity';
import { CreateRecordatorioPlanDto } from './dto/create-recordatorio-plan.dto';
import { UpdateRecordatorioPlanDto } from './dto/update-recordatorio-plan.dto';

@Injectable()
export class RecordatorioPlanService {
    constructor(
        @InjectRepository(RecordatorioPlan)
        private recordatorioPlanRepository: Repository<RecordatorioPlan>,
    ) { }

    async create(createRecordatorioPlanDto: CreateRecordatorioPlanDto): Promise<RecordatorioPlan> {
        const recordatorio = this.recordatorioPlanRepository.create(createRecordatorioPlanDto);
        return await this.recordatorioPlanRepository.save(recordatorio);
    }

    async findAll(): Promise<RecordatorioPlan[]> {
        return await this.recordatorioPlanRepository.find({
            relations: ['proforma'],
            order: { fechaRecordatorio: 'ASC' }
        });
    }

    async findByProforma(proformaId: number): Promise<RecordatorioPlan[]> {
        return await this.recordatorioPlanRepository.find({
            where: { proformaId },
            relations: ['proforma'],
            order: { fechaRecordatorio: 'ASC' }
        });
    }

    async findPending(): Promise<RecordatorioPlan[]> {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        return await this.recordatorioPlanRepository.createQueryBuilder('recordatorio')
            .leftJoinAndSelect('recordatorio.proforma', 'proforma')
            .leftJoinAndSelect('proforma.paciente', 'paciente')
            .leftJoinAndSelect('proforma.clinica', 'clinica')
            .where('recordatorio.estado = :estado', { estado: 'activo' })
            .andWhere('recordatorio.fechaRecordatorio <= :today', { today: todayStr })
            .orderBy('recordatorio.fechaRecordatorio', 'ASC')
            .getMany();
    }

    async findOne(id: number): Promise<RecordatorioPlan> {
        const recordatorio = await this.recordatorioPlanRepository.findOne({
            where: { id },
            relations: ['proforma']
        });
        if (!recordatorio) {
            throw new NotFoundException(`RecordatorioPlan with ID ${id} not found`);
        }
        return recordatorio;
    }

    async update(id: number, updateRecordatorioPlanDto: UpdateRecordatorioPlanDto): Promise<RecordatorioPlan> {
        const recordatorio = await this.findOne(id);
        Object.assign(recordatorio, updateRecordatorioPlanDto);
        return await this.recordatorioPlanRepository.save(recordatorio);
    }

    async remove(id: number): Promise<void> {
        const recordatorio = await this.findOne(id);
        await this.recordatorioPlanRepository.remove(recordatorio);
    }
}
