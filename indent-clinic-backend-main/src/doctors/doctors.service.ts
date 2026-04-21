import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
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
        await this.checkDuplicate(
            createDoctorDto.nombre,
            createDoctorDto.paterno,
            createDoctorDto.materno,
            createDoctorDto.celular
        );
        const doctor = this.doctorsRepository.create(createDoctorDto);
        return await this.doctorsRepository.save(doctor);
    }

    async getStatistics(fechaInicio: string, fechaFinal: string, status: string, clinicaId?: string): Promise<any[]> {
        // Build date condition for the join
        let dateCondition = 'hc.estadoTratamiento = :estadoTrat';
        const params: any = { estadoTrat: 'terminado' };

        if (fechaInicio) {
            dateCondition += ' AND hc.fecha >= :fechaInicio';
            params.fechaInicio = fechaInicio;
        }
        if (fechaFinal) {
            dateCondition += ' AND hc.fecha <= :fechaFinal';
            params.fechaFinal = fechaFinal;
        }

        const clinicaIdNumber = clinicaId ? parseInt(clinicaId, 10) : 0;
        if (clinicaIdNumber > 0) {
            params.clinicaId = clinicaIdNumber;
        }

        // Build query with join to proforma_detalle to get discount
        const qb = this.doctorsRepository.createQueryBuilder('doctor')
            .leftJoin(
                'historia_clinica',
                'hc',
                `hc.doctorId = doctor.id AND ${dateCondition}`,
                params
            )
            .leftJoin(
                'proforma_detalle',
                'pd',
                'pd.id = hc.proformaDetalleId'
            )
            .leftJoin(
                'proformas',
                'p',
                'p.id = hc.proformaId'
            )
            .select([
                'doctor.id AS "id"',
                'doctor.nombre AS "nombre"',
                'doctor.paterno AS "paterno"',
                'doctor.materno AS "materno"',
                // Calculate total as price minus percentage discount
                // Formula: precio - (precio * descuento / 100)
                `COALESCE(SUM(CASE WHEN ${clinicaIdNumber > 0 ? 'p.clinicaId = :clinicaId' : '1=1'} THEN (hc.precio - (hc.precio * COALESCE(p.descuento, 0) / 100)) ELSE 0 END), 0) AS "totalGenerado"`
            ])
            .groupBy('doctor.id')
            .addGroupBy('doctor.nombre')
            .addGroupBy('doctor.paterno')
            .addGroupBy('doctor.materno')
            .orderBy('"totalGenerado"', 'DESC');

        if (status && status !== 'ambos') {
            qb.where('doctor.estado = :status', { status: status.toLowerCase() });
        }

        const rawResults = await qb.getRawMany();

        // Format results
        return rawResults.map(r => ({
            id: r.id,
            nombreCompleto: `${r.nombre} ${r.paterno} ${r.materno || ''}`.trim(),
            totalGenerado: parseFloat(r.totalGenerado)
        }));
    }

    async findAll(search?: string, page: number = 1, limit: number = 5): Promise<{
        data: Doctor[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const queryBuilder = this.doctorsRepository.createQueryBuilder('doctor');

        if (search) {
            queryBuilder.where(
                '(doctor.nombre ILIKE :search OR doctor.paterno ILIKE :search OR doctor.materno ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        const [data, total] = await queryBuilder
            .leftJoinAndSelect('doctor.especialidad', 'especialidad')
            .orderBy('doctor.nombre', 'ASC')
            .addOrderBy('doctor.paterno', 'ASC')
            .addOrderBy('doctor.materno', 'ASC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number): Promise<Doctor> {
        const doctor = await this.doctorsRepository.findOne({
            where: { id },
            relations: ['especialidad'],
        });
        if (!doctor) {
            throw new NotFoundException(`Doctor with ID ${id} not found`);
        }
        return doctor;
    }

    async findByCelular(celular: string): Promise<Doctor | null> {
        return this.doctorsRepository.findOne({
            where: { celular },
            relations: ['especialidad']
        });
    }

    async update(id: number, updateDoctorDto: UpdateDoctorDto): Promise<Doctor> {
        const doctor = await this.findOne(id);
        
        await this.checkDuplicate(
            updateDoctorDto.nombre || doctor.nombre,
            updateDoctorDto.paterno || doctor.paterno,
            updateDoctorDto.materno || doctor.materno,
            updateDoctorDto.celular || doctor.celular,
            id
        );
        
        Object.assign(doctor, updateDoctorDto);
        return await this.doctorsRepository.save(doctor);
    }

    private async checkDuplicate(
        nombre: string,
        paterno: string,
        materno: string,
        celular: string,
        excludeId?: number
    ) {
        const query = this.doctorsRepository.createQueryBuilder('doctor')
            .where(new Brackets(qb => {
                qb.where('LOWER(TRIM(doctor.nombre)) = LOWER(TRIM(:nombre))', { nombre })
                    .andWhere('LOWER(TRIM(doctor.paterno)) = LOWER(TRIM(:paterno))', { paterno })
                    .andWhere('LOWER(TRIM(doctor.materno)) = LOWER(TRIM(:materno))', { materno: materno || '' })
                    .orWhere('TRIM(doctor.celular) = TRIM(:celular)', { celular });
            }));

        if (excludeId) {
            query.andWhere('doctor.id != :excludeId', { excludeId });
        }
        
        const exists = await query.getOne();
        if (exists) throw new BadRequestException(['Ya existe un doctor registrado con el mismo nombre completo o celular']);
    }

    async remove(id: number): Promise<void> {
        const doctor = await this.findOne(id);
        await this.doctorsRepository.remove(doctor);
    }
}
