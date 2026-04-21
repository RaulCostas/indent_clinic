import { Controller, Get, Param } from '@nestjs/common';
import { FichaMedicaService } from './ficha_medica.service';

@Controller('ficha-medica')
export class FichaMedicaController {
    constructor(private readonly fichaMedicaService: FichaMedicaService) { }

    @Get()
    findAll() {
        return this.fichaMedicaService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.fichaMedicaService.findOne(+id);
    }
}
