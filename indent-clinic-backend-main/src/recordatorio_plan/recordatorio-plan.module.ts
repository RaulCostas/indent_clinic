import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordatorioPlanService } from './recordatorio-plan.service';
import { RecordatorioPlanController } from './recordatorio-plan.controller';
import { RecordatorioPlan } from './entities/recordatorio-plan.entity';

@Module({
    imports: [TypeOrmModule.forFeature([RecordatorioPlan])],
    controllers: [RecordatorioPlanController],
    providers: [RecordatorioPlanService],
    exports: [RecordatorioPlanService]
})
export class RecordatorioPlanModule { }
