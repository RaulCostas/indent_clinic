import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SeguimientoTrabajoService } from './seguimiento-trabajo.service';
import { CreateSeguimientoTrabajoDto } from './dto/create-seguimiento-trabajo.dto';
import { UpdateSeguimientoTrabajoDto } from './dto/update-seguimiento-trabajo.dto';

@Controller('seguimiento-trabajo')
export class SeguimientoTrabajoController {
    constructor(private readonly seguimientoService: SeguimientoTrabajoService) { }

    @Post()
    create(@Body() createDto: CreateSeguimientoTrabajoDto) {
        return this.seguimientoService.create(createDto);
    }

    @Get()
    findAll(@Query('trabajoId') trabajoId?: string) {
        return this.seguimientoService.findAll(trabajoId ? +trabajoId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.seguimientoService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateSeguimientoTrabajoDto) {
        return this.seguimientoService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.seguimientoService.remove(+id);
    }
}
