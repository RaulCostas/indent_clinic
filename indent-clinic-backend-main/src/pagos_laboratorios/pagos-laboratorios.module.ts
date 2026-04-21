import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosLaboratoriosService } from './pagos-laboratorios.service';
import { PagosLaboratoriosController } from './pagos-laboratorios.controller';
import { PagoLaboratorio } from './entities/pago-laboratorio.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PagoLaboratorio])],
    controllers: [PagosLaboratoriosController],
    providers: [PagosLaboratoriosService],
})
export class PagosLaboratoriosModule { }
