import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { GrupoInventarioService } from './grupo_inventario.service';
import { CreateGrupoInventarioDto } from './dto/create-grupo_inventario.dto';
import { UpdateGrupoInventarioDto } from './dto/update-grupo_inventario.dto';

@Controller('grupo-inventario')
export class GrupoInventarioController {
  constructor(private readonly grupoInventarioService: GrupoInventarioService) { }

  @Post()
  create(@Body() createGrupoInventarioDto: CreateGrupoInventarioDto) {
    return this.grupoInventarioService.create(createGrupoInventarioDto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.grupoInventarioService.findAll(search, page ? +page : 1, limit ? +limit : 5);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.grupoInventarioService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGrupoInventarioDto: UpdateGrupoInventarioDto) {
    return this.grupoInventarioService.update(+id, updateGrupoInventarioDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.grupoInventarioService.remove(+id);
  }
}
