import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprasProductosService } from './compras_productos.service';
import { ComprasProductosController } from './compras_productos.controller';
import { CompraProducto } from './entities/compra-producto.entity';
import { CompraProductoDetalle } from './entities/compra-producto-detalle.entity';
import { ProductoComercial } from '../productos_comerciales/entities/producto_comercial.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { LoteProducto } from '../productos_comerciales/entities/lote-producto.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CompraProducto,
            CompraProductoDetalle,
            ProductoComercial,
            Proveedor,
            LoteProducto
        ])
    ],
    controllers: [ComprasProductosController],
    providers: [ComprasProductosService],
    exports: [ComprasProductosService]
})
export class ComprasProductosModule { }
