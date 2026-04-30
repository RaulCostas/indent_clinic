import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Doctor } from './entities/doctor.entity';

import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Injectable()
export class DoctorsService {
    constructor(
        @InjectRepository(Doctor)
        private doctorsRepository: Repository<Doctor>,
        @InjectRepository(HistoriaClinica)
        private historiaClinicaRepository: Repository<HistoriaClinica>,
    ) { }

    async create(createDoctorDto: CreateDoctorDto): Promise<Doctor> {
        const doctor = this.doctorsRepository.create(createDoctorDto);
        return await this.doctorsRepository.save(doctor);
    }

    async findByCelular(celular: string): Promise<Doctor | null> {
        return await this.doctorsRepository.findOne({ where: { celular } });
    }

    async getStatistics(fechaInicio: string, fechaFinal: string, status: string, clinicaId?: string): Promise<any[]> {
        const clinicaIdNumber = clinicaId ? parseInt(clinicaId, 10) : 0;
        
        const qb = this.doctorsRepository.createQueryBuilder('doctor')
            .leftJoin(
                HistoriaClinica,
                'hc',
                'hc.doctorId = doctor.id AND hc.estadoTratamiento = :estadoTrat AND hc.fecha >= :fechaInicio AND hc.fecha <= :fechaFinal',
                { estadoTrat: 'terminado', fechaInicio, fechaFinal }
            )
            .select('doctor.id', 'id')
            .addSelect('doctor.nombre', 'nombre')
            .addSelect('doctor.paterno', 'paterno')
            .addSelect('doctor.materno', 'materno')
            .addSelect(
                `COALESCE(SUM(CASE WHEN ${clinicaIdNumber > 0 ? 'hc.clinicaId = :clinicaId' : '1=1'} THEN COALESCE(hc."precioConDescuento", hc.precio, 0) ELSE 0 END), 0)`,
                'totalGenerado'
            )
            .groupBy('doctor.id')
            .addGroupBy('doctor.nombre')
            .addGroupBy('doctor.paterno')
            .addGroupBy('doctor.materno')
            .orderBy('"totalGenerado"', 'DESC');

        if (clinicaIdNumber > 0) {
            qb.setParameter('clinicaId', clinicaIdNumber);
        }

        if (status && status !== 'ambos') {
            qb.andWhere('doctor.estado = :status', { status: status.toLowerCase() });
        }

        const rawResults = await qb.getRawMany();

        return rawResults.map(r => ({
            id: Number(r.id),
            nombreCompleto: `${r.nombre} ${r.paterno} ${r.materno || ''}`.trim(),
            totalGenerado: parseFloat(r.totalGenerado || r.totalgenerado || 0)
        }));
    }

    async findAll(search?: string, page: number = 1, limit: number = 5): Promise<any> {
        const skip = (page - 1) * limit;
        const queryBuilder = this.doctorsRepository.createQueryBuilder('doctor')
            .leftJoinAndSelect('doctor.especialidad', 'especialidad');
        if (search) {
            queryBuilder.where('(doctor.nombre ILIKE :search OR doctor.paterno ILIKE :search OR doctor.materno ILIKE :search)', { search: `%${search}%` });
        }
        const [data, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async findOne(id: number): Promise<Doctor> {
        const doctor = await this.doctorsRepository.findOne({ 
            where: { id },
            relations: ['especialidad']
        });
        if (!doctor) throw new NotFoundException(`Doctor con ID ${id} no encontrado`);
        return doctor;
    }

    async update(id: number, updateDoctorDto: UpdateDoctorDto): Promise<Doctor> {
        const doctor = await this.findOne(id);
        Object.assign(doctor, updateDoctorDto);
        return await this.doctorsRepository.save(doctor);
    }

    async remove(id: number): Promise<void> {
        const doctor = await this.findOne(id);
        await this.doctorsRepository.remove(doctor);
    }
}
