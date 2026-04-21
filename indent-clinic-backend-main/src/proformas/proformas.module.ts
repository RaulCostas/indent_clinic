import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProformasService } from './proformas.service';
import { ProformasController } from './proformas.controller';
import { Proforma } from './entities/proforma.entity';
import { ProformaDetalle } from './entities/proforma-detalle.entity';
import { UsersModule } from '../users/users.module';
import { ChatbotModule } from '../chatbot/chatbot.module';

import { ProformaImagen } from './entities/proforma-imagen.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proforma, ProformaDetalle, ProformaImagen]),
    UsersModule,
    forwardRef(() => ChatbotModule)
  ],
  controllers: [ProformasController],
  providers: [ProformasService],
  exports: [ProformasService],
})
export class ProformasModule { }
