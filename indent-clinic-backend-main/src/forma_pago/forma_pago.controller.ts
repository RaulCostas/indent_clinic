import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FormaPagoService } from './forma_pago.service';
import { CreateFormaPagoDto } from './dto/create-forma_pago.dto';
import { UpdateFormaPagoDto } from './dto/update-forma_pago.dto';

@Controller('forma-pago')
export class FormaPagoController {
    constructor(private readonly formaPagoService: FormaPagoService) { }

    @Post()
    create(@Body() createFormaPagoDto: CreateFormaPagoDto) {
        return this.formaPagoService.create(createFormaPagoDto);
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.formaPagoService.findAll(
            search,
            page ? +page : 1,
            limit ? +limit : 5,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.formaPagoService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFormaPagoDto: UpdateFormaPagoDto) {
        return this.formaPagoService.update(+id, updateFormaPagoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.formaPagoService.remove(+id);
    }
}
