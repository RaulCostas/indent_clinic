import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { LaboratoriosService } from './laboratorios.service';
import { CreateLaboratorioDto } from './dto/create-laboratorio.dto';
import { UpdateLaboratorioDto } from './dto/update-laboratorio.dto';

@Controller('laboratorios')
export class LaboratoriosController {
    constructor(private readonly laboratoriosService: LaboratoriosService) { }

    @Post()
    create(@Body() createLaboratorioDto: CreateLaboratorioDto) {
        return this.laboratoriosService.create(createLaboratorioDto);
    }

    @Post('seed')
    seed() {
        return this.laboratoriosService.seed();
    }

    @Get()
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string,
    ) {
        return this.laboratoriosService.findAll(page, limit, search);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.laboratoriosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLaboratorioDto: UpdateLaboratorioDto) {
        return this.laboratoriosService.update(+id, updateLaboratorioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.laboratoriosService.remove(+id);
    }
}
