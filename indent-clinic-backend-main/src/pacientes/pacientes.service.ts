import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Paciente } from './entities/paciente.entity';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

import { getBoliviaDate } from '../common/utils/date.utils';

@Injectable()
export class PacientesService {
    constructor(
        @InjectRepository(Paciente)
        private pacientesRepository: Repository<Paciente>,
    ) { }
    
    private formatPhoneNumber(celular: string): string {
        if (!celular) return celular;
        const trimmed = celular.trim();
        if (trimmed.startsWith('+')) return trimmed;
        // If it lacks +, assume default +591 (or could be dynamic if needed, but per request +591 is standard here)
        return `+591${trimmed}`;
    }

    async checkDuplicateCi(ci: string, clinicaId: number, excludeId?: number) {
        if (!ci || ci.trim() === '' || !clinicaId) return;
        
        const queryBuilder = this.pacientesRepository.createQueryBuilder('p')
            .where('TRIM(LOWER(p.ci)) = :ci', { ci: ci.trim().toLowerCase() })
            .andWhere('p.clinicaId = :clinicaId', { clinicaId });
            
        if (excludeId) {
            queryBuilder.andWhere('p.id != :excludeId', { excludeId });
        }

        const existing = await queryBuilder.getOne();
        if (existing) {
            throw new BadRequestException(['Ya existe un Paciente registrado con este CI o Documento en esta clínica.']);
        }
    }

    async create(createPacienteDto: CreatePacienteDto): Promise<Paciente> {
        console.log('Creating Paciente with DTO:', createPacienteDto);
        if (createPacienteDto.ci && createPacienteDto.clinicaId) {
            await this.checkDuplicateCi(createPacienteDto.ci, createPacienteDto.clinicaId);
        }
        if (createPacienteDto.celular) {
            createPacienteDto.celular = this.formatPhoneNumber(createPacienteDto.celular);
        }
        const paciente = this.pacientesRepository.create(createPacienteDto);
        return await this.pacientesRepository.save(paciente);
    }

    async findAll(page: number, limit: number, search: string, clinicaId?: number, estado?: string): Promise<{ data: Paciente[], total: number, totalPages: number }> {
        const skip = (page - 1) * limit;
        const queryBuilder = this.pacientesRepository.createQueryBuilder('paciente');

        queryBuilder.leftJoinAndSelect('paciente.fichaMedica', 'fichaMedica');

        if (search) {
            const searchTerm = `%${search}%`;
            queryBuilder.andWhere(
                "(paciente.nombre ILIKE :search OR paciente.paterno ILIKE :search OR paciente.materno ILIKE :search OR CONCAT(paciente.nombre, ' ', paciente.paterno, ' ', paciente.materno) ILIKE :search OR CONCAT(paciente.paterno, ' ', paciente.materno, ' ', paciente.nombre) ILIKE :search)",
                { search: searchTerm }
            );
        }

        if (clinicaId) {
            queryBuilder.andWhere('paciente.clinicaId = :clinicaId', { clinicaId });
        }

        if (estado) {
            queryBuilder.andWhere('paciente.estado = :estado', { estado });
        }

        queryBuilder
            .orderBy('paciente.paterno', 'ASC')
            .addOrderBy('paciente.materno', 'ASC')
            .addOrderBy('paciente.nombre', 'ASC')
            .skip(skip)
            .take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            total,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number): Promise<Paciente> {
        const paciente = await this.pacientesRepository.findOne({ where: { id }, relations: ['fichaMedica'] });
        if (!paciente) {
            throw new Error('Paciente not found');
        }
        return paciente;
    }

    async update(id: number, updatePacienteDto: UpdatePacienteDto): Promise<Paciente> {
        console.log(`Updating Paciente ${id} with DTO:`, updatePacienteDto);

        const paciente = await this.findOne(id);
        if (!paciente) {
            throw new NotFoundException(`Paciente #${id} not found`);
        }

        const currentClinicaId = updatePacienteDto.clinicaId || paciente.clinicaId;
        if (updatePacienteDto.ci && currentClinicaId) {
            await this.checkDuplicateCi(updatePacienteDto.ci, currentClinicaId, id);
        }

        if (updatePacienteDto.celular) {
            updatePacienteDto.celular = this.formatPhoneNumber(updatePacienteDto.celular);
        }

        // Merge main patient data
        this.pacientesRepository.merge(paciente, updatePacienteDto);

        // Handle nested FichaMedica manually if needed
        if (updatePacienteDto.fichaMedica) {
            if (!paciente.fichaMedica) {
                paciente.fichaMedica = updatePacienteDto.fichaMedica as any;
            } else {
                Object.assign(paciente.fichaMedica, updatePacienteDto.fichaMedica);
            }
        }

        return await this.pacientesRepository.save(paciente);
    }

    async remove(id: number): Promise<void> {
        await this.pacientesRepository.delete(id);
    }

    async getDashboardStats(clinicaId?: number): Promise<{ totalPacientes: number, birthdayPacientes: Paciente[] }> {
        let totalPacientes: number;

        if (clinicaId) {
            // Count unique patients assigned to this clinic
            totalPacientes = await this.pacientesRepository.count({
                where: { clinicaId, estado: 'activo' }
            });
        } else {
            // Global count
            totalPacientes = await this.pacientesRepository.count({ where: { estado: 'activo' } });
        }

        // Get today's date parts
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // Query for patients with birthday today
        const queryBuilder = this.pacientesRepository
            .createQueryBuilder('paciente')
            .where('EXTRACT(MONTH FROM paciente.fecha_nacimiento) = :month', { month })
            .andWhere('EXTRACT(DAY FROM paciente.fecha_nacimiento) = :day', { day })
            .andWhere('paciente.estado = :estado', { estado: 'activo' });

        if (clinicaId) {
            queryBuilder.andWhere('paciente.clinicaId = :clinicaId', { clinicaId });
        }

        const birthdayPacientes = await queryBuilder.getMany();

        return {
            totalPacientes,
            birthdayPacientes
        };
    }


    async findByCelular(celular: string): Promise<Paciente | null> {
        // 1. Try strict match first
        let paciente = await this.pacientesRepository.findOne({ where: { celular } });
        if (paciente) return paciente;

        // 2. Try super fuzzy match (Digits only equality)
        // This handles cases like:
        // DB: "+591 700-123" -> "591700123"
        // Search: "591700123" -> Match!

        const cleanCelular = celular.replace(/[^0-9]/g, '');
        if (!cleanCelular || cleanCelular.length < 7) return null; // Avoid searching too short strings

        try {
            // Match if input is suffix of DB or vice versa (fuzzy)
            paciente = await this.pacientesRepository.createQueryBuilder('p')
                .where("REGEXP_REPLACE(p.celular, '[^0-9]', '', 'g') LIKE :suffix", { suffix: `%${cleanCelular}` })
                .orWhere(":cleanCelular LIKE CONCAT('%', REGEXP_REPLACE(p.celular, '[^0-9]', '', 'g'))", { cleanCelular })
                .getOne();
        } catch (e) {
            console.error('Error in fuzzy search:', e);
        }

        return paciente || null;
    }
    async findPendientes(tab: 'agendados' | 'no_agendados', doctorId?: number, especialidadId?: number) {
        // Build the WHERE clause for the patients
        let whereClause = '1=1';

        // 1. Check for Pending Budget (estadoPresupuesto = 'no terminado')
        // Only consider the LATEST treatment entry for each proforma to determine its current status.
        let hcFilter = `hc."estadoPresupuesto" = 'no terminado'`;
        if (doctorId) {
            hcFilter += ` AND hc."doctorId" = ${doctorId}`;
        }
        if (especialidadId) {
            hcFilter += ` AND hc."especialidadId" = ${especialidadId}`;
        }

        whereClause += ` AND EXISTS (
            SELECT 1 FROM historia_clinica hc 
            WHERE hc."pacienteId" = p.id 
              AND ${hcFilter}
              AND hc.id = (
                SELECT MAX(h2.id) 
                FROM historia_clinica h2 
                WHERE h2."pacienteId" = p.id 
                  AND (h2."proformaId" = hc."proformaId" OR (h2."proformaId" IS NULL AND hc."proformaId" IS NULL))
              )
        )`;

        // 2. Tab Logic (Agenda Check)
        if (tab === 'agendados') {
            // Has future appointment
            whereClause += ` AND EXISTS (SELECT 1 FROM agenda a WHERE a."pacienteId" = p.id AND a.fecha >= CURRENT_DATE)`;
        } else {
            // No future appointment
            whereClause += ` AND NOT EXISTS (SELECT 1 FROM agenda a WHERE a."pacienteId" = p.id AND a.fecha >= CURRENT_DATE)`;
        }

        // Execution
        const today = getBoliviaDate();
        console.log(`FindPendientes: Tab=${tab}, Date=${today}, Doctor=${doctorId}, Spec=${especialidadId}`);
        console.log('WhereClause:', whereClause);

        const query = `
            SELECT 
                p.id, p.nombre, p.paterno, p.materno, p.celular,
                (SELECT a.fecha FROM agenda a WHERE a."pacienteId" = p.id ORDER BY a.fecha DESC LIMIT 1) as ultima_cita,
                (SELECT CONCAT(d.nombre, ' ', d.paterno) 
                 FROM historia_clinica hc 
                 LEFT JOIN doctor d ON d.id = hc."doctorId" 
                 WHERE hc."pacienteId" = p.id AND hc."estadoPresupuesto" = 'no terminado' 
                 ORDER BY hc.fecha DESC LIMIT 1) as ultimo_doctor,
                (SELECT hc.tratamiento 
                 FROM historia_clinica hc 
                 WHERE hc."pacienteId" = p.id AND hc."estadoPresupuesto" = 'no terminado' 
                 ORDER BY hc.fecha DESC LIMIT 1) as ultimo_tratamiento,
                 (SELECT e.especialidad 
                  FROM historia_clinica hc 
                  LEFT JOIN especialidad e ON e.id = hc."especialidadId" 
                  WHERE hc."pacienteId" = p.id AND hc."estadoPresupuesto" = 'no terminado' 
                  ORDER BY hc.fecha DESC LIMIT 1) as ultima_especialidad,
                  (SELECT pr.numero 
                   FROM historia_clinica hc 
                   LEFT JOIN proformas pr ON pr.id = hc."proformaId" 
                   WHERE hc."pacienteId" = p.id AND hc."estadoPresupuesto" = 'no terminado' 
                   ORDER BY hc.fecha DESC LIMIT 1) as numero_presupuesto
            FROM pacientes p
            WHERE ${whereClause.replace(/CURRENT_DATE/g, `'${today}'`)}
        `;

        const results = await this.pacientesRepository.query(query);
        console.log(`Found ${results.length} results`);
        return results;
    }

    async findNoRegistrados(clinicaId?: number) {
        const today = getBoliviaDate();
        console.log(`FindNoRegistrados: Date=${today}`);
        const query = `
            SELECT 
                p.id as "pacienteId",
                p.nombre, p.paterno, p.materno,
                a.fecha, a.hora, a.consultorio,
                c.nombre as "clinicaNombre"
            FROM agenda a
            JOIN pacientes p ON p.id = a."pacienteId"
            LEFT JOIN clinicas c ON c.id = a."clinicaId"
            WHERE a.fecha <= '${today}' 
              AND LOWER(a.estado) = 'atendido'
              ${clinicaId ? `AND a."clinicaId" = ${clinicaId}` : ''}
              AND NOT EXISTS (
                  SELECT 1 
                  FROM historia_clinica hc 
                  WHERE hc."pacienteId" = a."pacienteId" 
                    AND hc.fecha = a.fecha
              )
            ORDER BY a.fecha DESC
        `;
        console.log('Query:', query);
        const results = await this.pacientesRepository.query(query);
        console.log(`Found ${results.length} no registrados results`);
        return results;
    }

    async getStatistics(year: number): Promise<any[]> {
        const query = this.pacientesRepository.createQueryBuilder('paciente')
            .select('EXTRACT(MONTH FROM paciente.fecha)', 'month')
            .addSelect('COUNT(paciente.id)', 'count')
            .where('EXTRACT(YEAR FROM paciente.fecha) = :year', { year })
            .groupBy('EXTRACT(MONTH FROM paciente.fecha)');

        const rawResults = await query.getRawMany();

        // Initialize array for 12 months with 0 counts
        const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            count: 0
        }));

        // Fill in actual data
        rawResults.forEach(r => {
            const mIndex = parseInt(r.month) - 1;
            if (mIndex >= 0 && mIndex < 12) {
                monthlyStats[mIndex].count = parseInt(r.count);
            }
        });

        return monthlyStats;
    }
}
