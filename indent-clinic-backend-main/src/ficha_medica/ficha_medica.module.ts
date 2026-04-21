import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FichaMedicaService } from './ficha_medica.service';
import { FichaMedicaController } from './ficha_medica.controller';
import { FichaMedica } from './entities/ficha_medica.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FichaMedica])],
    controllers: [FichaMedicaController],
    providers: [FichaMedicaService],
    exports: [FichaMedicaService],
})
export class FichaMedicaModule { }
