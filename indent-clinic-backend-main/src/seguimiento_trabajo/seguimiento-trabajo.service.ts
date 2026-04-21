import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeguimientoTrabajo } from './entities/seguimiento-trabajo.entity';
import { CreateSeguimientoTrabajoDto } from './dto/create-seguimiento-trabajo.dto';
import { UpdateSeguimientoTrabajoDto } from './dto/update-seguimiento-trabajo.dto';

@Injectable()
export class SeguimientoTrabajoService {
    constructor(
        @InjectRepository(SeguimientoTrabajo)
        private seguimientoRepository: Repository<SeguimientoTrabajo>,
    ) { }

    create(createDto: CreateSeguimientoTrabajoDto) {
        return this.seguimientoRepository.save(createDto);
    }

    findAll(trabajoId?: number) {
        if (trabajoId) {
            return this.seguimientoRepository.find({
                where: { trabajoLaboratorioId: trabajoId },
                order: { fecha: 'DESC', id: 'DESC' }
            });
        }
        return this.seguimientoRepository.find();
    }

    findOne(id: number) {
        return this.seguimientoRepository.findOneBy({ id });
    }

    update(id: number, updateDto: UpdateSeguimientoTrabajoDto) {
        return this.seguimientoRepository.update(id, updateDto);
    }

    remove(id: number) {
        return this.seguimientoRepository.delete(id);
    }
}
