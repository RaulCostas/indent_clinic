import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtrosIngresosService } from './otros-ingresos.service';
import { OtrosIngresosController } from './otros-ingresos.controller';
import { OtrosIngresos } from './entities/otros-ingresos.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OtrosIngresos])],
  controllers: [OtrosIngresosController],
  providers: [OtrosIngresosService],
  exports: [OtrosIngresosService],
})
export class OtrosIngresosModule { }
