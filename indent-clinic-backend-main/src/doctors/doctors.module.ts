import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from './entities/doctor.entity';
import { EspecialidadModule } from '../especialidad/especialidad.module';

import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Doctor, HistoriaClinica]),
        EspecialidadModule,
    ],
    controllers: [DoctorsController],
    providers: [DoctorsService],
    exports: [DoctorsService],
})
export class DoctorsModule { }
