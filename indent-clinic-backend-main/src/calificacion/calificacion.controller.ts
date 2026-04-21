import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CalificacionService } from './calificacion.service';
import { CreateCalificacionDto } from './dto/create-calificacion.dto';
import { UpdateCalificacionDto } from './dto/update-calificacion.dto';

@Controller('calificacion')
export class CalificacionController {
    constructor(private readonly calificacionService: CalificacionService) { }

    @Post()
    create(@Body() createCalificacionDto: CreateCalificacionDto) {
        return this.calificacionService.create(createCalificacionDto);
    }

    @Get()
    findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = '',
        @Query('clinicaId') clinicaId?: string,
    ) {
        return this.calificacionService.findAll(+page, +limit, search, clinicaId ? +clinicaId : undefined);
    }

    @Get('personal/:personalId')
    findByPersonal(@Param('personalId') personalId: string) {
        return this.calificacionService.findByPersonal(+personalId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.calificacionService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCalificacionDto: UpdateCalificacionDto) {
        return this.calificacionService.update(+id, updateCalificacionDto);
    }

    @Get('estadisticas/:personalId/:year/:month')
    getEstadisticas(
        @Param('personalId') personalId: string,
        @Param('year') year: string,
        @Param('month') month: string
    ) {
        return this.calificacionService.getEstadisticas(+personalId, +year, +month);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.calificacionService.remove(+id);
    }
}
