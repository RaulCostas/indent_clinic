import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RecordatorioService } from './recordatorio.service';
import { CreateRecordatorioDto } from './dto/create-recordatorio.dto';
import { UpdateRecordatorioDto } from './dto/update-recordatorio.dto';

@Controller('recordatorio')
export class RecordatorioController {
    constructor(private readonly recordatorioService: RecordatorioService) { }

    @Post()
    create(@Body() createDto: CreateRecordatorioDto) {
        return this.recordatorioService.create(createDto);
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('estado') estado?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.recordatorioService.findAll(search, estado, pageNum, limitNum);
    }

    @Get('activos')
    findActivos(@Query('usuarioId') usuarioId?: string) {
        return this.recordatorioService.findActivos(usuarioId ? parseInt(usuarioId) : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.recordatorioService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateRecordatorioDto) {
        return this.recordatorioService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.recordatorioService.remove(+id);
    }
}
