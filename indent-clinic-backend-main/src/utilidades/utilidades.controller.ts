import { Controller, Get, Query } from '@nestjs/common';
import { UtilidadesService } from './utilidades.service';

@Controller('utilidades')
export class UtilidadesController {
    constructor(private readonly utilidadesService: UtilidadesService) { }

    @Get('statistics')
    getStatistics(
        @Query('year') year: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        return this.utilidadesService.getStatistics(
            year ? +year : new Date().getFullYear(),
            clinicaId
        );
    }
}
