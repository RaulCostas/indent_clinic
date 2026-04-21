import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateInventarioDto, UpdateInventarioDto } from './dto/create-inventario.dto';

@Controller('inventario')
export class InventarioController {
    constructor(private readonly inventarioService: InventarioService) { }

    @Post()
    create(@Body() createInventarioDto: CreateInventarioDto) {
        return this.inventarioService.create(createInventarioDto);
    }

    @Get('expiration-details')
    findExpirationDetails(@Query('status') status: string, @Query('clinicaId') clinicaId?: string) {
        return this.inventarioService.findExpiringDetails(status, clinicaId ? +clinicaId : undefined);
    }

    @Get('used-groups')
    findUsedGroups(@Query('clinicaId') clinicaId?: string) {
        return this.inventarioService.findUsedGroups(clinicaId ? +clinicaId : undefined);
    }

    @Get('used-specialties')
    findUsedSpecialties(@Query('clinicaId') clinicaId?: string, @Query('grupoId') grupoId?: string) {
        return this.inventarioService.findUsedSpecialties(
            clinicaId ? +clinicaId : undefined,
            grupoId && grupoId !== 'all' ? +grupoId : undefined
        );
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('expirationStatus') expirationStatus?: string,
        @Query('clinicaId') clinicaId?: string,
    ) {
        return this.inventarioService.findAll(search, page ? +page : 1, limit ? +limit : 10, expirationStatus, clinicaId ? +clinicaId : undefined);
    }

    @Get('alertas/bajo-stock')
    findLowStock(@Query('clinicaId') clinicaId?: string) {
        return this.inventarioService.findLowStock(clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.inventarioService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateInventarioDto: UpdateInventarioDto) {
        return this.inventarioService.update(+id, updateInventarioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.inventarioService.remove(+id);
    }
}
