import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpException, HttpStatus, Req } from '@nestjs/common';
import { HistoriaClinicaService } from './historia_clinica.service';
import { CreateHistoriaClinicaDto } from './dto/create-historia_clinica.dto';
import { UpdateHistoriaClinicaDto } from './dto/update-historia_clinica.dto';
import { HistoriaClinicaPdfService } from './historia-clinica-pdf.service';
import { ChatbotService } from '../chatbot/chatbot.service';

@Controller('historia-clinica')
export class HistoriaClinicaController {
    constructor(
        private readonly historiaClinicaService: HistoriaClinicaService,
        private readonly pdfService: HistoriaClinicaPdfService,
        private readonly chatbotService: ChatbotService,
    ) { }

    @Post()
    create(@Body() createDto: CreateHistoriaClinicaDto, @Req() req: any) {
        if (req.user && req.user.id) {
            createDto.usuarioId = req.user.id;
        }
        return this.historiaClinicaService.create(createDto);
    }

    @Get()
    findAll() {
        return this.historiaClinicaService.findAll();
    }

    @Get('proforma/:id')
    findByProforma(@Param('id') id: string) {
        return this.historiaClinicaService.findByProforma(+id);
    }

    @Get('paciente/:id/recientes')
    findRecientesByPaciente(@Param('id') id: string, @Query('proformaId') proformaId?: string) {
        return this.historiaClinicaService.findRecientesByPaciente(+id, proformaId ? +proformaId : undefined);
    }

    @Get('paciente/:id')
    findAllByPaciente(@Param('id') id: string) {
        return this.historiaClinicaService.findAllByPaciente(+id);
    }

    @Get('pendientes/:doctorId')
    findPendientesPago(@Param('doctorId') doctorId: string, @Query('clinicaId') clinicaId?: string) {
        return this.historiaClinicaService.findPendientesPago(+doctorId, clinicaId ? +clinicaId : undefined);
    }

    @Get('doctores/pendientes')
    findDoctoresConPendientes(@Query('clinicaId') clinicaId?: string) {
        return this.historiaClinicaService.findDoctoresConPendientes(clinicaId ? +clinicaId : undefined);
    }

    @Get('cancelados')
    findCancelados() {
        return this.historiaClinicaService.findCancelados();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.historiaClinicaService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateHistoriaClinicaDto) {
        return this.historiaClinicaService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.historiaClinicaService.remove(+id);
    }

    @Post('send-whatsapp/:pacienteId/:proformaId')
    async sendWhatsApp(
        @Param('pacienteId') pacienteId: string,
        @Param('proformaId') proformaId: string,
        @Query('clinicaId') clinicaId?: string
    ) {
        try {
            const targetClinicId = clinicaId ? +clinicaId : undefined;
            if (!targetClinicId) {
                throw new HttpException('Debe especificar clinicaId en la consulta', HttpStatus.BAD_REQUEST);
            }

            const historiaRecords = await this.historiaClinicaService.findAllByPaciente(+pacienteId);

            if (!historiaRecords || historiaRecords.length === 0) {
                throw new HttpException('No se encontraron registros de historia clínica', HttpStatus.NOT_FOUND);
            }

            const paciente = historiaRecords[0].paciente;

            if (!paciente) {
                throw new HttpException('Paciente no encontrado', HttpStatus.NOT_FOUND);
            }

            if (!paciente.celular) {
                throw new HttpException('El paciente no tiene número de celular registrado', HttpStatus.BAD_REQUEST);
            }

            const chatbotStatus = this.chatbotService.getStatus(targetClinicId);
            if (chatbotStatus.status !== 'connected') {
                throw new HttpException('El chatbot no está conectado. Por favor, conecte el chatbot primero.', HttpStatus.SERVICE_UNAVAILABLE);
            }

            let phone = paciente.celular.replace(/\D/g, '');
            if (phone.length === 8) {
                phone = '591' + phone;
            }
            const jid = phone + '@s.whatsapp.net';

            const pdfBuffer = await this.pdfService.generateHistoriaClinicaPdf(+pacienteId, +proformaId);

            const message = `Hola ${paciente.nombre}, le enviamos su historial de tratamientos.`;

            await this.chatbotService.sendMessage(jid, {
                document: pdfBuffer,
                mimetype: 'application/pdf',
                fileName: `historia_clinica_${paciente.paterno}.pdf`,
                caption: message
            }, targetClinicId);

            return {
                success: true,
                message: 'Historia clínica enviada por WhatsApp exitosamente'
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                error.message || 'Error al enviar la historia clínica por WhatsApp',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
