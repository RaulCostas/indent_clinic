import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PacientesService } from './pacientes.service';
import { PacientesController } from './pacientes.controller';
import { Paciente } from './entities/paciente.entity';
import { FichaMedica } from '../ficha_medica/entities/ficha_medica.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Paciente, FichaMedica])],
    controllers: [PacientesController],
    providers: [PacientesService],
    exports: [PacientesService],
})
export class PacientesModule { }
