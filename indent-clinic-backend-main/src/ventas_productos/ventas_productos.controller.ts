import { Controller, Get, Post, Body, Query, ParseIntPipe, Param, Delete, Patch } from '@nestjs/common';
import { VentasProductosService } from './ventas_productos.service';
import { CreateVentaProductoDto } from './dto/create-venta-producto.dto';

@Controller('ventas-productos')
export class VentasProductosController {
    constructor(private readonly ventasService: VentasProductosService) {}

    @Post()
    async create(@Body() createDto: CreateVentaProductoDto) {
        return await this.ventasService.createVenta(createDto);
    }

    @Get()
    async findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('search') search?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('clinicaId') clinicaId?: string,
    ) {
        return await this.ventasService.findAllVentas(
            Number(page),
            Number(limit),
            search,
            startDate,
            endDate,
            clinicaId ? +clinicaId : undefined
        );
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return await this.ventasService.findOneVenta(+id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateDto: CreateVentaProductoDto) {
        return await this.ventasService.updateVenta(+id, updateDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return await this.ventasService.removeVenta(+id);
    }

    @Get('comisiones')
    async getComisiones(
        @Query('year', ParseIntPipe) year: number,
        @Query('month', ParseIntPipe) month: number,
        @Query('clinicaId') clinicaId?: string,
        @Query('personalId') personalId?: string,
    ) {
        return await this.ventasService.getComisionesReport(
            year, 
            month, 
            clinicaId ? +clinicaId : undefined,
            personalId ? +personalId : undefined
        );
    }

    @Post('comisiones/pagar')
    async pagarComisiones(@Body() body: { personalId: number; year: number; month: number; formaPagoId: number; total: number; clinicaId: number }) {
        return await this.ventasService.pagarComisiones(body);
    }

    @Post('compra')
    async registrarCompra(
        @Body() body: { 
            productoId: number; 
            cantidad: number; 
            costoTotal: number; 
            clinicaId: number; 
            formaPagoId: number;
            numero_lote?: string;
            fecha_vencimiento?: string;
        }
    ) {
        return await this.ventasService.registrarCompra(body);
    }
}
