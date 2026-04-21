import { Injectable } from '@nestjs/common';
import { CreateVacacionDto } from './dto/create-vacacion.dto';
import { UpdateVacacionDto } from './dto/update-vacacion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacacion } from './entities/vacacion.entity';

@Injectable()
export class VacacionesService {
  constructor(
    @InjectRepository(Vacacion)
    private vacacionesRepository: Repository<Vacacion>,
  ) { }

  async create(createVacacionDto: CreateVacacionDto) {
    try {
      const vacacion = this.vacacionesRepository.create(createVacacionDto);
      return await this.vacacionesRepository.save(vacacion);
    } catch (error) {
      console.error('Error creating vacacion:', error);
      throw error;
    }
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '', clinicaId?: number) {
    try {
      const skip = (page - 1) * limit;

      const queryBuilder = this.vacacionesRepository.createQueryBuilder('vacacion')
        .leftJoinAndSelect('vacacion.personal', 'personal')
        .where('vacacion.estado = :estado', { estado: 'activo' });

      if (clinicaId) {
        queryBuilder.andWhere('personal.clinicaId = :clinicaId', { clinicaId });
      }

      if (search) {
        queryBuilder.andWhere(
          '(personal.nombre ILIKE :search OR personal.paterno ILIKE :search OR personal.materno ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      queryBuilder
        .orderBy('vacacion.fecha', 'DESC')
        .skip(skip)
        .take(limit);

      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error finding vacacion:', error);
      throw error;
    }
  }


  findOne(id: number) {
    return this.vacacionesRepository.findOne({
      where: { id },
      relations: ['personal']
    });
  }

  async update(id: number, updateVacacionDto: UpdateVacacionDto) {
    await this.vacacionesRepository.update(id, updateVacacionDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const vacacion = await this.findOne(id);
    if (vacacion) {
      vacacion.estado = 'eliminado';
      return this.vacacionesRepository.save(vacacion);
    }
    return null;
  }
  async getDiasTomados(idpersonal: number): Promise<number> {
    const { sum } = await this.vacacionesRepository
      .createQueryBuilder('vacacion')
      .select('SUM(vacacion.cantidad_dias)', 'sum')
      .where('vacacion.idpersonal = :idpersonal', { idpersonal })
      .andWhere('vacacion.estado = :estado', { estado: 'activo' })
      .andWhere('vacacion.tipo_solicitud IN (:...tipos)', { tipos: ['Vacación', 'A cuenta de vacación'] })
      .getRawOne();

    return Number(sum) || 0;
  }
}
