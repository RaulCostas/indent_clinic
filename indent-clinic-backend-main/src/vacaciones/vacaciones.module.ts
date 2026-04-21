import { Module } from '@nestjs/common';
import { VacacionesService } from './vacaciones.service';
import { VacacionesController } from './vacaciones.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacacion } from './entities/vacacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vacacion])],
  controllers: [VacacionesController],
  providers: [VacacionesService],
})
export class VacacionesModule { }
