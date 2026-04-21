import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { VacacionesService } from './vacaciones.service';
import { CreateVacacionDto } from './dto/create-vacacion.dto';
import { UpdateVacacionDto } from './dto/update-vacacion.dto';

@Controller('vacaciones')
export class VacacionesController {
  constructor(private readonly vacacionesService: VacacionesService) { }

  @Post()
  create(@Body() createVacacionDto: CreateVacacionDto) {
    return this.vacacionesService.create(createVacacionDto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('clinicaId') clinicaId?: string,
  ) {
    return this.vacacionesService.findAll(+page, +limit, search, clinicaId ? +clinicaId : undefined);
  }

  @Get('dias-tomados/:idpersonal')
  getDiasTomados(@Param('idpersonal') idpersonal: string) {
    return this.vacacionesService.getDiasTomados(+idpersonal);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vacacionesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVacacionDto: UpdateVacacionDto) {
    return this.vacacionesService.update(+id, updateVacacionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vacacionesService.remove(+id);
  }
}
