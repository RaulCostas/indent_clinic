import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PacientesService } from './pacientes.service';
import { PacientesController } from './pacientes.controller';
import { Paciente } from './entities/paciente.entity';
import { FichaMedica } from '../ficha_medica/entities/ficha_medica.entity';

import { StorageModule } from '../common/storage/storage.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Paciente, FichaMedica]),
        StorageModule
    ],
    controllers: [PacientesController],
    providers: [PacientesService],
    exports: [PacientesService],
})
export class PacientesModule { }
