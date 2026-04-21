import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordatorioTratamientoService } from './recordatorio-tratamiento.service';
import { RecordatorioTratamientoController } from './recordatorio-tratamiento.controller';
import { RecordatorioTratamiento } from './entities/recordatorio-tratamiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecordatorioTratamiento])],
  controllers: [RecordatorioTratamientoController],
  providers: [RecordatorioTratamientoService],
})
export class RecordatorioTratamientoModule { }
