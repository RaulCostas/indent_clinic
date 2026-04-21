import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Recordatorio } from './entities/recordatorio.entity';
import { CreateRecordatorioDto } from './dto/create-recordatorio.dto';
import { UpdateRecordatorioDto } from './dto/update-recordatorio.dto';

@Injectable()
export class RecordatorioService {
    constructor(
        @InjectRepository(Recordatorio)
        private readonly recordatorioRepository: Repository<Recordatorio>,
    ) { }

    async create(createDto: CreateRecordatorioDto): Promise<Recordatorio> {
        const recordatorio = this.recordatorioRepository.create(createDto);
        return await this.recordatorioRepository.save(recordatorio);
    }

    async findAll(search?: string, estado?: string, page: number = 1, limit: number = 10): Promise<{ data: Recordatorio[], total: number }> {
        const query = this.recordatorioRepository.createQueryBuilder('recordatorio');

        if (search) {
            query.where('recordatorio.mensaje LIKE :search', { search: `%${search}%` });
        }

        if (estado) {
            query.andWhere('recordatorio.estado = :estado', { estado });
        }

        query.orderBy('recordatorio.fecha', 'DESC')
            .addOrderBy('recordatorio.hora', 'DESC');

        const total = await query.getCount();

        if (limit > 0) {
            query.skip((page - 1) * limit).take(limit);
        }

        const data = await query.getMany();

        return { data, total };
    }

    async findOne(id: number): Promise<Recordatorio> {
        const recordatorio = await this.recordatorioRepository.findOne({ where: { id } });
        if (!recordatorio) {
            throw new NotFoundException(`Recordatorio #${id} not found`);
        }
        return recordatorio;
    }

    async update(id: number, updateDto: UpdateRecordatorioDto): Promise<Recordatorio> {
        const recordatorio = await this.findOne(id);
        this.recordatorioRepository.merge(recordatorio, updateDto);
        return await this.recordatorioRepository.save(recordatorio);
    }

    async findActivos(usuarioId?: number): Promise<Recordatorio[]> {
        const query = this.recordatorioRepository.createQueryBuilder('recordatorio');

        query.where('recordatorio.estado = :estado', { estado: 'activo' });

        // Show reminders for today and future dates
        query.andWhere('recordatorio.fecha >= CURRENT_DATE');

        // If usuarioId is provided, get personal reminders for that user + all consultorio reminders
        if (usuarioId) {
            query.andWhere(
                '(recordatorio.tipo = :tipoConsultorio OR (recordatorio.tipo = :tipoPersonal AND (recordatorio.usuarioId = :usuarioId OR recordatorio.usuarioId IS NULL)))',
                { tipoConsultorio: 'consultorio', tipoPersonal: 'personal', usuarioId }
            );
        } else {
            // If no usuarioId, only return consultorio reminders
            query.andWhere('recordatorio.tipo = :tipo', { tipo: 'consultorio' });
        }

        query.orderBy('recordatorio.fecha', 'ASC')
            .addOrderBy('recordatorio.hora', 'ASC')
            .limit(10);

        return await query.getMany();
    }

    async remove(id: number): Promise<void> {
        // Soft delete by setting estado to 'inactivo'
        await this.recordatorioRepository.update(id, { estado: 'inactivo' });
    }
}
