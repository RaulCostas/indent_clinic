import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { PacientesService } from './pacientes.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';

@Controller('pacientes')
export class PacientesController {
    constructor(private readonly pacientesService: PacientesService) { }

    @Post()
    create(@Body() createPacienteDto: CreatePacienteDto, @Req() req: any) {
        if (req.user && req.user.id) {
            createPacienteDto.usuarioId = req.user.id;
            if (createPacienteDto.fichaMedica) {
                createPacienteDto.fichaMedica.usuarioId = req.user.id;
            }
        }
        return this.pacientesService.create(createPacienteDto);
    }


    @Get('pendientes')
    findPendientes(
        @Query('tab') tab: 'agendados' | 'no_agendados',
        @Query('doctorId') doctorId?: string,
        @Query('especialidadId') especialidadId?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = ''
    ) {
        return this.pacientesService.findPendientes(
            tab, 
            doctorId ? +doctorId : undefined, 
            especialidadId ? +especialidadId : undefined,
            +page,
            +limit,
            search
        );
    }

    @Get('no-registrados')
    findNoRegistrados(@Query('clinicaId') clinicaId?: string) {
        return this.pacientesService.findNoRegistrados(clinicaId ? +clinicaId : undefined);
    }

    @Get('dashboard-stats')
    getDashboardStats(@Query('clinicaId') clinicaId?: string) {
        return this.pacientesService.getDashboardStats(clinicaId ? +clinicaId : undefined);
    }

    @Get('statistics')
    getStatistics(@Query('year') year: string) {
        return this.pacientesService.getStatistics(year ? +year : new Date().getFullYear());
    }


    @Get()
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search: string = '',
        @Query('clinicaId') clinicaId?: string,
        @Query('estado') estado?: string,
        @Query('minimal') minimal?: string,
    ) {
        return this.pacientesService.findAll(Number(page), Number(limit), search, clinicaId ? +clinicaId : undefined, estado, minimal === 'true');
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pacientesService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePacienteDto: UpdatePacienteDto) {
        return this.pacientesService.update(+id, updatePacienteDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pacientesService.remove(+id);
    }
}