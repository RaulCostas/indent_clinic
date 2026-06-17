import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { UnidadMedidaService } from './unidad_medida.service';
import { CreateUnidadMedidaDto, UpdateUnidadMedidaDto } from './dto/create-unidad_medida.dto';

@Controller('unidad-medida')
export class UnidadMedidaController {
    constructor(private readonly unidadMedidaService: UnidadMedidaService) { }

    @Post()
    create(@Body() createUnidadMedidaDto: CreateUnidadMedidaDto) {
        return this.unidadMedidaService.create(createUnidadMedidaDto);
    }

    @Get()
    findAll(@Query('estado') estado?: string) {
        return this.unidadMedidaService.findAll(estado);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.unidadMedidaService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUnidadMedidaDto: UpdateUnidadMedidaDto) {
        return this.unidadMedidaService.update(+id, updateUnidadMedidaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.unidadMedidaService.remove(+id);
    }
}
