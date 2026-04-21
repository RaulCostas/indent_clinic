import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EspecialidadService } from './especialidad.service';
import { CreateEspecialidadDto } from './dto/create-especialidad.dto';
import { UpdateEspecialidadDto } from './dto/update-especialidad.dto';

@Controller('especialidad')
export class EspecialidadController {
    constructor(private readonly especialidadService: EspecialidadService) { }

    @Post()
    create(@Body() createEspecialidadDto: CreateEspecialidadDto) {
        return this.especialidadService.create(createEspecialidadDto);
    }

    @Get('statistics')
    getStatistics(
        @Query('year') year: string,
        @Query('month') month: string,
        @Query('status') status: string,
        @Query('clinicaId') clinicaId: string,
    ) {
        return this.especialidadService.getStatistics(
            year ? +year : new Date().getFullYear(),
            month ? +month : new Date().getMonth() + 1,
            status,
            clinicaId ? +clinicaId : undefined
        );
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.especialidadService.findAll(
            search,
            page ? +page : 1,
            limit ? +limit : 5,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.especialidadService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEspecialidadDto: UpdateEspecialidadDto) {
        return this.especialidadService.update(+id, updateEspecialidadDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.especialidadService.remove(+id);
    }
}
