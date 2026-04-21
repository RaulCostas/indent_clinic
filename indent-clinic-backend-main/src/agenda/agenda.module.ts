import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';
import { Agenda } from './entities/agenda.entity';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { PersonalModule } from '../personal/personal.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Agenda]),
        forwardRef(() => ChatbotModule),
        PersonalModule,
    ],
    controllers: [AgendaController],
    providers: [AgendaService],
    exports: [AgendaService],
})
export class AgendaModule { }
