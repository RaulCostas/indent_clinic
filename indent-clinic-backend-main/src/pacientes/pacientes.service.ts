import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Paciente } from './entities/paciente.entity';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { CreateQuickPacienteDto } from './dto/create-quick-paciente.dto';
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

    private calculateAge(fechaNacimiento: string): number {
        if (!fechaNacimiento) return 0;
        const today = new Date();
        const birthDate = new Date(fechaNacimiento);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
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

    async checkDuplicateName(nombre: string, paterno: string, materno: string, clinicaId: number, excludeId?: number) {
        if (!nombre || !paterno || !clinicaId) return;

        const queryBuilder = this.pacientesRepository.createQueryBuilder('p')
            .where('TRIM(LOWER(p.nombre)) = :nombre', { nombre: nombre.trim().toLowerCase() })
            .andWhere('TRIM(LOWER(p.paterno)) = :paterno', { paterno: paterno.trim().toLowerCase() })
            .andWhere('p.clinicaId = :clinicaId', { clinicaId });

        if (materno && materno.trim() !== '') {
            queryBuilder.andWhere('TRIM(LOWER(p.materno)) = :materno', { materno: materno.trim().toLowerCase() });
        } else {
            queryBuilder.andWhere('(p.materno IS NULL OR TRIM(p.materno) = \'\')');
        }

        if (excludeId) {
            queryBuilder.andWhere('p.id != :excludeId', { excludeId });
        }

        const existing = await queryBuilder.getOne();
        if (existing) {
            throw new BadRequestException(['Ya existe un Paciente registrado con este nombre completo en esta clínica.']);
        }
    }

    async create(createPacienteDto: CreatePacienteDto): Promise<Paciente> {
        console.log('Creating Paciente with DTO:', createPacienteDto);
        
        if (createPacienteDto.clinicaId) {
            const age = this.calculateAge(createPacienteDto.fecha_nacimiento);
            const isMinor = age < 18;

            if (createPacienteDto.ci) {
                // If CI is provided (even if minor), check CI
                await this.checkDuplicateCi(createPacienteDto.ci, createPacienteDto.clinicaId);
            } else {
                // If NO CI
                if (!isMinor) {
                    // For adults, CI is mandatory in regular registration
                    throw new BadRequestException(['El CI es obligatorio para pacientes mayores de edad.']);
                }
                // For minors without CI, check Name duplication
                await this.checkDuplicateName(
                    createPacienteDto.nombre,
                    createPacienteDto.paterno,
                    createPacienteDto.materno || '',
                    createPacienteDto.clinicaId
                );
            }
        }

        if (createPacienteDto.celular) {
            createPacienteDto.celular = this.formatPhoneNumber(createPacienteDto.celular);
        }
        const paciente = this.pacientesRepository.create(createPacienteDto);
        return await this.pacientesRepository.save(paciente);
    }

    async createQuick(dto: CreateQuickPacienteDto): Promise<Paciente> {
        console.log('Creating Quick Paciente with DTO:', dto);

        if (dto.clinicaId) {
            // Quick registration ALWAYS checks Name duplication
            await this.checkDuplicateName(
                dto.nombre,
                dto.paterno,
                dto.materno || '',
                dto.clinicaId
            );
        }

        if (dto.celular) {
            dto.celular = this.formatPhoneNumber(dto.celular);
        }

        const paciente = this.pacientesRepository.create({
            direccion: '',
            lugar_residencia: '',
            telefono: '',
            email: '',
            profesion: '',
            estado_civil: 'Soltero',
            responsable: '',
            parentesco: '',
            direccion_responsable: '',
            telefono_responsable: '',
            ...dto,
            fecha: getBoliviaDate(),
            fecha_nacimiento: getBoliviaDate(), // Default to today if not provided
            estado: 'activo'
        });

        return await this.pacientesRepository.save(paciente);
    }

    async findAll(page: number, limit: number, search: string, clinicaId?: number, estado?: string, minimal: boolean = false): Promise<{ data: Paciente[], total: number, totalPages: number }> {
        const skip = (page - 1) * limit;
        const queryBuilder = this.pacientesRepository.createQueryBuilder('paciente');

        if (!minimal) {
            queryBuilder.leftJoinAndSelect('paciente.fichaMedica', 'fichaMedica');
        } else {
            // Select only essential fields for dropdowns to save bandwidth
            queryBuilder.select([
                'paciente.id',
                'paciente.nombre',
                'paciente.paterno',
                'paciente.materno',
                'paciente.ci',
                'paciente.celular',
                'paciente.estado',
                'paciente.clinicaId'
            ]);
        }

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
        const currentCi = updatePacienteDto.ci !== undefined ? updatePacienteDto.ci : paciente.ci;
        const currentNombre = updatePacienteDto.nombre || paciente.nombre;
        const currentPaterno = updatePacienteDto.paterno || paciente.paterno;
        const currentMaterno = updatePacienteDto.materno !== undefined ? updatePacienteDto.materno : (paciente.materno || '');

        if (currentCi) {
            await this.checkDuplicateCi(currentCi, currentClinicaId, id);
        } else {
            await this.checkDuplicateName(currentNombre, currentPaterno, currentMaterno, currentClinicaId, id);
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
    async findPendientes(tab: 'agendados' | 'no_agendados', doctorId?: number, especialidadId?: number, page: number = 1, limit: number = 10, search: string = '') {
        // Build the WHERE clause for the patients
        let whereClause = '1=1';

        // 1. Check for Pending Budget (estadoPresupuesto = 'no terminado')
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
            whereClause += ` AND EXISTS (SELECT 1 FROM agenda a WHERE a."pacienteId" = p.id AND a.fecha >= CURRENT_DATE)`;
        } else {
            whereClause += ` AND NOT EXISTS (SELECT 1 FROM agenda a WHERE a."pacienteId" = p.id AND a.fecha >= CURRENT_DATE)`;
        }

        // 3. Search logic
        if (search) {
            const st = `%${search.toLowerCase()}%`;
            whereClause += ` AND (LOWER(p.nombre) LIKE '${st}' OR LOWER(p.paterno) LIKE '${st}' OR LOWER(p.materno) LIKE '${st}')`;
        }

        // Execution
        const today = getBoliviaDate();
        const skip = (page - 1) * limit;
        
        console.log(`FindPendientes: Tab=${tab}, Date=${today}, Doctor=${doctorId}, Spec=${especialidadId}, Page=${page}, Search=${search}`);

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM pacientes p 
            WHERE ${whereClause.replace(/CURRENT_DATE/g, `'${today}'`)}
        `;

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
            ORDER BY p.paterno ASC, p.materno ASC, p.nombre ASC
            LIMIT ${limit} OFFSET ${skip}
        `;

        const [countRes, results] = await Promise.all([
            this.pacientesRepository.query(countQuery),
            this.pacientesRepository.query(query)
        ]);

        const total = parseInt(countRes[0].total);

        return {
            data: results,
            total,
            totalPages: Math.ceil(total / limit)
        };
    }

    async findNoRegistrados(clinicaId?: number) {
        const today = getBoliviaDate();
        console.log(`FindNoRegistrados: Date=${today}`);
        const query = `
            SELECT 
                p.id as "pacienteId",
                p.nombre, p.paterno, p.materno,
                a.fecha, a.hora,
                c.nombre as "clinicaNombre",
                CONCAT(COALESCE(d.nombre,''), ' ', COALESCE(d.paterno,''), ' ', COALESCE(d.materno,'')) as "doctorNombre"
            FROM agenda a
            JOIN pacientes p ON p.id = a."pacienteId"
            LEFT JOIN clinicas c ON c.id = a."clinicaId"
            LEFT JOIN doctor d ON d.id = a."doctorId"
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

    async runMigrationLimpieza() {
        const query = `
            DELETE FROM agenda
            WHERE fecha <= '2026-05-03';
        `;
        return await this.pacientesRepository.query(query);
    }
}
