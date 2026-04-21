import { Controller, Get, Post, Body, Query, ParseIntPipe } from '@nestjs/common';
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
    async findAll(@Query('clinicaId') clinicaId?: string) {
        return await this.ventasService.findAllVentas(clinicaId ? +clinicaId : undefined);
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
