import { Module } from '@nestjs/common';
import { GrupoInventarioService } from './grupo_inventario.service';
import { GrupoInventarioController } from './grupo_inventario.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrupoInventario } from './entities/grupo_inventario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GrupoInventario])],
  controllers: [GrupoInventarioController],
  providers: [GrupoInventarioService],
})
export class GrupoInventarioModule { }
