import { Controller, Get, Query } from '@nestjs/common';
import { PacientesDeudoresService } from './pacientes_deudores.service';

@Controller('pacientes-deudores')
export class PacientesDeudoresController {
    constructor(private readonly pacientesDeudoresService: PacientesDeudoresService) { }

    @Get('pasivos')
    getPasivos(@Query('clinicaId') clinicaId?: string) {
        return this.pacientesDeudoresService.findAll('terminado', clinicaId ? +clinicaId : undefined);
    }

    @Get('activos')
    getActivos(@Query('clinicaId') clinicaId?: string) {
        return this.pacientesDeudoresService.findAll('no terminado', clinicaId ? +clinicaId : undefined);
    }
}
