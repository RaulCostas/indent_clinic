import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PacientesDeudoresService } from './pacientes_deudores.service';
import { PacientesDeudoresController } from './pacientes_deudores.controller';
import { Proforma } from '../proformas/entities/proforma.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Proforma])],
    controllers: [PacientesDeudoresController],
    providers: [PacientesDeudoresService],
})
export class PacientesDeudoresModule { }
