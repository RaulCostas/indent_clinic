import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Agenda } from './entities/agenda.entity';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { ChatbotService } from '../chatbot/chatbot.service';
import { PersonalService } from '../personal/personal.service';

@Injectable()
export class AgendaService {
    constructor(
        @InjectRepository(Agenda)
        private readonly agendaRepository: Repository<Agenda>,
        @Inject(forwardRef(() => ChatbotService))
        private readonly chatbotService: ChatbotService,
        private readonly personalService: PersonalService,
    ) { }

    async enviarRecordatoriosManana(clinicaId?: number, instance?: number): Promise<{ success: boolean; message: string; programados: number }> {
        // Calculate tomorrow's date string (YYYY-MM-DD)
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        const year = manana.getFullYear();
        const month = String(manana.getMonth() + 1).padStart(2, '0');
        const day = String(manana.getDate()).padStart(2, '0');
        const fechaManana = `${year}-${month}-${day}`;

        // Find all appointments for tomorrow
        const citasManana = await this.findAll(fechaManana, undefined, undefined, undefined, undefined, clinicaId);

        // Si no hay ninguna cita para mañana, retornar mensaje informativo (sin WhatsApp)
        if (citasManana.length === 0) {
            console.log(`[AgendaService] No hay citas para mañana (${fechaManana}).`);
            return {
                success: true,
                message: `No hay pacientes agendados para mañana (${fechaManana}). La agenda está libre.`,
                programados: 0
            };
        }

        // El usuario solo quiere mandar a los que están "agendado". Los que están "confirmado" o en "sala de espera" no reciben mensaje.
        const citasParaRecordar = citasManana.filter(cita =>
            cita.estado === 'agendado' &&
            cita.paciente?.celular &&
            !cita.recordatorioEnviado
        );

        const ignoradas = citasManana.length - citasParaRecordar.length;
        console.log(`[AgendaService] Citas mañana: ${citasManana.length}. Programando envío a: ${citasParaRecordar.length} (Ignoradas: ${ignoradas})`);

        // Marcar como enviados hoy ANTES de disparar el proceso para evitar doble envío
        this.markRecordatoriosEnviadosHoy(clinicaId);

        // Disparar el envío en segundo plano sin bloquear la respuesta HTTP
        setImmediate(() => this._enviarRecordatoriosEnBackground(citasParaRecordar, clinicaId, instance));

        return {
            success: true,
            message: `Proceso iniciado. Se enviarán ${citasParaRecordar.length} recordatorio(s) en segundo plano.`,
            programados: citasParaRecordar.length
        };
    }

    async enviarRecordatorioIndividual(agendaId: number, instance?: number): Promise<{ success: boolean; message: string }> {
        const cita = await this.findOne(agendaId);
        if (!cita.paciente?.celular) {
            throw new BadRequestException('El paciente no tiene un número de celular registrado.');
        }

        try {
            // Remove all non-digit characters
            let celular = cita.paciente.celular.replace(/\D/g, '');

            // Automatically prepend country code 591 if it's a standard Bolivian length missing it
            if (celular.length === 8 && /^[67]/.test(celular)) {
                celular = '591' + celular;
            }

            const jid = `${celular}@s.whatsapp.net`;
            const horaStr = cita.hora ? cita.hora.substring(0, 5) : 'la hora acordada';
            const nombrePaciente = [cita.paciente.nombre, cita.paciente.paterno, cita.paciente.materno].filter(Boolean).join(' ').trim();
            const nomClinica = (cita.clinica?.nombre || 'Selec Dental').trim();
            const sucursalNombre = (cita.sucursal?.nombre || cita.clinica?.nombre || 'nuestra clínica').trim();

            const mensaje = `Hola *${nombrePaciente}*, ${nomClinica} te recuerda que tienes una cita mañana:\n\n⏰ A hrs. *${horaStr}*\n📍 Sucursal: *${sucursalNombre}*.`;

            await this.chatbotService.sendAgendaMenu(
                jid,
                mensaje,
                cita.id,
                cita.clinicaId || 1,
                instance
            );

            // Marcar como enviado en la base de datos
            await this.agendaRepository.update(cita.id, { recordatorioEnviado: true });

            return {
                success: true,
                message: `Recordatorio enviado correctamente a ${nombrePaciente}.`
            };
        } catch (error) {
            console.error(`Error enviando recordatorio individual a ${cita.paciente.celular}:`, error);
            throw new InternalServerErrorException('No se pudo enviar el recordatorio. Verifique la conexión del chatbot.');
        }
    }

    private async _enviarRecordatoriosEnBackground(citasParaRecordar: any[], clinicaId?: number, instance?: number): Promise<void> {
        let enviados = 0;
        let fallidos = 0;

        for (const cita of citasParaRecordar) {
            try {
                // Remove all non-digit characters to prevent Baileys connection hangs on "+" or spaces
                let celular = cita.paciente.celular.replace(/\D/g, '');

                // Automatically prepend country code 591 if it's a standard Bolivian length missing it
                if (celular.length === 8 && /^[67]/.test(celular)) {
                    celular = '591' + celular;
                }

                const jid = `${celular}@s.whatsapp.net`;
                const horaStr = cita.hora ? cita.hora.substring(0, 5) : 'la hora acordada';
                const nombrePaciente = [cita.paciente.nombre, cita.paciente.paterno, cita.paciente.materno].filter(Boolean).join(' ').trim();
                const nomClinica = (cita.clinica?.nombre || 'Selec Dental').trim();
                const sucursalNombre = (cita.sucursal?.nombre || cita.clinica?.nombre || 'nuestra clínica').trim();

                const mensaje = `Hola *${nombrePaciente}*, ${nomClinica} te recuerda que tienes una cita mañana:\n\n⏰ A hrs. *${horaStr}*\n📍 Sucursal: *${sucursalNombre}*.`;

                await this.chatbotService.sendAgendaMenu(
                    jid,
                    mensaje,
                    cita.id,
                    cita.clinicaId || clinicaId || undefined,
                    instance
                );

                // Marcar como enviado en la base de datos
                await this.agendaRepository.update(cita.id, { recordatorioEnviado: true });

                enviados++;
                console.log(`[AgendaService] Recordatorio enviado a ${cita.paciente.nombre} (${jid}). Total enviados: ${enviados}`);
            } catch (error) {
                console.error(`Error enviando recordatorio a ${cita.paciente.celular}:`, error);
                fallidos++;
            }
        }
        console.log(`[AgendaService] Proceso de recordatorios completado. Enviados: ${enviados}, Fallidos: ${fallidos}`);
    }

    private _today() { return new Date().toISOString(); }

    private getRecordatorioStatusFilePath() {
        return path.join(process.cwd(), 'last_reminder_date.json');
    }

    async estadoRecordatoriosManana(clinicaId?: number): Promise<{ enviadoHoy: boolean }> {
        const todayD = new Date();
        const today = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
        const filePath = this.getRecordatorioStatusFilePath();
        try {
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const lastDate = data[clinicaId || 'global'];
                if (lastDate === today) {
                    return { enviadoHoy: true };
                }
            }
        } catch (e) {
            console.error('Error reading last_reminder_date.json', e);
        }
        return { enviadoHoy: false };
    }

    private markRecordatoriosEnviadosHoy(clinicaId?: number) {
        const todayD = new Date();
        const today = `${todayD.getFullYear()}-${String(todayD.getMonth() + 1).padStart(2, '0')}-${String(todayD.getDate()).padStart(2, '0')}`;
        const filePath = this.getRecordatorioStatusFilePath();
        let data: any = {};
        try {
            if (fs.existsSync(filePath)) {
                data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) {}
        data[clinicaId || 'global'] = today;
        try {
            fs.writeFileSync(filePath, JSON.stringify(data));
        } catch (e) {
            console.error('Error writing last_reminder_date.json', e);
        }
    }

    /**
     * Notifica a todo el personal registrado (con celular) que no hay citas para el día dado.
     */
    private async notificarSinCitasAlPersonal(fechaManana: string): Promise<void> {
        try {
            const { data: personalList } = await this.personalService.findAll(undefined, 1, 200);
            const mensaje = `📅 *Aviso de Agenda*\n\nNo hay pacientes agendados para mañana *${fechaManana}*. La agenda del día está libre.`;

            for (const personal of personalList) {
                if (!personal.celular) continue;
                try {
                    let celular = personal.celular.replace(/\D/g, '');
                    if (celular.length === 8 && /^[67]/.test(celular)) {
                        celular = '591' + celular;
                    }
                    const jid = `${celular}@s.whatsapp.net`;
                    await this.chatbotService.sendMessage(jid, mensaje);
                    console.log(`[AgendaService] Aviso 'sin citas' enviado a personal: ${personal.nombre} (${jid})`);
                } catch (err) {
                    console.error(`[AgendaService] Error enviando aviso 'sin citas' a ${personal.nombre}:`, err);
                }
            }
        } catch (err) {
            console.error('[AgendaService] Error al notificar sin citas al personal:', err);
        }
    }

    private async validarCruceDoctor(doctorId: number, fecha: string, horaStr: string, duracionMinutos: number, excludeAgendaId?: number): Promise<void> {
        if (!horaStr || !doctorId || !fecha) return;
        
        const agendasExistentes = await this.findAll(fecha, undefined, undefined, undefined, undefined, undefined, doctorId);
        
        const citasActivas = agendasExistentes.filter(a => 
            (a.estado === 'agendado' || a.estado === 'confirmado') && 
            a.id !== excludeAgendaId
        );

        if (citasActivas.length === 0) return;

        const timeToMinutes = (time: string) => {
            if (!time) return 0;
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const nuevaHoraInicio = timeToMinutes(horaStr);
        const nuevaHoraFin = nuevaHoraInicio + duracionMinutos;

        for (const cita of citasActivas) {
            const citaHoraInicio = timeToMinutes(cita.hora);
            const citaHoraFin = citaHoraInicio + (cita.duracion || 30);

            if (nuevaHoraInicio < citaHoraFin && nuevaHoraFin > citaHoraInicio) {
                const nombreClinica = cita.clinica?.nombre || 'otra sucursal';
                const FinH = Math.floor(citaHoraFin/60).toString().padStart(2, '0');
                const FinM = (citaHoraFin%60).toString().padStart(2, '0');
                throw new BadRequestException(`El doctor ya tiene una cita agendada en ${nombreClinica} de ${cita.hora.substring(0,5)} a ${FinH}:${FinM} hrs.`);
            }
        }
    }

    async create(createDto: CreateAgendaDto): Promise<Agenda> {
        try {
            await this.validarCruceDoctor(createDto.doctorId, createDto.fecha, createDto.hora, createDto.duracion || 30);
            
            const cita = this.agendaRepository.create(createDto);
            return await this.agendaRepository.save(cita);
        } catch (error) {
            console.error('Error creating agenda:', error);
            if (error instanceof BadRequestException) throw error;
            const detail = `DB Error: ${error.message} | Code: ${error.code} | Detail: ${error.detail || 'None'}`;
            throw new BadRequestException(detail);
        }
    }

    async findAll(date?: string, fechaInicio?: string, fechaFinal?: string, pacienteId?: number, usuarioId?: number, clinicaId?: number, doctorId?: number): Promise<Agenda[]> {
        const query = this.agendaRepository.createQueryBuilder('agenda')
            .leftJoinAndSelect('agenda.paciente', 'paciente')

            .leftJoinAndSelect('agenda.doctor', 'doctor')
            .leftJoinAndSelect('agenda.proforma', 'proforma')
            .leftJoinAndSelect('agenda.clinica', 'clinica')
            .leftJoinAndSelect('agenda.sucursal', 'sucursal')
            .leftJoinAndSelect('agenda.usuario', 'usuario')
            .leftJoinAndSelect('agenda.doctorDeriva', 'doctorDeriva')
            .where("agenda.estado != 'eliminado'"); // Filter out deleted

        if (date) {
            query.andWhere('agenda.fecha = :date', { date });
        }

        // Filter by clinic
        if (clinicaId) {
            query.andWhere('agenda.clinicaId = :clinicaId', { clinicaId });
        }

        // Filter by date range (fechaAgendado)
        if (fechaInicio) {
            query.andWhere('agenda.fechaAgendado >= :fechaInicio', { fechaInicio });
        }
        if (fechaFinal) {
            query.andWhere('agenda.fechaAgendado <= :fechaFinal', { fechaFinal });
        }

        // Filter by patient
        if (pacienteId) {
            query.andWhere('agenda.pacienteId = :pacienteId', { pacienteId });
        }

        // Filter by user who created the appointment
        if (usuarioId) {
            query.andWhere('agenda.usuarioId = :usuarioId', { usuarioId });
        }

        // Filter by doctor globally
        if (doctorId) {
            query.andWhere('agenda.doctorId = :doctorId', { doctorId });
        }

        query.orderBy('agenda.hora', 'ASC');

        return await query.getMany();
    }

    async findAllByPaciente(pacienteId: number): Promise<Agenda[]> {
        return await this.agendaRepository.find({
            where: { pacienteId }, // Return all history for this patient
            relations: ['paciente', 'doctor', 'proforma', 'usuario', 'doctorDeriva', 'sucursal'],
            order: { fecha: 'DESC', hora: 'ASC' }
        });
    }

    async findOne(id: number): Promise<Agenda> {
        const cita = await this.agendaRepository.findOne({
            where: { id },
            relations: ['paciente', 'doctor', 'proforma', 'usuario', 'doctorDeriva', 'sucursal', 'clinica']
        });
        if (!cita) {
            throw new NotFoundException(`Cita #${id} not found`);
        }
        return cita;
    }

    async update(id: number, updateDto: UpdateAgendaDto): Promise<Agenda> {
        const cita = await this.findOne(id);

        const newDoctorId = updateDto.doctorId !== undefined ? updateDto.doctorId : cita.doctorId;
        const newFecha = updateDto.fecha !== undefined ? updateDto.fecha : cita.fecha;
        const newHora = updateDto.hora !== undefined ? updateDto.hora : cita.hora;
        const newDuracion = updateDto.duracion !== undefined ? updateDto.duracion : (cita.duracion || 30);
        const newEstado = updateDto.estado !== undefined ? updateDto.estado : cita.estado;

        if (newEstado !== 'cancelado' && newEstado !== 'eliminado') {
            await this.validarCruceDoctor(newDoctorId, newFecha, newHora, newDuracion, id);
        }

        // If relation IDs are being updated, we must clear the eager relationship object
        // to prevent TypeORM from ignoring the ID change in favor of the existing object.
        if (updateDto.clinicaId !== undefined && updateDto.clinicaId !== cita.clinicaId) {
            console.log(`[AgendaService] Clinic change detected: ${cita.clinicaId} -> ${updateDto.clinicaId}. Clearing relation object.`);
            (cita as any).clinica = null;
        }
        
        if (updateDto.pacienteId !== undefined && updateDto.pacienteId !== cita.pacienteId) {
            console.log(`[AgendaService] Patient change detected: ${cita.pacienteId} -> ${updateDto.pacienteId}. Clearing relation object.`);
            (cita as any).paciente = null;
        }

        if (updateDto.doctorId !== undefined && updateDto.doctorId !== cita.doctorId) {
            console.log(`[AgendaService] Doctor change detected: ${cita.doctorId} -> ${updateDto.doctorId}. Clearing relation object.`);
            (cita as any).doctor = null;
        }

        if (updateDto.proformaId !== undefined && updateDto.proformaId !== cita.proformaId) {
            console.log(`[AgendaService] Proforma change detected: ${cita.proformaId} -> ${updateDto.proformaId}. Clearing relation object.`);
            (cita as any).proforma = null;
        }
        
        if (updateDto.doctorDerivaId !== undefined && updateDto.doctorDerivaId !== cita.doctorDerivaId) {
            console.log(`[AgendaService] doctorDeriva change detected: ${cita.doctorDerivaId} -> ${updateDto.doctorDerivaId}. Clearing relation object.`);
            (cita as any).doctorDeriva = null;
        }

        if (updateDto.sucursalId !== undefined && (updateDto as any).sucursalId !== cita.sucursalId) {
            console.log(`[AgendaService] Sucursal change detected: ${cita.sucursalId} -> ${(updateDto as any).sucursalId}. Clearing relation object.`);
            (cita as any).sucursal = null;
        }

        this.agendaRepository.merge(cita, updateDto);
        const saved = await this.agendaRepository.save(cita);
        console.log(`[AgendaService] Appointment #${id} saved. New clinicaId:`, saved.clinicaId, 'New pacienteId:', saved.pacienteId);
        return saved;
    }

    async remove(id: number, userId: number): Promise<void> {
        console.log(`Soft deleting agenda #${id} by user ${userId}`);
        // Use update() to explicitly set the columns, avoiding potential relation conflicts
        await this.agendaRepository.update(id, {
            estado: 'eliminado',
            usuarioId: userId
        });
        console.log(`Updated agenda #${id} via direct update query`);
    }

    async findAllByDoctor(doctorId: number): Promise<Agenda[]> {
        return await this.agendaRepository.find({
            where: { 
                doctorId, 
                estado: In(['agendado', 'confirmado', 'sala de espera'])
            } as any,
            relations: ['paciente', 'doctor', 'proforma', 'usuario', 'clinica', 'doctorDeriva', 'sucursal'],
            order: { fecha: 'ASC', hora: 'ASC' }
        });
    }

    async deleteAll(): Promise<{ message: string; deletedCount: number }> {
        try {
            // Count records before deletion
            const count = await this.agendaRepository.count();

            // Delete all records using TRUNCATE which also resets the sequence
            await this.agendaRepository.query('TRUNCATE TABLE agenda RESTART IDENTITY CASCADE');

            return {
                message: `Todos los registros de la tabla Agenda han sido eliminados y el ID ha sido reiniciado`,
                deletedCount: count
            };
        } catch (error) {
            console.error('Error deleting all agenda records:', error);
            throw new InternalServerErrorException(`Error al eliminar registros: ${error.message}`);
        }
    }
}
