import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CreatePersonalDto } from './dto/create-personal.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { Personal } from './entities/personal.entity';

@Injectable()
export class PersonalService {
    constructor(
        @InjectRepository(Personal)
        private personalRepository: Repository<Personal>,
    ) { }

    async create(createPersonalDto: CreatePersonalDto) {
        const { personalTipoId, clinicaId, ...rest } = createPersonalDto;
        
        if (rest.ci && clinicaId) {
            const existing = await this.personalRepository.createQueryBuilder('p')
                .where('TRIM(LOWER(p.ci)) = :ci', { ci: rest.ci.trim().toLowerCase() })
                .andWhere('p.clinicaId = :clinicaId', { clinicaId })
                .getOne();
            if (existing) {
                throw new BadRequestException(['Ya existe Personal con este CI/Documento en esta clínica.']);
            }
        }

        const personal = this.personalRepository.create({
            ...rest,
            personal_tipo_id: personalTipoId,
            clinicaId: clinicaId,
        });
        return this.personalRepository.save(personal);
    }

    async findAll(search?: string, page: number = 1, limit: number = 5, clinicaId?: number) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.nombre = ILike(`%${search}%`);
        }

        if (clinicaId) {
            where.clinicaId = clinicaId;
        }

        const [data, total] = await this.personalRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: { nombre: 'ASC', paterno: 'ASC', materno: 'ASC' },
            relations: ['personalTipo'],
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getBirthdays(clinicaId?: number) {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentDay = today.getDate(); // 1-31

        const where: any = { estado: 'activo' };
        if (clinicaId) {
            where.clinicaId = clinicaId;
        }

        const allPersonal = await this.personalRepository.find({
            where,
            relations: ['clinica']
        });

        const birthdays = allPersonal.filter(person => {
            // Parse the date string directly to avoid timezone issues
            const dateStr = person.fecha_nacimiento.toString();
            const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);

            // Compare month and day
            return month === currentMonth && day === currentDay;
        });

        return birthdays;
    }

    findOne(id: number) {
        return this.personalRepository.findOneBy({ id });
    }

    async update(id: number, updatePersonalDto: UpdatePersonalDto) {
        console.log('=== UPDATE PERSONAL DEBUG ===');
        
        if (updatePersonalDto.ci) {
            const existingMember = await this.findOne(id);
            if (existingMember && existingMember.clinicaId) {
                const duplicate = await this.personalRepository.createQueryBuilder('p')
                    .where('TRIM(LOWER(p.ci)) = :ci', { ci: updatePersonalDto.ci.trim().toLowerCase() })
                    .andWhere('p.clinicaId = :clinicaId', { clinicaId: existingMember.clinicaId })
                    .andWhere('p.id != :id', { id })
                    .getOne();
                if (duplicate) {
                    throw new BadRequestException(['Ya existe Personal con este CI/Documento en esta clínica.']);
                }
            }
        }
        console.log('ID:', id);
        console.log('Received DTO:', updatePersonalDto);

        const { personalTipoId, personalTipo, ...rest } = updatePersonalDto as any;
        const updateData: any = { ...rest };

        // Only add personal_tipo_id if personalTipoId is present in the DTO
        if ('personalTipoId' in updatePersonalDto) {
            updateData.personal_tipo_id = personalTipoId || null;
            console.log('personalTipoId found in DTO:', personalTipoId);
        } else {
            console.log('personalTipoId NOT in DTO');
        }

        console.log('Final updateData:', updateData);
        console.log('=== END DEBUG ===');

        return this.personalRepository.update(id, updateData);
    }

    async remove(id: number) {
        return this.personalRepository.delete(id);
    }

    async findByCelular(celular: string): Promise<Personal | null> {
        return this.personalRepository.findOne({
            where: { celular },
            relations: ['personalTipo']
        });
    }
}
