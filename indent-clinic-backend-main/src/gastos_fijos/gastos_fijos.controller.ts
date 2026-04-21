import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { GastosFijosService } from './gastos_fijos.service';
import { CreateGastosFijosDto } from './dto/create-gastos_fijos.dto';
import { UpdateGastosFijosDto } from './dto/update-gastos_fijos.dto';

@Controller('gastos-fijos')
export class GastosFijosController {
    constructor(private readonly gastosFijosService: GastosFijosService) { }

    @Post()
    create(@Body() createGastosFijosDto: CreateGastosFijosDto) {
        return this.gastosFijosService.create(createGastosFijosDto);
    }

    @Get()
    findAll(@Query('clinicaId') clinicaId?: string) {
        return this.gastosFijosService.findAll(clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.gastosFijosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateGastosFijosDto: UpdateGastosFijosDto) {
        return this.gastosFijosService.update(+id, updateGastosFijosDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.gastosFijosService.remove(+id);
    }
}
