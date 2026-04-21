import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirmasService } from './firmas.service';
import { FirmasController } from './firmas.controller';
import { FirmaDigital } from './entities/firma-digital.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FirmaDigital])],
    controllers: [FirmasController],
    providers: [FirmasService],
    exports: [FirmasService],
})
export class FirmasModule { }
