import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { CorreosService } from './correos.service';
import { CreateCorreoDto } from './dto/create-correo.dto';

@Controller('correos')
export class CorreosController {
    constructor(private readonly correosService: CorreosService) { }

    @Post()
    create(@Body() createCorreoDto: CreateCorreoDto) {
        return this.correosService.create(createCorreoDto);
    }

    @Get('inbox/:userId')
    findInbox(@Param('userId') userId: string) {
        return this.correosService.findInbox(+userId);
    }

    @Get('unread-count/:userId')
    findUnreadCount(@Param('userId') userId: string) {
        return this.correosService.findUnreadCount(+userId);
    }

    @Get('sent/:userId')
    findSent(@Param('userId') userId: string) {
        return this.correosService.findSent(+userId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.correosService.findOne(+id);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string, @Body('userId') userId: number) {
        return this.correosService.markAsRead(+id, userId);
    }
}
