import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropuestasService } from './propuestas.service';
import { PropuestasController } from './propuestas.controller';
import { Propuesta } from './entities/propuesta.entity';
import { PropuestaDetalle } from './entities/propuesta-detalle.entity';
import { ProformasModule } from '../proformas/proformas.module';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
    imports: [TypeOrmModule.forFeature([Propuesta, PropuestaDetalle]), ProformasModule, ChatbotModule],
    controllers: [PropuestasController],
    providers: [PropuestasService],
})
export class PropuestasModule { }
