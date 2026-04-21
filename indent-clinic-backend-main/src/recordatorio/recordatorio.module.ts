import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordatorioService } from './recordatorio.service';
import { RecordatorioController } from './recordatorio.controller';
import { Recordatorio } from './entities/recordatorio.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Recordatorio])],
    controllers: [RecordatorioController],
    providers: [RecordatorioService],
    exports: [RecordatorioService],
})
export class RecordatorioModule { }
