import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PropuestasService } from './propuestas.service';
import { CreatePropuestaDto } from './dto/create-propuesta.dto';
import { UpdatePropuestaDto } from './dto/update-propuesta.dto';

@Controller('propuestas')
export class PropuestasController {
    constructor(private readonly propuestasService: PropuestasService) { }

    @Post()
    create(@Body() createPropuestaDto: CreatePropuestaDto) {
        return this.propuestasService.create(createPropuestaDto);
    }

    @Post(':id/convertir')
    convertToProforma(
        @Param('id') id: string,
        @Body() body: { letra: string, usuarioId: number }
    ) {
        return this.propuestasService.convertToProforma(+id, body.letra, body.usuarioId);
    }

    @Get()
    findAll() {
        return this.propuestasService.findAll();
    }

    @Get('paciente/:id')
    findAllByPaciente(@Param('id') id: string) {
        return this.propuestasService.findAllByPaciente(+id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.propuestasService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePropuestaDto: UpdatePropuestaDto) {
        return this.propuestasService.update(+id, updatePropuestaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.propuestasService.remove(+id);
    }
}
