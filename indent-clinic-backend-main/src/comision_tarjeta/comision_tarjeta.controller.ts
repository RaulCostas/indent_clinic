import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComisionTarjetaService } from './comision_tarjeta.service';
import { CreateComisionTarjetaDto } from './dto/create-comision_tarjeta.dto';
import { UpdateComisionTarjetaDto } from './dto/update-comision_tarjeta.dto';

@Controller('comision-tarjeta')
export class ComisionTarjetaController {
    constructor(private readonly comisionTarjetaService: ComisionTarjetaService) { }

    @Post()
    create(@Body() createComisionTarjetaDto: CreateComisionTarjetaDto) {
        return this.comisionTarjetaService.create(createComisionTarjetaDto);
    }

    @Get()
    findAll() {
        return this.comisionTarjetaService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.comisionTarjetaService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateComisionTarjetaDto: UpdateComisionTarjetaDto) {
        return this.comisionTarjetaService.update(+id, updateComisionTarjetaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.comisionTarjetaService.remove(+id);
    }
}
