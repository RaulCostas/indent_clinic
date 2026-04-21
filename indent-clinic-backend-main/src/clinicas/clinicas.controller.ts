import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Logger, Injectable } from '@nestjs/common';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { UpdateClinicaDto } from './dto/update-clinica.dto';
import { ClinicasService } from './clinicas.service';

@Controller('clinicas')
export class ClinicasController {
    constructor(private readonly clinicasService: ClinicasService) { }

    @Post()
    create(@Body() createClinicaDto: CreateClinicaDto) {
        console.log(`[ClinicasController] POST /clinicas received:`, { ...createClinicaDto, logo: createClinicaDto.logo ? 'Present (Base64)' : 'Not present' });
        return this.clinicasService.create(createClinicaDto);
    }

    @Get()
    findAll() {
        return this.clinicasService.findAll();
    }

    @Get('slug/:slug')
    findBySlug(@Param('slug') slug: string) {
        return this.clinicasService.findBySlug(slug);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.clinicasService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateClinicaDto: UpdateClinicaDto) {
        console.log(`[ClinicasController] PATCH /clinicas/${id} received:`, { ...updateClinicaDto, logo: updateClinicaDto.logo ? 'Present (Base64)' : 'Not present' });
        return this.clinicasService.update(id, updateClinicaDto);
    }

    @Post(':id/cerrar-caja')
    cerrarCaja(@Param('id', ParseIntPipe) id: number, @Body('fecha') fecha: string) {
        console.log(`[ClinicasController] POST /clinicas/${id}/cerrar-caja received:`, { fecha });
        return this.clinicasService.update(id, { fecha_cierre_caja: fecha } as any);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.clinicasService.remove(id);
    }
}
