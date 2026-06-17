import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirmasService } from './firmas.service';
import { FirmasController } from './firmas.controller';
import { FirmaDigital } from './entities/firma-digital.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { Receta } from '../receta/entities/receta.entity';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FirmaDigital, Paciente, Proforma, Receta, HistoriaClinica])],
    controllers: [FirmasController],
    providers: [FirmasService],
    exports: [FirmasService],
})
export class FirmasModule { }
