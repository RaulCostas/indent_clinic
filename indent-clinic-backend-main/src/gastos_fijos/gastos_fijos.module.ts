import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GastosFijosService } from './gastos_fijos.service';
import { GastosFijosController } from './gastos_fijos.controller';
import { GastosFijos } from './entities/gastos_fijos.entity';

@Module({
    imports: [TypeOrmModule.forFeature([GastosFijos])],
    controllers: [GastosFijosController],
    providers: [GastosFijosService],
})
export class GastosFijosModule { }
