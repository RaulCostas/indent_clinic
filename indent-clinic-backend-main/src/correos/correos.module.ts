import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Correo } from './entities/correo.entity';
import { CorreosService } from './correos.service';
import { CorreosController } from './correos.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Correo])],
    controllers: [CorreosController],
    providers: [CorreosService],
})
export class CorreosModule { }
