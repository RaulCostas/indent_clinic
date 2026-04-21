import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PagosLaboratoriosService } from './pagos-laboratorios.service';
import { CreatePagoLaboratorioDto } from './dto/create-pago-laboratorio.dto';
import { UpdatePagoLaboratorioDto } from './dto/update-pago-laboratorio.dto';

@Controller('pagos-laboratorios')
export class PagosLaboratoriosController {
    constructor(private readonly pagosLaboratoriosService: PagosLaboratoriosService) { }

    @Post()
    create(@Body() createDto: CreatePagoLaboratorioDto) {
        return this.pagosLaboratoriosService.create(createDto);
    }

    @Get()
    findAll(
        @Query('fecha') fecha?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        return this.pagosLaboratoriosService.findAll(fecha, startDate, endDate, clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pagosLaboratoriosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdatePagoLaboratorioDto) {
        return this.pagosLaboratoriosService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pagosLaboratoriosService.remove(+id);
    }
}
