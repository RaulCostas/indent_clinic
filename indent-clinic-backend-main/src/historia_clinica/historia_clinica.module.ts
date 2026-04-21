import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinicaService } from './historia_clinica.service';
import { HistoriaClinicaController } from './historia_clinica.controller';
import { HistoriaClinica } from './entities/historia_clinica.entity';
import { HistoriaClinicaPdfService } from './historia-clinica-pdf.service';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { Pago } from '../pagos/entities/pago.entity';
import { TrabajoLaboratorio } from '../trabajos_laboratorios/entities/trabajo_laboratorio.entity';

import { PagosDetalleDoctores } from '../pagos_doctores/entities/pagos-detalle-doctores.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([HistoriaClinica, Pago, TrabajoLaboratorio, PagosDetalleDoctores]),
        forwardRef(() => ChatbotModule)
    ],
    controllers: [HistoriaClinicaController],
    providers: [HistoriaClinicaService, HistoriaClinicaPdfService],
    exports: [HistoriaClinicaService]
})
export class HistoriaClinicaModule { }
