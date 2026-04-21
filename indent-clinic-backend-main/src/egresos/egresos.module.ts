import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EgresosService } from './egresos.service';
import { EgresosController } from './egresos.controller';
import { Egreso } from './entities/egreso.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Egreso])],
    controllers: [EgresosController],
    providers: [EgresosService],
    exports: [EgresosService],
})
export class EgresosModule { }
