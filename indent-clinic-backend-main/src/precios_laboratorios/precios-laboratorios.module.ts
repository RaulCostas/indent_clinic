import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreciosLaboratoriosService } from './precios-laboratorios.service';
import { PreciosLaboratoriosController } from './precios-laboratorios.controller';
import { PrecioLaboratorio } from './entities/precio-laboratorio.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PrecioLaboratorio])],
    controllers: [PreciosLaboratoriosController],
    providers: [PreciosLaboratoriosService],
})
export class PreciosLaboratoriosModule { }
