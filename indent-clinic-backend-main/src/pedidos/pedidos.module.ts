import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { Pedidos } from './entities/pedidos.entity';
import { PedidosDetalle } from './entities/pedidos-detalle.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Pedidos, PedidosDetalle])],
    controllers: [PedidosController],
    providers: [PedidosService],
})
export class PedidosModule { }
