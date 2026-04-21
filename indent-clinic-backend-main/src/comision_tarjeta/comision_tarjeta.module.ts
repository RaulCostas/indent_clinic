import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComisionTarjetaService } from './comision_tarjeta.service';
import { ComisionTarjetaController } from './comision_tarjeta.controller';
import { ComisionTarjeta } from './entities/comision_tarjeta.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ComisionTarjeta])],
    controllers: [ComisionTarjetaController],
    providers: [ComisionTarjetaService],
})
export class ComisionTarjetaModule { }
