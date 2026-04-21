import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CubetasService } from './cubetas.service';
import { CreateCubetaDto } from './dto/create-cubeta.dto';
import { UpdateCubetaDto } from './dto/update-cubeta.dto';

@Controller('cubetas')
export class CubetasController {
    constructor(private readonly cubetasService: CubetasService) { }

    @Post()
    create(@Body() createDto: CreateCubetaDto) {
        return this.cubetasService.create(createDto);
    }

    @Get()
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('dentro_fuera') dentro_fuera: string = '',
        @Query('clinicaId') clinicaId?: number,
    ) {
        return this.cubetasService.findAll(Number(page), Number(limit), search, dentro_fuera, clinicaId ? Number(clinicaId) : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.cubetasService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateCubetaDto) {
        return this.cubetasService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.cubetasService.remove(+id);
    }

    @Post('admin/reset-all')
    resetAll() {
        return this.cubetasService.resetAll();
    }
}
