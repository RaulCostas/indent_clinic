import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ContactosService } from './contactos.service';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Controller('contactos')
export class ContactosController {
    constructor(private readonly contactosService: ContactosService) { }

    @Post()
    create(@Body() createDto: CreateContactoDto) {
        return this.contactosService.create(createDto);
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('estado') estado?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.contactosService.findAll(search, estado, pageNum, limitNum);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.contactosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateContactoDto) {
        return this.contactosService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.contactosService.remove(+id);
    }
}
