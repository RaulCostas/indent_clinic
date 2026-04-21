import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Inject, forwardRef } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { TransferSaldoDto } from './dto/transfer-saldo.dto';
import { ChatbotService } from '../chatbot/chatbot.service';
import { PagosPdfService } from './pagos-pdf.service';
import { HistoriaClinicaService } from '../historia_clinica/historia_clinica.service';

@Controller('pagos')
export class PagosController {
    constructor(
        private readonly pagosService: PagosService,
        @Inject(forwardRef(() => ChatbotService))
        private readonly chatbotService: ChatbotService,
        private readonly pagosPdfService: PagosPdfService,
        private readonly historiaClinicaService: HistoriaClinicaService,
    ) { }

    @Post()
    create(@Body() createDto: CreatePagoDto) {
        console.log('Recibiendo payload para crear pago:', createDto);
        return this.pagosService.create(createDto);
    }

    @Post('whatsapp')
    async sendByWhatsapp(@Body() body: { pacienteId: number; proformaId?: number; clinicaId?: number }) {
        const { pacienteId, proformaId, clinicaId } = body;

        try {
            const pagos = await this.pagosService.findAllByPaciente(pacienteId);
            const filteredPagos = proformaId ? pagos.filter(p => p.proformaId === proformaId) : pagos;

            const historia = await this.historiaClinicaService.findAllByPaciente(pacienteId);

            const totalEjecutado = historia
                .filter(h => h.estadoTratamiento === 'terminado' && (!proformaId || h.proformaId === proformaId))
                .reduce((acc, curr) => acc + Number(curr.precio || 0), 0);

            const totalPagado = filteredPagos.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
            const diff = totalEjecutado - totalPagado;
            const saldoFavor = diff < 0 ? Math.abs(diff) : 0;
            const saldoContra = diff > 0 ? diff : 0;

            const resumen = { totalEjecutado, totalPagado, saldoFavor, saldoContra };

            const patientEntity = filteredPagos.length > 0 ? filteredPagos[0].paciente : (historia.length > 0 ? historia[0].paciente : null);

            if (!patientEntity) {
                return { success: false, message: 'No se encontraron datos del paciente para generar el reporte.' };
            }

            const proformaEntity = proformaId
                ? (filteredPagos.find(p => p.proformaId === proformaId)?.proforma || historia.find(h => h.proformaId === proformaId)?.proforma)
                : null;

            const pdfBuffer = await this.pagosPdfService.generatePagosPdf(patientEntity, proformaEntity, filteredPagos, resumen);

            const phoneNumber = patientEntity.celular;

            if (!phoneNumber) {
                return { success: false, message: 'El paciente no tiene número de celular registrado.' };
            }

            const cleanPhone = phoneNumber.replace(/\D/g, '');
            const countryCode = cleanPhone.length === 8 ? '591' : '';
            const jid = `${countryCode}${cleanPhone}@s.whatsapp.net`;

            const caption = proformaEntity 
                ? `Hola ${patientEntity.nombre}, adjunto encontrará su historial de pagos del Plan de Tratamiento #${proformaEntity.numero}.`
                : `Hola ${patientEntity.nombre}, adjunto encontrará su historial de pagos.`;

            await this.chatbotService.sendMessage(jid, {
                document: pdfBuffer,
                mimetype: 'application/pdf',
                fileName: `Historial_Pagos.pdf`,
                caption: caption
            }, clinicaId ?? undefined);

            return { success: true, message: 'Enviado correctamente' };

        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            return { success: false, message: 'Error al enviar el mensaje: ' + error.message };
        }
    }

    @Get()
    findAll(
        @Query('fecha') fecha?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        return this.pagosService.findAll(fecha, startDate, endDate, clinicaId ? +clinicaId : undefined);
    }

    @Post('transferir-saldo')
    createTransfer(@Body() transferDto: TransferSaldoDto) {
        return this.pagosService.transferirSaldo(transferDto);
    }

    @Get('paciente/:id')
    findAllByPaciente(@Param('id') id: string) {
        return this.pagosService.findAllByPaciente(+id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pagosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdatePagoDto) {
        return this.pagosService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Query('idUsuario') idUsuario?: string) {
        return this.pagosService.remove(+id, idUsuario ? +idUsuario : undefined);
    }
}
