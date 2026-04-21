import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ArancelService } from './arancel.service';
import { CreateArancelDto } from './dto/create-arancel.dto';
import { UpdateArancelDto } from './dto/update-arancel.dto';
import { UpdatePricesDto } from './dto/update-prices.dto';

@Controller('arancel')
export class ArancelController {
    constructor(private readonly arancelService: ArancelService) { }

    @Post()
    create(@Body() createArancelDto: CreateArancelDto) {
        return this.arancelService.create(createArancelDto);
    }

    @Get('used-specialties')
    getUsedEspecialidades() {
        return this.arancelService.getUsedEspecialidades();
    }

    @Post('update-prices')
    updatePrices(@Body() updatePricesDto: UpdatePricesDto) {
        return this.arancelService.updatePrices(updatePricesDto);
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('clinicaId') clinicaId?: string,
    ) {
        return this.arancelService.findAll(
            search,
            page ? +page : 1,
            limit ? +limit : 5,
            clinicaId ? +clinicaId : undefined,
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.arancelService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateArancelDto: UpdateArancelDto) {
        return this.arancelService.update(+id, updateArancelDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.arancelService.remove(+id);
    }
}
