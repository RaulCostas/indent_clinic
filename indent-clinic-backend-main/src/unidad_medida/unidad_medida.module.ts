import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadMedidaService } from './unidad_medida.service';
import { UnidadMedidaController } from './unidad_medida.controller';
import { UnidadMedida } from './entities/unidad_medida.entity';

@Module({
    imports: [TypeOrmModule.forFeature([UnidadMedida])],
    controllers: [UnidadMedidaController],
    providers: [UnidadMedidaService],
    exports: [UnidadMedidaService],
})
export class UnidadMedidaModule { }
