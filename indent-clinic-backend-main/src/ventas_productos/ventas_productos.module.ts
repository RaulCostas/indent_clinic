import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasProductosService } from './ventas_productos.service';
import { VentasProductosController } from './ventas_productos.controller';
import { VentaProducto } from './entities/venta-producto.entity';
import { VentaProductoDetalle } from './entities/venta-producto-detalle.entity';
import { VentaProductoDetalleLote } from './entities/venta-producto-detalle-lote.entity';
import { ProductoComercial } from '../productos_comerciales/entities/producto_comercial.entity';
import { LoteProducto } from '../productos_comerciales/entities/lote-producto.entity';
import { OtrosIngresosModule } from '../otros-ingresos/otros-ingresos.module';
import { EgresosModule } from '../egresos/egresos.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            VentaProducto, 
            VentaProductoDetalle, 
            ProductoComercial, 
            LoteProducto, 
            VentaProductoDetalleLote
        ]),
        OtrosIngresosModule,
        EgresosModule
    ],
    controllers: [VentasProductosController],
    providers: [VentasProductosService],
    exports: [VentasProductosService]
})
export class VentasProductosModule {}
