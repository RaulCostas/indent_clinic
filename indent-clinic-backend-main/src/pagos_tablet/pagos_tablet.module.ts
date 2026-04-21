import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosTabletService } from './pagos_tablet.service';
import { PagosTabletController } from './pagos_tablet.controller';
import { PagoTablet } from './entities/pago_tablet.entity';
import { Pago } from '../pagos/entities/pago.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PagoTablet, Pago])],
  controllers: [PagosTabletController],
  providers: [PagosTabletService],
})
export class PagosTabletModule {}
