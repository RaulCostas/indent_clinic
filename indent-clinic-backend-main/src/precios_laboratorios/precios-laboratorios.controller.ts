import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PreciosLaboratoriosService } from './precios-laboratorios.service';
import { CreatePrecioLaboratorioDto } from './dto/create-precio-laboratorio.dto';
import { UpdatePrecioLaboratorioDto } from './dto/update-precio-laboratorio.dto';

@Controller('precios-laboratorios')
export class PreciosLaboratoriosController {
    constructor(private readonly preciosLaboratoriosService: PreciosLaboratoriosService) { }

    @Post()
    create(@Body() createPrecioLaboratorioDto: CreatePrecioLaboratorioDto) {
        return this.preciosLaboratoriosService.create(createPrecioLaboratorioDto);
    }

    @Get()
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string,
        @Query('laboratorioId') laboratorioId?: number,
    ) {
        return this.preciosLaboratoriosService.findAll(Number(page), Number(limit), search, laboratorioId ? Number(laboratorioId) : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.preciosLaboratoriosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePrecioLaboratorioDto: UpdatePrecioLaboratorioDto) {
        return this.preciosLaboratoriosService.update(+id, updatePrecioLaboratorioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.preciosLaboratoriosService.remove(+id);
    }
}
