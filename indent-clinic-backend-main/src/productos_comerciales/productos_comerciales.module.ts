import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductosComercialesService } from './productos_comerciales.service';
import { ProductosComercialesController } from './productos_comerciales.controller';
import { ProductoComercial } from './entities/producto_comercial.entity';
import { LoteProducto } from './entities/lote-producto.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ProductoComercial, LoteProducto])],
    controllers: [ProductosComercialesController],
    providers: [ProductosComercialesService],
    exports: [ProductosComercialesService]
})
export class ProductosComercialesModule {}
