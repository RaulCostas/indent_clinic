import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { PagosPedidosService } from './pagos_pedidos.service';
import { CreatePagosPedidosDto } from './dto/create-pagos_pedidos.dto';

@Controller('pagos-pedidos')
export class PagosPedidosController {
    constructor(private readonly pagosPedidosService: PagosPedidosService) { }

    @Post()
    create(@Body() createDto: CreatePagosPedidosDto) {
        return this.pagosPedidosService.create(createDto);
    }

    @Get()
    findAll(
        @Query('fecha') fecha?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        return this.pagosPedidosService.findAll(fecha, startDate, endDate, clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pagosPedidosService.findOne(+id);
    }

    @Get('pedido/:idPedido')
    findByPedido(@Param('idPedido') idPedido: string) {
        return this.pagosPedidosService.findByPedido(+idPedido);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateDto: any) {
        return this.pagosPedidosService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pagosPedidosService.remove(+id);
    }
}
