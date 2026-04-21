import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { OtrosIngresosService } from './otros-ingresos.service';
import { CreateOtrosIngresosDto } from './dto/create-otros-ingresos.dto';
import { UpdateOtrosIngresosDto } from './dto/update-otros-ingresos.dto';

@Controller('otros-ingresos')
export class OtrosIngresosController {
  constructor(private readonly otrosIngresosService: OtrosIngresosService) {}

  @Post()
  create(@Body() createOtrosIngresosDto: CreateOtrosIngresosDto) {
    return this.otrosIngresosService.create(createOtrosIngresosDto);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('fecha') fecha?: string,
    @Query('search') search?: string,
    @Query('clinicaId') clinicaId?: number,
  ) {
    return this.otrosIngresosService.findAll(page, limit, startDate, endDate, fecha, search, clinicaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.otrosIngresosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOtrosIngresosDto: UpdateOtrosIngresosDto) {
    return this.otrosIngresosService.update(+id, updateOtrosIngresosDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.otrosIngresosService.remove(+id);
  }
}
