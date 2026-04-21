import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalService } from './personal.service';
import { PersonalController } from './personal.controller';
import { Personal } from './entities/personal.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Personal])],
    controllers: [PersonalController],
    providers: [PersonalService],
    exports: [PersonalService],
})
export class PersonalModule { }
