import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { ProductosComercialesService } from './productos_comerciales.service';
import { CreateProductoComercialDto } from './dto/create-producto_comercial.dto';
import { UpdateProductoComercialDto } from './dto/update-producto_comercial.dto';

@Controller('productos-comerciales')
export class ProductosComercialesController {
    constructor(private readonly productosService: ProductosComercialesService) {}

    @Post()
    create(@Body() createDto: CreateProductoComercialDto) {
        return this.productosService.create(createDto);
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        return this.productosService.findAll(
            search,
            page ? +page : 1,
            limit ? +limit : 10,
            clinicaId ? +clinicaId : undefined
        );
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.productosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateProductoComercialDto) {
        return this.productosService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.productosService.remove(id);
    }
}
