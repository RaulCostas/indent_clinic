import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus, Query } from '@nestjs/common';
import { RecetaService } from './receta.service';
import { RecetaPdfService } from './receta-pdf.service';
import { ChatbotService } from '../chatbot/chatbot.service';

@Controller('receta')
export class RecetaController {
    constructor(
        private readonly recetaService: RecetaService,
        private readonly pdfService: RecetaPdfService,
        private readonly chatbotService: ChatbotService,
    ) { }

    @Post()
    create(@Body() createRecetaDto: any) {
        return this.recetaService.create(createRecetaDto);
    }

    @Get()
    findAll(@Query('clinicaId') clinicaId?: string) {
        return this.recetaService.findAll(clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.recetaService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateRecetaDto: any) {
        return this.recetaService.update(+id, updateRecetaDto);
    }

    @Post(':id/send-whatsapp')
    async sendWhatsApp(@Param('id') id: string) {
        try {
            // Get prescription with patient details
            const receta = await this.recetaService.findOne(+id);

            if (!receta) {
                throw new HttpException('Receta no encontrada', HttpStatus.NOT_FOUND);
            }

            if (!receta.paciente) {
                throw new HttpException('Paciente no encontrado', HttpStatus.NOT_FOUND);
            }

            if (!receta.paciente.celular) {
                throw new HttpException('El paciente no tiene número de celular registrado', HttpStatus.BAD_REQUEST);
            }

            if (!receta.clinicaId) {
                throw new HttpException('La receta no tiene una clínica asociada', HttpStatus.BAD_REQUEST);
            }

            const chatbotStatus = this.chatbotService.getStatus(receta.clinicaId);
            if (chatbotStatus.status !== 'connected') {
                throw new HttpException('El chatbot no está conectado. Por favor, conecte el chatbot primero.', HttpStatus.SERVICE_UNAVAILABLE);
            }

            let phone = receta.paciente.celular.replace(/\D/g, '');
            if (phone.length === 8) {
                phone = '591' + phone;
            }
            const jid = phone + '@s.whatsapp.net';

            const pdfBuffer = await this.pdfService.generateRecetaPdf(receta);

            const message = `Hola ${receta.paciente.nombre}, le enviamos su receta médica.`;

            await this.chatbotService.sendMessage(jid, {
                document: pdfBuffer,
                mimetype: 'application/pdf',
                fileName: `receta_${receta.id}_${receta.paciente.paterno}.pdf`,
                caption: message
            }, receta.clinicaId);

            return {
                success: true,
                message: 'Receta enviada por WhatsApp exitosamente'
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                error.message || 'Error al enviar la receta por WhatsApp',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.recetaService.remove(+id);
    }
}
