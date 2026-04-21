import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecetaService } from './receta.service';
import { RecetaController } from './receta.controller';
import { Receta } from './entities/receta.entity';
import { RecetaDetalle } from './entities/receta-detalle.entity';
import { RecetaPdfService } from './receta-pdf.service';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { FirmasModule } from '../firmas/firmas.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Receta, RecetaDetalle]),
        ChatbotModule,
        forwardRef(() => FirmasModule)
    ],
    controllers: [RecetaController],
    providers: [RecetaService, RecetaPdfService],
})
export class RecetaModule { }
