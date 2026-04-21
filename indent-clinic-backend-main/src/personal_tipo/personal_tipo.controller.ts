import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PersonalTipoService } from './personal_tipo.service';
import { CreatePersonalTipoDto } from './dto/create-personal-tipo.dto';
import { UpdatePersonalTipoDto } from './dto/update-personal-tipo.dto';

@Controller('personal-tipo')
export class PersonalTipoController {
    constructor(private readonly personalTipoService: PersonalTipoService) { }

    @Post()
    create(@Body() createDto: CreatePersonalTipoDto) {
        return this.personalTipoService.create(createDto);
    }

    @Get()
    findAll() {
        return this.personalTipoService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.personalTipoService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdatePersonalTipoDto) {
        return this.personalTipoService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.personalTipoService.remove(+id);
    }

    @Patch(':id/reactivate')
    reactivate(@Param('id') id: string) {
        return this.personalTipoService.reactivate(+id);
    }
}
