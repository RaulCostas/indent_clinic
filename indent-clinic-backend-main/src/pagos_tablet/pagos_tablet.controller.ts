import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { PagosTabletService } from './pagos_tablet.service';
import { CreatePagoTabletDto } from './dto/create-pago-tablet.dto';

@Controller('pagos-tablet')
export class PagosTabletController {
  constructor(private readonly pagosTabletService: PagosTabletService) {}

  @Post()
  create(@Body() createPagoTabletDto: CreatePagoTabletDto) {
    return this.pagosTabletService.create(createPagoTabletDto);
  }

  @Get('cruce')
  cruceDiario(@Query('clinicaId') clinicaId?: string, @Query('fecha') fecha?: string) {
    return this.pagosTabletService.realizarCruceDiario(clinicaId ? +clinicaId : null, fecha);
  }
}
