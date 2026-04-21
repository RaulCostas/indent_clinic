import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { RecordatorioPlanService } from './recordatorio-plan.service';
import { CreateRecordatorioPlanDto } from './dto/create-recordatorio-plan.dto';
import { UpdateRecordatorioPlanDto } from './dto/update-recordatorio-plan.dto';

@Controller('recordatorio-plan')
export class RecordatorioPlanController {
    constructor(private readonly recordatorioPlanService: RecordatorioPlanService) { }

    @Post()
    create(@Body() createRecordatorioPlanDto: CreateRecordatorioPlanDto) {
        return this.recordatorioPlanService.create(createRecordatorioPlanDto);
    }

    @Get()
    findAll() {
        return this.recordatorioPlanService.findAll();
    }

    @Get('proforma/:id')
    findByProforma(@Param('id', ParseIntPipe) id: number) {
        return this.recordatorioPlanService.findByProforma(id);
    }

    @Get('pendientes')
    findPending() {
        return this.recordatorioPlanService.findPending();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.recordatorioPlanService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateRecordatorioPlanDto: UpdateRecordatorioPlanDto) {
        return this.recordatorioPlanService.update(id, updateRecordatorioPlanDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.recordatorioPlanService.remove(id);
    }
}
