import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicasService } from './clinicas.service';
import { ClinicasController } from './clinicas.controller';
import { Clinica } from './entities/clinica.entity';
import { Sucursal } from './entities/sucursal.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Clinica, Sucursal])],
    controllers: [ClinicasController],
    providers: [ClinicasService],
    exports: [ClinicasService],
})
export class ClinicasModule { }
