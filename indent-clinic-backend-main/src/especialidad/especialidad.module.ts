import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspecialidadService } from './especialidad.service';
import { EspecialidadController } from './especialidad.controller';
import { Especialidad } from './entities/especialidad.entity';

import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Especialidad, HistoriaClinica])],
    controllers: [EspecialidadController],
    providers: [EspecialidadService],
    exports: [EspecialidadService],
})
export class EspecialidadModule { }
