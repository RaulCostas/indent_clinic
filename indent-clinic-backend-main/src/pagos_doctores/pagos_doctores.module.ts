import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosDoctoresService } from './pagos_doctores.service';
import { PagosDoctoresController } from './pagos_doctores.controller';
import { PagosDoctores } from './entities/pagos_doctores.entity';
import { PagosDetalleDoctores } from './entities/pagos-detalle-doctores.entity';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { RecetaPdfService } from '../receta/receta-pdf.service';
import { FirmasModule } from '../firmas/firmas.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([PagosDoctores, PagosDetalleDoctores]),
        ChatbotModule,
        FirmasModule,
    ],
    controllers: [PagosDoctoresController],
    providers: [PagosDoctoresService, RecetaPdfService],
})
export class PagosDoctoresModule { }
