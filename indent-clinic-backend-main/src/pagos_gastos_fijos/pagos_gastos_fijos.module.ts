import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosGastosFijosService } from './pagos_gastos_fijos.service';
import { PagosGastosFijosController } from './pagos_gastos_fijos.controller';
import { PagosGastosFijos } from './entities/pagos_gastos_fijos.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PagosGastosFijos])],
    controllers: [PagosGastosFijosController],
    providers: [PagosGastosFijosService],
})
export class PagosGastosFijosModule { }
