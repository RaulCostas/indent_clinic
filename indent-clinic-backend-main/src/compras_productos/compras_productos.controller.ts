import { Controller, Get, Post, Body, Param, Delete, Query, ParseIntPipe, ParseBoolPipe, Patch } from '@nestjs/common';
import { ComprasProductosService } from './compras_productos.service';
import { CreateCompraProductoDto } from './dto/create-compra-producto.dto';

@Controller('compras-productos')
export class ComprasProductosController {
    constructor(private readonly comprasService: ComprasProductosService) { }

    @Post()
    create(@Body() createDto: CreateCompraProductoDto) {
        return this.comprasService.create(createDto);
    }

    @Get()
    findAll(
        @Query('clinicaId') clinicaId?: string,
        @Query('pagada') pagada?: string,
    ) {
        const cId = clinicaId ? parseInt(clinicaId) : undefined;
        const isPagada = pagada === 'true' ? true : pagada === 'false' ? false : undefined;
        return this.comprasService.findAll(cId, isPagada);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.comprasService.findOne(id);
    }

    @Post(':id/pagar')
    registrarPago(
        @Param('id', ParseIntPipe) id: number,
        @Body('formaPagoId', ParseIntPipe) formaPagoId: number,
    ) {
        return this.comprasService.registrarPago(id, formaPagoId);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.comprasService.remove(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: CreateCompraProductoDto) {
        return this.comprasService.update(id, updateDto);
    }
}
