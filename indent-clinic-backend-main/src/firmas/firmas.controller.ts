import { Controller, Get, Post, Body, Param, Delete, Request, UseGuards, Query } from '@nestjs/common';
import { FirmasService } from './firmas.service';
import { CreateFirmaDto } from './dto/create-firma.dto';
import { VerifyFirmaDto } from './dto/verify-firma.dto';

@Controller('firmas')
export class FirmasController {
    constructor(private readonly firmasService: FirmasService) { }

    /**
     * Create a new signature
     * POST /firmas
     */
    @Post()
    create(@Body() createFirmaDto: CreateFirmaDto, @Request() req) {
        const usuarioId = req.user?.id || createFirmaDto['usuarioId']; // Fallback for testing
        return this.firmasService.create(createFirmaDto, usuarioId);
    }

    /**
     * Get all signatures for a document
     * GET /firmas/documento/:tipo/:id
     */
    @Get('documento/:tipo/:id')
    findByDocumento(
        @Param('tipo') tipo: string,
        @Param('id') id: string,
    ) {
        return this.firmasService.findByDocumento(tipo, +id);
    }

    /**
     * Get signature statistics
     * GET /firmas/stats
     */
    @Get('stats')
    getStats() {
        return this.firmasService.getStats();
    }

    /**
     * Get signatures by user
     * GET /firmas/usuario/:id
     */
    @Get('usuario/:id')
    findByUsuario(@Param('id') id: string) {
        return this.firmasService.findByUsuario(+id);
    }

    /**
     * Get a single signature
     * GET /firmas/:id
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.firmasService.findOne(+id);
    }

    /**
     * Verify a signature
     * POST /firmas/:id/verify
     */
    @Post(':id/verify')
    verify(@Param('id') id: string, @Body() verifyFirmaDto: VerifyFirmaDto) {
        return this.firmasService.verify(+id, verifyFirmaDto);
    }

    /**
     * Delete a signature (admin only)
     * DELETE /firmas/:id
     */
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.firmasService.remove(+id);
    }
}
