import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AgendaModule } from '../agenda/agenda.module';
import { PagosModule } from '../pagos/pagos.module';
import { ProformasModule } from '../proformas/proformas.module';
import { HistoriaClinicaModule } from '../historia_clinica/historia_clinica.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { InventarioModule } from '../inventario/inventario.module';
import { ChatbotIntento } from './entities/chatbot-intento.entity';
import { ChatbotIntentosService } from './chatbot-intentos.service';
import { ChatbotIntentosController } from './chatbot-intentos.controller';
import { ChatbotPdfService } from './chatbot-pdf.service';
import { WhatsappSession } from './entities/whatsapp-session.entity';

import { PersonalModule } from '../personal/personal.module';

import { Clinica } from '../clinicas/entities/clinica.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatbotIntento, Clinica, WhatsappSession]),
        PacientesModule,
        forwardRef(() => AgendaModule),
        PagosModule,
        forwardRef(() => ProformasModule),
        HistoriaClinicaModule,
        DoctorsModule,
        InventarioModule,
        PersonalModule
    ],
    controllers: [ChatbotController, ChatbotIntentosController],
    providers: [ChatbotService, ChatbotIntentosService, ChatbotPdfService],
    exports: [ChatbotService],
})
export class ChatbotModule { }
