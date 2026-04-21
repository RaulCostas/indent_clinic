import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecordatorioTratamiento } from './entities/recordatorio-tratamiento.entity';
import { CreateRecordatorioTratamientoDto } from './dto/create-recordatorio-tratamiento.dto';

@Injectable()
export class RecordatorioTratamientoService {
    constructor(
        @InjectRepository(RecordatorioTratamiento)
        private recordatorioRepository: Repository<RecordatorioTratamiento>,
    ) { }

    create(createDto: CreateRecordatorioTratamientoDto) {
        const recordatorio = this.recordatorioRepository.create(createDto);
        return this.recordatorioRepository.save(recordatorio);
    }

    findAll() {
        return this.recordatorioRepository.find({
            relations: ['historiaClinica', 'historiaClinica.paciente', 'historiaClinica.personal'],
            order: { fechaRecordatorio: 'ASC' }
        });
    }

    findPending() {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        return this.recordatorioRepository.createQueryBuilder('recordatorio')
            .leftJoinAndSelect('recordatorio.historiaClinica', 'historiaClinica')
            .leftJoinAndSelect('historiaClinica.paciente', 'paciente')
            .leftJoinAndSelect('historiaClinica.clinica', 'clinica')
            .where('recordatorio.estado = :estado', { estado: 'pendiente' })
            .andWhere('recordatorio.fechaRecordatorio <= :today', { today: todayStr })
            .orderBy('recordatorio.fechaRecordatorio', 'ASC')
            .getMany();
    }

    findOne(id: number) {
        return this.recordatorioRepository.findOne({ where: { id } });
    }

    findByHistoriaClinicaId(historiaId: number) {
        return this.recordatorioRepository.findOne({ where: { historiaClinicaId: historiaId } });
    }

    async update(id: number, updateDto: any) {
        await this.recordatorioRepository.update(id, updateDto);
        return this.findOne(id);
    }

    remove(id: number) {
        return this.recordatorioRepository.delete(id);
    }
}
