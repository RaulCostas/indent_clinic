import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FichaMedica } from './entities/ficha_medica.entity';

@Injectable()
export class FichaMedicaService {
    constructor(
        @InjectRepository(FichaMedica)
        private readonly fichaMedicaRepository: Repository<FichaMedica>,
    ) { }

    findAll() {
        return this.fichaMedicaRepository.find();
    }

    findOne(id: number) {
        return this.fichaMedicaRepository.findOneBy({ id });
    }
}
