import { Controller, Get, Post, Body, Param, Put, Delete, Patch, Query } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedidos.dto';

@Controller('pedidos')
export class PedidosController {
    constructor(private readonly pedidosService: PedidosService) { }

    @Post()
    create(@Body() createPedidoDto: CreatePedidoDto) {
        return this.pedidosService.create(createPedidoDto);
    }

    @Get()
    findAll(@Query('clinicaId') clinicaId?: string) {
        return this.pedidosService.findAll(clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pedidosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePedidoDto: any) {
        // Casting any for now as UpdateDto might need specific structure matching Create
        return this.pedidosService.update(+id, updatePedidoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pedidosService.remove(+id);
    }

    @Get('vencimientos/:inventarioId')
    findExpirationDates(@Param('inventarioId') inventarioId: string) {
        return this.pedidosService.findExpirationDates(+inventarioId);
    }

    @Patch(':id/pay')
    updatePaymentStatus(@Param('id') id: string, @Body('pagado') pagado: boolean) {
        return this.pedidosService.updatePaymentStatus(+id, pagado);
    }

    @Get('admin/reset-payments')
    resetPayments() {
        return this.pedidosService.resetAllPayments();
    }

    @Get('history/:inventoryId')
    getProductHistory(
        @Param('inventoryId') inventoryId: string,
        @Query('year') year: string
    ) {
        return this.pedidosService.getProductHistory(+inventoryId, year ? +year : new Date().getFullYear());
    }
}
