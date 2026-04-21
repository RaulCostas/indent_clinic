import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EgresoInventarioService } from './egreso_inventario.service';
import { EgresoInventarioController } from './egreso_inventario.controller';
import { EgresoInventario } from './entities/egreso_inventario.entity';
import { Inventario } from '../inventario/entities/inventario.entity';

@Module({
    imports: [TypeOrmModule.forFeature([EgresoInventario, Inventario])],
    controllers: [EgresoInventarioController],
    providers: [EgresoInventarioService],
})
export class EgresoInventarioModule { }
