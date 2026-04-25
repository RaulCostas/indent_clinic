import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';

@Controller('agenda')
export class AgendaController {
    constructor(private readonly agendaService: AgendaService) { }

    @Post()
    async create(@Body() createDto: CreateAgendaDto) {
        try {
            // Real database save:
            return await this.agendaService.create(createDto);
        } catch (e) {
            console.error('Controller caught error:', e);
            return {
                error: true,
                message: e.message,
                details: e.detail || e.stack
            };
        }
    }

    @Post('recordatorios-manana')
    async enviarRecordatoriosManana(
        @Body('clinicaId') clinicaId?: number,
        @Body('instance') instance?: number
    ) {
        return await this.agendaService.enviarRecordatoriosManana(clinicaId, instance);
    }

    @Post('recordatorio-individual')
    async enviarRecordatorioIndividual(
        @Body('agendaId') agendaId: number,
        @Body('instance') instance?: number
    ) {
        return await this.agendaService.enviarRecordatorioIndividual(agendaId, instance);
    }

    @Get('estado-recordatorios-manana')
    async estadoRecordatoriosManana(@Query('clinicaId') clinicaId?: string) {
        return await this.agendaService.estadoRecordatoriosManana(clinicaId ? +clinicaId : undefined);
    }

    @Get()
    findAll(
        @Query('date') date?: string,
        @Query('fechaInicio') fechaInicio?: string,
        @Query('fechaFinal') fechaFinal?: string,
        @Query('pacienteId') pacienteId?: string,
        @Query('usuarioId') usuarioId?: string,
        @Query('clinicaId') clinicaId?: string,
        @Query('doctorId') doctorId?: string,
    ) {
        return this.agendaService.findAll(
            date, 
            fechaInicio, 
            fechaFinal, 
            pacienteId ? +pacienteId : undefined, 
            usuarioId ? +usuarioId : undefined, 
            clinicaId ? +clinicaId : undefined,
            doctorId ? +doctorId : undefined
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.agendaService.findOne(+id);
    }

    @Get('paciente/:id')
    findAllByPaciente(@Param('id') id: string) {
        return this.agendaService.findAllByPaciente(+id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateDto: UpdateAgendaDto) {
        try {
            return await this.agendaService.update(+id, updateDto);
        } catch (e) {
            console.error(`Controller caught error updating agenda #${id}:`, e);
            return {
                error: true,
                message: e.message,
                details: e.detail || e.stack
            };
        }
    }

    @Delete('all/records')
    deleteAll() {
        return this.agendaService.deleteAll();
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Query('userId') userId: string) {
        return this.agendaService.remove(+id, +userId);
    }
}
