import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RecordatorioTratamientoService } from './recordatorio-tratamiento.service';
import { CreateRecordatorioTratamientoDto } from './dto/create-recordatorio-tratamiento.dto';

@Controller('recordatorio-tratamiento')
export class RecordatorioTratamientoController {
    constructor(private readonly recordatorioService: RecordatorioTratamientoService) { }

    @Post()
    create(@Body() createDto: CreateRecordatorioTratamientoDto) {
        return this.recordatorioService.create(createDto);
    }

    @Get()
    findAll() {
        return this.recordatorioService.findAll();
    }

    @Get('pendientes')
    findPending() {
        return this.recordatorioService.findPending();
    }

    @Get('historia/:id')
    findByHistoriaClinica(@Param('id') id: string) {
        return this.recordatorioService.findByHistoriaClinicaId(+id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.recordatorioService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: any) {
        return this.recordatorioService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.recordatorioService.remove(+id);
    }
}
