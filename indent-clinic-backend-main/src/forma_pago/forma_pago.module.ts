import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormaPagoService } from './forma_pago.service';
import { FormaPagoController } from './forma_pago.controller';
import { FormaPago } from './entities/forma_pago.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FormaPago])],
    controllers: [FormaPagoController],
    providers: [FormaPagoService],
})
export class FormaPagoModule { }
