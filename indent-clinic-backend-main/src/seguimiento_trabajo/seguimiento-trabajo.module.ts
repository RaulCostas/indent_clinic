import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeguimientoTrabajoService } from './seguimiento-trabajo.service';
import { SeguimientoTrabajoController } from './seguimiento-trabajo.controller';
import { SeguimientoTrabajo } from './entities/seguimiento-trabajo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SeguimientoTrabajo])],
    controllers: [SeguimientoTrabajoController],
    providers: [SeguimientoTrabajoService],
})
export class SeguimientoTrabajoModule { }
