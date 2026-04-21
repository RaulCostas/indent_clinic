import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PagosDoctoresService } from './pagos_doctores.service';
import { CreatePagosDoctoresDto } from './dto/create-pagos_doctores.dto';
import { UpdatePagosDoctoresDto } from './dto/update-pagos_doctores.dto';
import { ChatbotService } from '../chatbot/chatbot.service';
import { RecetaPdfService } from '../receta/receta-pdf.service';

@Controller('pagos-doctores')
export class PagosDoctoresController {
    constructor(
        private readonly pagosService: PagosDoctoresService,
        private readonly chatbotService: ChatbotService,
        private readonly pdfService: RecetaPdfService,
    ) { }

    @Post()
    create(@Body() createDto: CreatePagosDoctoresDto) {
        return this.pagosService.create(createDto);
    }

    @Get()
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('fecha') fecha?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        const pageNum = page ? parseInt(page, 10) : undefined;
        const limitNum = limit ? parseInt(limit, 10) : undefined;
        return this.pagosService.findAll(pageNum, limitNum, search, fecha, startDate, endDate, clinicaId ? +clinicaId : undefined);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pagosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdatePagosDoctoresDto) {
        return this.pagosService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pagosService.remove(+id);
    }

    @Post(':id/send-whatsapp')
    async sendWhatsApp(@Param('id') id: string) {
        try {
            // Get payment with doctor details
            const pago = await this.pagosService.findOne(+id);

            if (!pago) {
                throw new HttpException('Pago no encontrado', HttpStatus.NOT_FOUND);
            }

            if (!pago.doctor) {
                throw new HttpException('Doctor no encontrado', HttpStatus.NOT_FOUND);
            }

            if (!pago.doctor.celular) {
                throw new HttpException('El doctor no tiene número de celular registrado', HttpStatus.BAD_REQUEST);
            }

            if (!pago.clinicaId) {
                throw new HttpException('El pago no tiene una clínica asociada', HttpStatus.BAD_REQUEST);
            }

            const chatbotStatus = this.chatbotService.getStatus(pago.clinicaId);
            if (chatbotStatus.status !== 'connected') {
                throw new HttpException('El chatbot no está conectado. Por favor, conecte el chatbot primero.', HttpStatus.SERVICE_UNAVAILABLE);
            }

            let phone = pago.doctor.celular.replace(/\D/g, '');
            if (phone.length === 8) {
                phone = '591' + phone;
            }
            const jid = phone + '@s.whatsapp.net';

            const pdfBuffer = await this.pdfService.generatePagoDoctorPdf(pago);

            const message = `Hola Dr. ${pago.doctor.nombre} ${pago.doctor.paterno}, le enviamos el recibo de pago correspondiente.`;

            await this.chatbotService.sendMessage(jid, {
                document: pdfBuffer,
                mimetype: 'application/pdf',
                fileName: `recibo_pago_${pago.id}_${pago.doctor.paterno}.pdf`,
                caption: message
            }, pago.clinicaId);

            return {
                success: true,
                message: 'Recibo enviado por WhatsApp exitosamente'
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                error.message || 'Error al enviar el recibo por WhatsApp',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
