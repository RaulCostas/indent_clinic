import { Controller, Get, Post, Body, Param, Delete, Patch, Query } from '@nestjs/common';
import { PagosGastosFijosService } from './pagos_gastos_fijos.service';
import { CreatePagosGastosFijosDto } from './dto/create-pagos_gastos_fijos.dto';

@Controller('pagos-gastos-fijos')
export class PagosGastosFijosController {
    constructor(private readonly pagosService: PagosGastosFijosService) { }

    @Post()
    create(@Body() createDto: CreatePagosGastosFijosDto) {
        return this.pagosService.create(createDto);
    }

    @Get()
    findAll(
        @Query('fecha') fecha?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        return this.pagosService.findAll(fecha, startDate, endDate, clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pagosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: CreatePagosGastosFijosDto) {
        return this.pagosService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pagosService.remove(+id);
    }
}
