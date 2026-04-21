import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosPedidosService } from './pagos_pedidos.service';
import { PagosPedidosController } from './pagos_pedidos.controller';
import { PagosPedidos } from './entities/pagos_pedidos.entity';
import { Pedidos } from '../pedidos/entities/pedidos.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PagosPedidos, Pedidos])],
    controllers: [PagosPedidosController],
    providers: [PagosPedidosService],
})
export class PagosPedidosModule { }
