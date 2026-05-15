import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    getAggregateVotesInPollMessage,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Clinica } from '../clinicas/entities/clinica.entity';
import { Sucursal } from '../clinicas/entities/sucursal.entity';
import { Especialidad } from '../especialidad/entities/especialidad.entity';
import { PacientesService } from '../pacientes/pacientes.service';
import { DoctorsService } from '../doctors/doctors.service';
import { AgendaService } from '../agenda/agenda.service';
import { PagosService } from '../pagos/pagos.service';
import { ProformasService } from '../proformas/proformas.service';
import { HistoriaClinicaService } from '../historia_clinica/historia_clinica.service';
import { PersonalService } from '../personal/personal.service';
import { ChatbotIntentosService } from './chatbot-intentos.service';
import { ChatbotIntento } from './entities/chatbot-intento.entity';
import { WhatsappSession } from './entities/whatsapp-session.entity';
import { ChatbotPdfService } from './chatbot-pdf.service';
import { InventarioService } from '../inventario/inventario.service';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';

// @ts-ignore
import { decryptPollVote } from '@whiskeysockets/baileys/lib/Utils/process-message.js';
// @ts-ignore
import { getKeyAuthor } from '@whiskeysockets/baileys/lib/Utils/generics.js';
import { jidNormalizedUser } from '@whiskeysockets/baileys';

interface SessionState {
    sock: any;
    qrCode: string | null;
    status: 'disconnected' | 'connecting' | 'connected' | 'qr';
    intentionalDisconnect: boolean;
    initializationStartTime: number | null;
    initializationTimeout: NodeJS.Timeout | null;
    userSessions: Map<string, { type: 'new' | 'registered' | 'menu' | 'waiting_cancellation_reason' | 'waiting_agenda_response' | 'waiting_branch_selection' | 'waiting_urgencia_response' | 'waiting_otra_consulta_response', timestamp: number, citaId?: number, branchAction?: 'DIRECCION' | 'HORARIO' }>;
    pollStore: Map<string, { message: any, citaId: number }>;
    processedMsgIds: Set<string>;
}

@Injectable()
export class ChatbotService implements OnModuleInit, OnModuleDestroy {
    private sessions = new Map<string, SessionState>();

    constructor(
        @InjectRepository(Clinica)
        private readonly clinicaRepository: Repository<Clinica>,
        private readonly pacientesService: PacientesService,
        @Inject(forwardRef(() => AgendaService))
        private readonly agendaService: AgendaService,
        private readonly pagosService: PagosService,
        @Inject(forwardRef(() => ProformasService))
        private readonly proformasService: ProformasService,
        private readonly historiaClinicaService: HistoriaClinicaService,
        private readonly intentosService: ChatbotIntentosService,
        private readonly pdfService: ChatbotPdfService,
        private readonly doctorsService: DoctorsService,
        private readonly inventarioService: InventarioService,
        private readonly personalService: PersonalService,
        @InjectRepository(WhatsappSession)
        private readonly whatsappSessionRepository: Repository<WhatsappSession>,
        @InjectRepository(Sucursal)
        private readonly sucursalRepository: Repository<Sucursal>,
        @InjectRepository(Especialidad)
        private readonly especialidadRepository: Repository<Especialidad>,
    ) { }

    private getSessionKey(clinicId: number, instance: number): string {
        return `${clinicId}-${instance}`;
    }

    private getSession(clinicId: number, instance: number = 1): SessionState {
        const key = this.getSessionKey(clinicId, instance);
        if (!this.sessions.has(key)) {
            this.sessions.set(key, {
                sock: null,
                qrCode: null,
                status: 'disconnected',
                intentionalDisconnect: false,
                initializationStartTime: null,
                initializationTimeout: null,
                userSessions: new Map(),
                pollStore: new Map(),
                processedMsgIds: new Set(),
            });
        }
        return this.sessions.get(key)!;
    }

    onModuleInit() {
        console.log('[Chatbot] Loading active clinics for chatbot (Multi-instance support)...');
        // Usamos un arranque escalonado para evitar OOM (falta de RAM) en la inicialización
        this.startAllInstancesInBackground();
    }

    private async startAllInstancesInBackground() {
        try {
            // Garantizar que el índice único exista antes de intentar cualquier upsert
            await this.ensureDatabaseIndex();

            const clinicas = await this.clinicaRepository.find({ where: { activo: true } });
            console.log(`[Chatbot] Found ${clinicas.length} active clinics. Starting initialization for 2 instances per clinic staggeredly...`);
            let delayMs = 0;
            for (const clinica of clinicas) {
                for (const instance of [1, 2]) {
                    setTimeout(() => {
                        this.initialize(clinica.id, instance).catch(err => {
                            console.error(`[Chatbot] Failed to initialize session for Clinic ${clinica.id} Instance ${instance}:`, err);
                        });
                    }, delayMs);
                    delayMs += 10000; // 10 segundos de espera entre la inicialización de cada instancia
                }
            }
        } catch (error) {
            console.error('[Chatbot] Failed to retrieve clinics for background initialization', error);
        }
    }

    async onModuleDestroy() {
        for (const [clinicId, session] of this.sessions.entries()) {
            if (session.sock) {
                try {
                    session.sock.end(undefined);
                } catch (e) { }
            }
        }
    }

    private async ensureDatabaseIndex() {
        try {
            console.log('[Chatbot] Ensuring unique index for whatsapp_sessions exist...');
            // Creamos un índice único manual con un nombre específico para garantizar que ON CONFLICT funcione
            // Usamos query directo para evitar problemas de sincronización de TypeORM en Render
            await this.whatsappSessionRepository.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS "IDX_WHATSAPP_SESSIONS_UPSERT_MANUAL" 
                ON "whatsapp_sessions" ("clinicId", "instanceNumber", "type", "keyId")
            `);
            console.log('[Chatbot] Unique index for whatsapp_sessions ensured.');
        } catch (error) {
            console.error('[Chatbot] Failed to ensure database index:', error);
            // No bloqueamos el arranque, pero advertimos
        }
    }

    async initialize(clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        if (session.status === 'connected' || session.status === 'connecting') {
            console.log(`[Chatbot] [Clinic ${clinicId}] Already connected or connecting. Skipping initialization.`);
            return;
        }

        session.intentionalDisconnect = false; // Reset flag
        session.status = 'connecting';
        session.initializationStartTime = Date.now();

        // Clear any existing timeout
        if (session.initializationTimeout) {
            clearTimeout(session.initializationTimeout);
        }

        // Set timeout to reset status if initialization takes too long
        session.initializationTimeout = setTimeout(() => {
            if (session.status === 'connecting') {
                console.log(`[Chatbot] [Clinic ${clinicId}] Initialization timeout - resetting to disconnected`);
                session.status = 'disconnected';
                session.qrCode = null;
                session.initializationStartTime = null;
                if (session.sock) {
                    try {
                        session.sock.end(undefined);
                    } catch (error) {
                        console.error(`[Chatbot] [Clinic ${clinicId}] Error ending socket on timeout:`, error);
                    }
                }
            }
        }, 60000); // Increased timeout to 60s for loading buffers

        try {
            const { state, saveCreds } = await this.useDatabaseAuthState(clinicId, instance);

            const { version, isLatest } = await fetchLatestBaileysVersion();
            console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Initializing (WA version: ${version.join('.')}, isLatest: ${isLatest})...`);

            try {
                session.sock = makeWASocket({
                    version,
                    logger: pino({ level: 'error' }) as any,
                    auth: {
                        creds: state.creds,
                        keys: state.keys,
                    },
                    generateHighQualityLinkPreview: true,
                    browser: [`Clinica ${clinicId} Chatbot ${instance}`, 'Chrome', '1.0.0'],
                    connectTimeoutMs: 60000,
                    defaultQueryTimeoutMs: 60000,
                    keepAliveIntervalMs: 10000,
                    emitOwnEvents: true,
                    retryRequestDelayMs: 250,
                    getMessage: async (key) => {
                        if (key.id && session.pollStore.has(key.id)) {
                            return session.pollStore.get(key.id)!.message;
                        }
                        return undefined;
                    }
                });
            } catch (sockError) {
                console.error(`[Chatbot] [Clinic ${clinicId}] CRITICAL ERROR creating socket:`, sockError);
                session.status = 'disconnected';
                // Try to clear corrupted session data if possible
                await this.whatsappSessionRepository.delete({ clinicId, instanceNumber: instance, type: 'creds' });
                return;
            }

            console.log(`[Chatbot] [Clinic ${clinicId}] Socket created. Setting up event listeners...`);

            session.sock.ev.on('connection.update', async (update: any) => {
                const { connection, lastDisconnect, qr } = update;
                const elapsed = session.initializationStartTime ? Date.now() - session.initializationStartTime : 0;
                console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Connection Update:`, { connection, qr: qr ? 'QR RECEIVED' : 'NO QR', elapsed: `${elapsed}ms` });

                if (qr) {
                    session.status = 'qr';
                    session.qrCode = await QRCode.toDataURL(qr);
                    console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] QR Code generated`);

                    if (session.initializationTimeout) {
                        clearTimeout(session.initializationTimeout);
                        session.initializationTimeout = null;
                    }
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const errorMsg = lastDisconnect?.error?.message || 'Unknown error';

                    // Detect unrecoverable conditions that should NOT trigger auto-reconnect
                    const isLoggedOut = statusCode === DisconnectReason.loggedOut;
                    const isQrExpired = errorMsg.toLowerCase().includes('qr refs attempts') ||
                        errorMsg.toLowerCase().includes('qr ref') ||
                        (statusCode === 408 && session.status === 'qr'); // Connection Timed Out waiting for QR

                    const shouldReconnect = !isLoggedOut && !isQrExpired;

                    console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Connection closed. Reconnecting: ${shouldReconnect} | StatusCode: ${statusCode} | Error: ${errorMsg}`);

                    session.status = 'disconnected';
                    session.qrCode = null;
                    session.initializationStartTime = null;

                    if (session.initializationTimeout) {
                        clearTimeout(session.initializationTimeout);
                        session.initializationTimeout = null;
                    }

                    if (isQrExpired) {
                        console.warn(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] QR scan timeout — session expired. Manual re-scan required from the dashboard.`);
                    } else if (isLoggedOut) {
                        console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Logged out. Manual re-scan required.`);
                    } else if (shouldReconnect && !session.intentionalDisconnect) {
                        // Recoverable error — reconnect with a short delay to avoid hammering
                        setTimeout(() => this.initialize(clinicId, instance), 5000);
                    }
                } else if (connection === 'open') {
                    console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Connection opened successfully`);
                    session.status = 'connected';
                    session.qrCode = null;
                    session.initializationStartTime = null;

                    if (session.initializationTimeout) {
                        clearTimeout(session.initializationTimeout);
                        session.initializationTimeout = null;
                    }
                }
            });

            session.sock.ev.on('creds.update', saveCreds);

            session.sock.ev.on('messages.upsert', async (m: any) => {
                try {
                    fs.appendFileSync(`chatbot-poll-upsert-clinic-${clinicId}-inst-${instance}.log`, `\n[${new Date().toISOString()}] messages.upsert: ${JSON.stringify(m)}\n`);
                } catch (e) { }

                for (const msg of m.messages) {
                    const debugText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                    console.log(`[Chatbot] [Clinic ${clinicId}] MSG IN: fromMe=${msg.key.fromMe}, jid=${msg.key.remoteJid}, text="${debugText}"`);

                    const pollUpdateMessage = msg.message?.pollUpdateMessage || msg.message?.messageContextInfo?.message?.pollUpdateMessage;
                    if (pollUpdateMessage) {
                        try {
                            const creationMsgKey = pollUpdateMessage.pollCreationMessageKey;
                            if (session.pollStore.has(creationMsgKey.id)) {
                                const { message: pollMsg, citaId } = session.pollStore.get(creationMsgKey.id)!;

                                const meIdNormalised = jidNormalizedUser(session.sock?.user?.id || '');
                                const pollCreatorJid = getKeyAuthor(creationMsgKey, meIdNormalised);
                                const voterJid = getKeyAuthor(msg.key, meIdNormalised);
                                const pollEncKey = pollMsg.messageContextInfo?.messageSecret!;

                                const voteMsg = decryptPollVote(
                                    pollUpdateMessage.vote!,
                                    {
                                        pollEncKey,
                                        pollCreatorJid,
                                        pollMsgId: creationMsgKey.id!,
                                        voterJid,
                                    }
                                );

                                const pollUpdates = [
                                    {
                                        pollUpdateMessageKey: msg.key,
                                        vote: voteMsg,
                                        senderTimestampMs: pollUpdateMessage.senderTimestampMs
                                    }
                                ];

                                const aggregation = getAggregateVotesInPollMessage({
                                    message: pollMsg,
                                    pollUpdates: pollUpdates as any
                                }, meIdNormalised);

                                fs.appendFileSync(`chatbot-poll-clinic-${clinicId}-inst-${instance}.log`, `\n[${new Date().toISOString()}] Manual Poll aggregation: ${JSON.stringify(aggregation)}\n`);
                                console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Manual Poll aggregation:`, aggregation);
                                for (const agg of aggregation) {
                                    if (agg.voters.length > 0) {
                                        const isLid = msg.key.remoteJid?.endsWith('@lid');
                                        const normalizedMsgJid = isLid ? (msg.key.remoteJidAlt || msg.key.remoteJid) : msg.key.remoteJid;
                                        await this.handleAgendaPollResponse(agg.name, citaId, normalizedMsgJid!, clinicId, instance);
                                        break;
                                    }
                                }
                            }
                        } catch (err: any) {
                            fs.appendFileSync(`chatbot-poll-clinic-${clinicId}-inst-${instance}.log`, `\n[${new Date().toISOString()}] Decrypt Error: ${err.message}\n`);
                        }
                        continue;
                    }

                    if (!msg.key.fromMe) {
                        // Ignorar mensajes de protocolo (ephemeral sync, etc.)
                        if (msg.message?.protocolMessage) continue;

                        // Ignorar mensajes sin texto real
                        const msgText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                        if (!msgText.trim()) continue;

                        const msgId = msg.key.id || '';
                        if (msgId && session.processedMsgIds.has(msgId)) {
                            console.log(`[Chatbot] [Clinic ${clinicId}] Duplicate message ignored: ${msgId}`);
                            continue;
                        }
                        if (msgId) {
                            session.processedMsgIds.add(msgId);
                            if (session.processedMsgIds.size > 500) {
                                const firstKey = session.processedMsgIds.values().next().value;
                                session.processedMsgIds.delete(firstKey);
                            }
                        }
                        console.log(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] New message received:`, JSON.stringify(msg, null, 2));
                        await this.handleMessage(msg, clinicId, instance);
                    }
                }
            });

            session.sock.ev.on('messages.update', async (event: any) => {
                for (const { key, update } of event) {
                    if (update.pollUpdates && session.pollStore.has(key.id)) {
                        const { message, citaId } = session.pollStore.get(key.id)!;
                        const aggregation = getAggregateVotesInPollMessage({
                            message: message,
                            pollUpdates: update.pollUpdates,
                        });

                        for (const agg of aggregation) {
                            if (agg.voters.length > 0) {
                                const selectedOption = agg.name;
                                let resolvedJid = key.remoteJid!;
                                if (resolvedJid?.endsWith('@lid')) {
                                    const storedJid = message?.key?.remoteJid;
                                    if (storedJid && !storedJid.endsWith('@lid')) {
                                        resolvedJid = storedJid;
                                    }
                                }
                                await this.handleAgendaPollResponse(selectedOption, citaId, resolvedJid, clinicId, instance);
                                break;
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error(`[Chatbot] [Clinic ${clinicId}] Error during initialization:`, error);
            session.status = 'disconnected';
            session.qrCode = null;
            session.initializationStartTime = null;
            if (session.initializationTimeout) {
                clearTimeout(session.initializationTimeout);
                session.initializationTimeout = null;
            }
            throw error;
        }
    }

    private async useDatabaseAuthState(clinicId: number, instance: number = 1) {
        const { BufferJSON, initAuthCreds } = await import('@whiskeysockets/baileys');
        let creds: any;

        const sessionCreds = await this.whatsappSessionRepository.findOne({
            where: { clinicId, instanceNumber: instance, type: 'creds' }
        });

        if (sessionCreds && sessionCreds.data) {
            try {
                creds = JSON.parse(JSON.stringify(sessionCreds.data), BufferJSON.reviver);
                if (!creds) {
                    console.warn(`[Chatbot] [Clinic ${clinicId}] Credentials found but parsed as null. Initializing new ones.`);
                    creds = initAuthCreds();
                }
            } catch (err) {
                console.error(`[Chatbot] [Clinic ${clinicId}] Failed to parse credentials from DB:`, err);
                creds = initAuthCreds();
            }
        } else {
            creds = initAuthCreds();
        }

        const saveCreds = async () => {
            const existing = await this.whatsappSessionRepository.findOne({
                where: { clinicId, instanceNumber: instance, type: 'creds' }
            });
            const serializedCreds = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
            if (existing) {
                existing.data = serializedCreds;
                await this.whatsappSessionRepository.save(existing);
            } else {
                const newSession = this.whatsappSessionRepository.create({
                    clinicId,
                    instanceNumber: instance,
                    type: 'creds',
                    data: serializedCreds
                });
                await this.whatsappSessionRepository.save(newSession);
            }
        };

        return {
            state: {
                creds,
                keys: {
                    get: async (type: string, ids: string[]) => {
                        const data: { [id: string]: any } = {};
                        await Promise.all(
                            ids.map(async (id) => {
                                const typeKey = `key-${type}`;
                                const key = await this.whatsappSessionRepository.findOne({
                                    where: { clinicId, instanceNumber: instance, type: typeKey, keyId: id }
                                });
                                if (key) {
                                    let value = JSON.parse(JSON.stringify(key.data), BufferJSON.reviver);
                                    data[id] = value;
                                }
                            })
                        );
                        return data;
                    },
                    set: async (data: any) => {
                        for (const type in data) {
                            const keysToUpdateOrDelete = Object.keys(data[type]);
                            if (keysToUpdateOrDelete.length === 0) continue;

                            const typeKey = `key-${type}`;

                            // 1. Prepare entities for Upsert
                            const entitiesToSave: WhatsappSession[] = [];
                            for (const id of keysToUpdateOrDelete) {
                                const value = data[type][id];
                                if (value) {
                                    const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                                    entitiesToSave.push(this.whatsappSessionRepository.create({
                                        clinicId,
                                        instanceNumber: instance,
                                        type: typeKey,
                                        keyId: id,
                                        data: serialized
                                    }));
                                } else {
                                    // If value is null/undefined, it means Baileys wants to DELETE this key
                                    await this.whatsappSessionRepository.delete({
                                        clinicId,
                                        instanceNumber: instance,
                                        type: typeKey,
                                        keyId: id
                                    });
                                }
                            }

                            // 2. Atomic Upsert for all new/updated keys
                            if (entitiesToSave.length > 0) {
                                await this.whatsappSessionRepository
                                    .createQueryBuilder()
                                    .insert()
                                    .into(WhatsappSession)
                                    .values(entitiesToSave)
                                    .onConflict(`("clinicId", "instanceNumber", "type", "keyId") DO UPDATE SET "data" = EXCLUDED."data"`)
                                    .execute();
                            }
                        }
                    }
                }
            },
            saveCreds
        };
    }

    async handleMessage(msg: any, clinicId: number, instance: number = 1) {
        try {
            const session = this.getSession(clinicId, instance);
            let remoteJid = msg.key?.remoteJid;

            // NEW: Normalize JID if the message comes from a Linked Device (@lid)
            if (remoteJid?.endsWith('@lid') && msg.key.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
                console.log(`[Chatbot] [Clinic ${clinicId}] Normalized @lid incoming message to: ${msg.key.remoteJidAlt}`);
                remoteJid = msg.key.remoteJidAlt;
            }

            if (!remoteJid) {
                console.log(`[Chatbot] [Clinic ${clinicId}] No remoteJid found, skipping.`);
                return;
            }

            let senderJid = msg.key.participant || remoteJid;

            if (senderJid.endsWith('@lid') && msg.key.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
                console.log(`[Chatbot] [Clinic ${clinicId}] Detected @lid JID (${senderJid}), falling back to remoteJidAlt: ${msg.key.remoteJidAlt}`);
                senderJid = msg.key.remoteJidAlt;
            }

            const phonePart = senderJid.split('@')[0];
            const phone = phonePart.split(':')[0];
            const isGroup = remoteJid.endsWith('@g.us');

            // ─── PRIORIDAD 0: Ignorar grupos ──────────────────────────────────────────
            if (isGroup) {
                console.log(`[Chatbot] [Clinic ${clinicId}] Message from group ${remoteJid} ignored.`);
                return;
            }

            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const normalizedText = text.toLowerCase();

            // Extra normalization for JID to avoid multi-device conflicts
            if (remoteJid && !remoteJid.endsWith('@g.us') && !remoteJid.endsWith('@lid')) {
                remoteJid = remoteJid.split('@')[0].split(':')[0] + '@s.whatsapp.net';
            }

            console.log(`[Chatbot] [Clinic ${clinicId}] New message from ${senderJid} in ${remoteJid}: "${text}"`);

            // Ignorar mensajes del propio número de la sesión (evitar que el bot se responda a sí mismo)
            const sessionPhone = session.sock?.user?.id?.split(':')[0]?.split('@')[0];
            const senderPhone = phone;
            if (sessionPhone && senderPhone && sessionPhone === senderPhone) {
                console.log(`[Chatbot] [Clinic ${clinicId}] Ignoring self-message from own session number ${senderPhone}`);
                return;
            }

            const phoneVariations = [
                phone,
                phone.startsWith('591') ? phone.substring(3) : '591' + phone,
                '+' + phone,
                phone.startsWith('591') ? '+' + phone : '+591' + phone
            ];

            let actor: any = null;
            let isDoctor = false;

            try {
                // Búsqueda inicial de actor (paciente o personal) con protección de error
                for (const p of phoneVariations) {
                    actor = await this.doctorsService.findByCelular(p);
                    if (actor) { isDoctor = true; break; }
                }
                if (!actor) {
                    for (const p of phoneVariations) {
                        actor = await this.personalService.findByCelular(p);
                        if (actor) break;
                    }
                }
                if (!actor) {
                    for (const p of phoneVariations) {
                        actor = await this.pacientesService.findByCelular(p);
                        if (actor) break;
                    }
                }
            } catch (identError) {
                console.error(`[Chatbot] [Clinic ${clinicId}] Error identifying user ${senderJid}:`, identError);
            }

            // Detectar despedidas para ignorar el mensaje sin re-enviar el menú (Silencio solicitado por el usuario)
            const esDespedida = /^(gracias|chau|adios|adiós|bye|hasta luego|nos vemos|ok gracias|muchas gracias|de nada|perfecto|listo)$/i.test(normalizedText.trim());
            if (esDespedida) {
                console.log(`[Chatbot] [Clinic ${clinicId}] Farewell detected from ${remoteJid}. Sending final message.`);
                await this.sendMessage(remoteJid, '¡Hasta luego! 😊 Que tenga un excelente día. Si necesita algo más, escríbanos.', clinicId, instance);
                return;
            }

            // Detectar si es un saludo o comando de reinicio para limpiar sesiones trabadas
            const esSaludo = /^(hola|buenos|buenas|menu|menú|inicio|comenzar|reset|reiniciar|o\?|hola\?)$/i.test(normalizedText.trim());
            if (esSaludo) {
                console.log(`[Chatbot] [Clinic ${clinicId}] Greeting detected from ${remoteJid}. Resetting session.`);
                session.userSessions.delete(remoteJid);
                await this.sendMenu(remoteJid, actor, clinicId, instance);
                return;
            }

            // ─── PRIORIDAD 1: Sesiones de espera activas (Recuperar estado fresco) ─────
            const freshSession = session.userSessions.get(remoteJid);

            if (freshSession && freshSession.type === 'waiting_agenda_response' && freshSession.citaId) {
                const respuesta = normalizedText.trim();

                // Reconocer letra A / emoji ✅ / palabras de confirmación
                const esConfirmar = /^(a|✅)$/i.test(respuesta) ||
                    respuesta.startsWith('a ') || respuesta.startsWith('a\n') ||
                    /\b(si|sí|confirmo|confirmar|ok|dale|bueno|perfecto)\b/i.test(respuesta) ||
                    respuesta.includes('✅');

                // Reconocer letra B / emoji ❌ / palabras de cancelación
                const esCancelar = /^(b|❌|🚫)$/i.test(respuesta) ||
                    respuesta.startsWith('b ') || respuesta.startsWith('b\n') ||
                    /\b(cancelar|cancelo|cancel)\b/i.test(respuesta) ||
                    respuesta.includes('no puedo') || respuesta.includes('no voy') ||
                    respuesta.includes('❌') || respuesta.includes('🚫');

                // Reconocer letra C / emoji 🔄 / palabras de reprogramación
                const esReprogramar = /^(c|🔄|📅)$/i.test(respuesta) ||
                    respuesta.startsWith('c ') || respuesta.startsWith('c\n') ||
                    /\b(reprogramar|reprogramo|cambiar|cambio)\b/i.test(respuesta) ||
                    respuesta.includes('otro dia') || respuesta.includes('otra fecha') ||
                    respuesta.includes('🔄') || respuesta.includes('📅');

                if (esConfirmar) {
                    try {
                        await this.agendaService.update(freshSession.citaId, { estado: 'confirmado' } as any);
                        await this.sendMessage(remoteJid, '¡Gracias! Tu cita ha sido confirmada satisfactoriamente. ✅', clinicId, instance);
                    } catch (err) {
                        await this.sendMessage(remoteJid, 'Ocurrió un error al confirmar tu cita. Por favor, contáctanos directamente.', clinicId, instance);
                    }
                    session.userSessions.delete(remoteJid);
                    return;
                } else if (esCancelar) {
                    try {
                        await this.agendaService.update(freshSession.citaId, { estado: 'cancelado' } as any);
                        await this.sendMessage(remoteJid, 'Por favor, comuníquese con la Clínica para agendar su cita en otra fecha y horario', clinicId, instance);
                    } catch (err) { }
                    session.userSessions.delete(remoteJid);
                    return;
                } else if (esReprogramar) {
                    try {
                        await this.agendaService.update(freshSession.citaId, { estado: 'cancelado', observacion: 'Paciente pidió reprogramar su cita' } as any);
                    } catch (err) {
                        console.error('[Chatbot] Error updating cita to cancelado for reprogramar:', err);
                    }
                    await this.sendMessage(remoteJid, 'Por favor, comuníquese con la Clínica para agendar su cita en otra fecha y horario', clinicId, instance);
                    session.userSessions.delete(remoteJid);
                    return;
                } else {
                    await this.sendMessage(remoteJid, 'Por favor responde con una letra:\n*A* Confirmar Cita\n*B* Cancelar Cita\n*C* Deseo reprogramar', clinicId, instance);
                    return;
                }
            }

            if (freshSession && freshSession.type === 'waiting_branch_selection') {
                console.log(`[Chatbot] [Clinic ${clinicId}] Processing branch selection for ${remoteJid}. Action: ${freshSession.branchAction}`);
                const sucursales = await this.sucursalRepository.find({ where: { clinicaId: clinicId } });
                const choice = normalizedText.trim().toUpperCase();
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                const index = letters.indexOf(choice);
                const clinica = await this.clinicaRepository.findOne({ where: { id: clinicId } });
                const clinicaNombre = clinica?.nombre || 'la Clínica';

                if (index >= 0 && index < sucursales.length) {
                    const s = sucursales[index];
                    const action = freshSession.branchAction;
                    if (action === 'DIRECCION') {
                        // 1. Enviar foto si existe
                        if (s.foto) {
                            try {
                                const base64Data = s.foto.includes(',') ? s.foto.split(',')[1] : s.foto;
                                const buffer = Buffer.from(base64Data, 'base64');
                                const sessionObj = this.getSession(clinicId, instance);
                                if (sessionObj.sock && sessionObj.status === 'connected') {
                                    await sessionObj.sock.sendMessage(remoteJid, { image: buffer, caption: `📍 ${s.nombre}` });
                                }
                            } catch (e) {
                                console.error('[Chatbot] Error sending branch photo:', e);
                            }
                        }
                        // 2. Enviar texto con dirección
                        await this.sendMessage(remoteJid, `🦷 Clínica ${clinicaNombre} 🦷\n\n📍 Dirección:\n${s.direccion}`, clinicId, instance);
                        // 3. Enviar ubicación GPS
                        if (s.latitud && s.longitud) {
                            await this.sendLocation(remoteJid, Number(s.latitud), Number(s.longitud), s.nombre, s.direccion, clinicId, instance);
                        }
                    } else {
                        await this.sendMessage(remoteJid, `El horario de atención de nuestra sucursal *${s.nombre}* es:\n⏰ ${s.horario}`, clinicId, instance);
                    }

                    // Mantener sesión activa por si quiere consultar otra sucursal
                    if (sucursales.length > 1) {
                        let otrasLetras = '';
                        sucursales.forEach((suc, i) => {
                            if (i !== index) otrasLetras += `*${letters[i]}* ${suc.nombre}\n`;
                        });
                        await this.sendMessage(remoteJid,
                            `También puedes consultar:\n${otrasLetras.trim()}\n\nEscribe la letra o *hola* para volver al menú.`,
                            clinicId, instance
                        );
                        // Refrescar sesión para que pueda elegir otra sucursal
                        session.userSessions.set(remoteJid, { type: 'waiting_branch_selection', timestamp: Date.now(), branchAction: freshSession.branchAction });
                    } else {
                        session.userSessions.delete(remoteJid);
                    }
                } else {
                    await this.sendMessage(remoteJid, "Opción no válida. Por favor responde con la letra de la sucursal (A, B...).", clinicId, instance);
                }
                return;
            }

            if (freshSession && freshSession.type === 'waiting_urgencia_response') {
                // El paciente respondió con su descripción de urgencia
                const sucursalPrincipal = await this.sucursalRepository.findOne({
                    where: { clinicaId: clinicId, es_principal: true }
                });

                let respuestaUrgencia = `👩🏻💻Gracias por su respuesta, nuestra recepcionista se contactará a la brevedad posible.`;
                if (sucursalPrincipal?.telefono) {
                    respuestaUrgencia += `\n\nTambién puede comunicarse al otro número corporativo si no obtiene una pronta respuesta.\n\n📲 *${sucursalPrincipal.telefono}*`;
                }
                await this.sendMessage(remoteJid, respuestaUrgencia, clinicId, instance);
                session.userSessions.delete(remoteJid);
                return;
            }

            if (freshSession && freshSession.type === 'waiting_otra_consulta_response') {
                await this.sendMessage(remoteJid,
                    `📲Una de nuestras recepcionistas se contactará con usted a la brevedad posible.\n\n👩🏻💻Aguarde por favor...`,
                    clinicId, instance
                );
                session.userSessions.delete(remoteJid);
                return;
            }

            // ─── PRIORIDAD 3: Si el mensaje es un número del menú (1-8) dentro de sesión activa ──
            const menuOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];
            if (menuOptions.includes(normalizedText.trim())) {
                const menuSession = session.userSessions.get(remoteJid);
                const menuIsActive = menuSession?.type === 'menu' && Date.now() - menuSession.timestamp < 5 * 60 * 1000;
                if (menuIsActive) {
                    await this.handleMenuOption(remoteJid, normalizedText.trim(), actor, 'menu', clinicId, instance);
                } else {
                    // Número enviado fuera de contexto del menú: ignorar silenciosamente
                    console.log(`[Chatbot] [Clinic ${clinicId}] Number "${normalizedText.trim()}" received outside menu context — ignored.`);
                }
                return;
            }

            // ─── PRIORIDAD 4: Intents y lógica regular ────────────────────────────────
            const intents = await this.intentosService.findAllActive();
            let matchedIntent: ChatbotIntento | null = null;

            let bestMatchKeyword = '';

            for (const intent of intents) {
                const keywords = intent.keywords.toLowerCase().split(',').map(k => k.trim());
                const matchedKeyword = keywords.find(k => {
                    const safeK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`\\b${safeK}\\b`, 'i');
                    return regex.test(normalizedText);
                });

                if (matchedKeyword && matchedKeyword.length > bestMatchKeyword.length) {
                    bestMatchKeyword = matchedKeyword;
                    matchedIntent = intent;
                }
            }

            if (matchedIntent?.target === 'USUARIO' && !isDoctor && !actor) {
                await this.sendMessage(remoteJid, 'Lo siento, esta función está reservada para el personal de la clínica.', clinicId, instance);
                return;
            }

            if (matchedIntent) {
                try {
                    switch (matchedIntent.action) {
                        case 'MENU_PRINCIPAL' as any:
                            await this.sendMenu(remoteJid, actor, clinicId, instance);
                            break;
                        case 'CONSULTAR_CITA' as any:
                            // Solo para USUARIO (doctores/personal)
                            if (isDoctor && actor) {
                                await this.checkDoctorAppointments(actor, remoteJid, clinicId, instance);
                            }
                            break;
                        case 'CONSULTAR_CITA_HOY':
                            if (isDoctor && actor) {
                                await this.checkDoctorAppointmentsToday(actor, remoteJid, clinicId, instance);
                            }
                            break;
                        case 'TEXTO_LIBRE':
                            if (matchedIntent.replyTemplate) {
                                await this.sendMessage(remoteJid, matchedIntent.replyTemplate, clinicId, instance);
                            }
                            break;
                        case 'CONSULTAR_INVENTARIO' as any:
                            await this.handleConsultarInventario(remoteJid, normalizedText, clinicId, instance);
                            break;
                    }
                } catch (error: any) {
                    console.error(`[Chatbot] Error processing intent "${matchedIntent.action}" for ${remoteJid}:`, error?.message || error);
                }
            } else {
                // Si hay una sesión activa en progreso, NO interrumpir
                const currentSession = session.userSessions.get(remoteJid);
                if (currentSession) {
                    console.log(`[Chatbot] [Clinic ${clinicId}] Ignoring unrecognized message while in session state: ${currentSession.type}`);
                    return;
                }
                // Mensaje no reconocido sin sesión activa: silencio total
                console.log(`[Chatbot] [Clinic ${clinicId}] Unrecognized message from ${remoteJid}: "${normalizedText}" — silent.`);
            }
        } catch (globalError) {
            console.error(`[Chatbot] [Clinic ${clinicId}] CRITICAL ERROR in handleMessage:`, globalError);
        }
    }


    private fullName(p: any): string {
        return [p?.nombre, p?.paterno, p?.materno].filter(Boolean).join(' ');
    }

    async sendMenu(remoteJid: string, actor: any, clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);

        // Debounce: evitar enviar el menú dos veces en menos de 3 segundos
        const existing = session.userSessions.get(remoteJid);
        if (existing?.type === 'menu' && Date.now() - existing.timestamp < 3000) {
            console.log(`[Chatbot] [Clinic ${clinicId}] Menú ya enviado recientemente a ${remoteJid}, ignorando duplicado.`);
            return;
        }

        const clinica = await this.clinicaRepository.findOne({ where: { id: clinicId } });
        const clinicaNombre = clinica?.nombre || 'la clínica';

        const message = `👩🏻💻¡Hola!\n\n` +
            `🦷Bienvenido(a) a ${clinicaNombre}, será un gusto ayudarle.\n\n` +
            `Responda con el NÚMERO de la opción de su consulta.\n\n` +
            `MENÚ:\n` +
            `1. Quiero agendar cita\n` +
            `2. Ubicación de la clínica \n` +
            `3. Horarios de atención\n` +
            `4. Atención de urgencia\n` +
            `5. Mis próximas citas agendadas\n` +
            `6. Deudas pendientes \n` +
            `7. Con qué especialidades cuenta la clínica\n` +
            `8. Requiero otro tipo de consulta\n\n` +
            `📌 Por favor guarda nuestro número para recibir tus recordatorios.`;

        session.userSessions.set(remoteJid, { type: 'menu', timestamp: Date.now() });
        await this.sendMessage(remoteJid, message, clinicId, instance);
    }

    async handleMenuOption(remoteJid: string, option: string, actor: any, type: string, clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        const opt = option.trim();

        switch (opt) {
            case '1': // Agendar cita
                const agendarMsg = `👩🏻💻 DATOS PARA AGENDAR CITA\n\n` +
                    `👤Nombres y Apellidos (COMPLETO):\n\n` +
                    `🪪Carnet de Identidad:\n\n` +
                    `📇Edad del/la paciente: \n\n` +
                    `📋Motivo de la consulta:\n\n` +
                    `🕙¿A partir de qué horario?:\n\n` +
                    `📍 Sucursal:\n\n` +
                    `🏥 ¿Cuenta con seguro o es de forma privada?:`;
                await this.sendMessage(remoteJid, agendarMsg, clinicId, instance);
                break;
            case '2': // Ubicación
                await this.handleBranchInfoRequest(remoteJid, 'DIRECCION', clinicId, instance);
                break;
            case '3': { // Horarios
                const sucursalesHorario = await this.sucursalRepository.find({ where: { clinicaId: clinicId } });
                if (sucursalesHorario.length === 0) {
                    await this.sendMessage(remoteJid, 'Por el momento no tenemos horarios registrados. Por favor, contáctenos directamente.', clinicId, instance);
                } else {
                    let horarioMsg = `⏰ Horarios de atención:\n\n`;
                    sucursalesHorario.forEach(s => {
                        horarioMsg += `📍 ${s.nombre}\n${s.horario || 'Horario no disponible'}\n\n`;
                    });
                    await this.sendMessage(remoteJid, horarioMsg.trim(), clinicId, instance);
                }
                break;
            }
            case '4': { // Urgencia
                const urgenciaMsg = `🚨Por favor, responda en un sólo párrafo:\n\n` +
                    `- Describa su urgencia\n` +
                    `- ¿Del 1 al 10 cuánto dolor siente?\n` +
                    `- ¿Tomó algún medicamento las últimas 24 horas? (Indique cuál)`;
                await this.sendMessage(remoteJid, urgenciaMsg, clinicId, instance);
                session.userSessions.set(remoteJid, { type: 'waiting_urgencia_response', timestamp: Date.now() });
                break;
            }
            case '5': // Próximas citas
                if (actor) {
                    await this.checkAppointments(actor, remoteJid, clinicId, instance);
                } else {
                    await this.sendMessage(remoteJid, "Para consultar sus citas, debe estar registrado en el Sistema. Por favor, indíquenos su nombre completo para buscarlo.", clinicId, instance);
                }
                break;
            case '6': // Deudas pendientes
                if (actor) {
                    await this.executeConsultarSaldo(actor, remoteJid, clinicId, instance);
                } else {
                    await this.sendMessage(remoteJid, "Para consultar sus deudas, debe estar registrado en el Sistema. Por favor, indíquenos su nombre completo para buscarlo.", clinicId, instance);
                }
                break;
            case '7': { // Especialidades
                const especialidades = await this.especialidadRepository.find({ where: { estado: 'activo' } });
                if (especialidades.length === 0) {
                    await this.sendMessage(remoteJid, '🏥 Por el momento no tenemos especialidades registradas.', clinicId, instance);
                } else {
                    let espMsg = `🏥Contamos con las siguientes especialidades:\n\n`;
                    especialidades.forEach(e => {
                        espMsg += `• ${e.especialidad}\n`;
                    });
                    await this.sendMessage(remoteJid, espMsg.trim(), clinicId, instance);
                }
                break;
            }
            case '8': { // Otro
                const otraConsultaMsg = `(Por favor, escriba en un sólo párrafo)\n📋¿Cuál es su consulta?`;
                await this.sendMessage(remoteJid, otraConsultaMsg, clinicId, instance);
                session.userSessions.set(remoteJid, { type: 'waiting_otra_consulta_response', timestamp: Date.now() });
                break;
            }
            default:
                await this.sendMessage(remoteJid, "Opción no válida. Por favor, responda con el NÚMERO de la opción deseada (1-8).", clinicId, instance);
                break;
        }

        // Nota: las opciones 2, 4 y 8 setean su propio estado de espera (waiting_*).
        // Las demás opciones (1, 3, 5, 6, 7) son respuestas finales sin flujo adicional.
    }

    async executeConsultarSaldo(actor: any, remoteJid: string, clinicId: number, instance: number = 1) {
        try {
            // Reutilizamos el nuevo método que genera el texto y envía el QR
            await this.enviarSaldoDeudor(actor.id, clinicId, instance);
        } catch (error: any) {
            console.error('[Chatbot] Error in executeConsultarSaldo:', error);
            const errMsg = error.message || 'Hubo un error al generar su estado de cuenta.';
            await this.sendMessage(remoteJid, errMsg, clinicId, instance);
        }
    }

    async executeConsultarPresupuesto(actor: any, remoteJid: string, clinicId: number, instance: number = 1) {
        const proformas = await this.proformasService.findAllByPaciente(actor.id);
        const clinica = await this.clinicaRepository.findOne({ where: { id: clinicId } });

        if (proformas.length > 0) {
            try {
                const pdfBuffer = await this.pdfService.generateProformasPdf(actor, proformas, clinica);
                await this.sendMessage(remoteJid, {
                    document: pdfBuffer,
                    mimetype: 'application/pdf',
                    fileName: `Plan_Tratamiento_${actor.nombre}_${Date.now()}.pdf`,
                    caption: `Hola ${this.fullName(actor)}, aquí tiene sus Planes de Tratamiento en PDF.`
                }, clinicId, instance);
            } catch (error) {
                await this.sendMessage(remoteJid, 'Hubo un error al generar su archivo de Plan de Tratamiento. Por favor, intente nuevamente.', clinicId, instance);
            }
        } else {
            await this.sendMessage(remoteJid, `Hola ${this.fullName(actor)}, no encontré Planes de Tratamiento registrados.`, clinicId, instance);
        }
    }

    async calculateDetailedSaldo(pacienteId: number, clinicId: number, historiaClinicaId?: number): Promise<string> {
        const historia = await this.historiaClinicaService.findAllByPaciente(pacienteId);
        
        // Group historia by treatment group (Detalle ID + Pieza)
        const groups = new Map<string, any>();
        
        historia.forEach((h: any) => {
            const key = h.proformaDetalleId ? `DET-${h.proformaDetalleId}-${h.pieza || ''}` : `HC-${h.id}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    ids: [],
                    tratamiento: h.tratamiento,
                    saldo: 0,
                    montoPagado: 0,
                    precio: 0,
                    cantidad: 0
                });
            }
            const g = groups.get(key);
            g.ids.push(h.id);
            g.saldo += Number(h.saldo || 0);
            g.montoPagado += Number(h.montoPagado || 0);
            g.precio += Number(h.precio || 0);
            g.cantidad += Number(h.cantidad || 1);
        });

        const lines: string[] = [];
        let totalNeto = 0;

        // If we are filtering by a specific treatment (from the report button)
        let filteredGroups = Array.from(groups.values());
        if (historiaClinicaId) {
            filteredGroups = filteredGroups.filter(g => g.ids.includes(Number(historiaClinicaId)));
        }

        filteredGroups.forEach(g => {
            if (g.saldo > 0.01) {
                totalNeto += g.saldo;
                const qtyText = g.cantidad > 1 ? ` (Cant: ${g.cantidad})` : '';
                lines.push(`🦷 *${g.tratamiento || 'Tratamiento'}*${qtyText}\n• Saldo: *Bs. ${g.saldo.toFixed(2)}*`);
            }
        });

        if (lines.length === 0) {
            if (historiaClinicaId) return "Este tratamiento ya se encuentra totalmente cancelado.";
            return "¡Felicidades! Actualmente no tienes ningún saldo pendiente con la clínica.";
        }

        const breakdown = lines.join('\n\n');
        return historiaClinicaId ? breakdown : (breakdown + `\n\n💰 *Total pendiente: Bs. ${totalNeto.toFixed(2)}*`);
    }

    async checkAppointments(paciente: any, remoteJid: string, clinicId: number, instance: number = 1) {
        const appointments = await this.agendaService.findAllByPaciente(paciente.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureAppointments = appointments.filter(a => {
            if (a.clinicaId !== clinicId) return false;
            const [year, month, day] = a.fecha.toString().split('-').map(Number);
            const appDateObj = new Date(year, month - 1, day);
            return appDateObj >= today;
        }).sort((a, b) => {
            if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
            return a.hora.localeCompare(b.hora);
        });

        if (futureAppointments.length > 0) {
            const replies = futureAppointments.map(app => {
                // Format time to HH:mm (remove seconds)
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                const [y, m, d] = app.fecha.toString().split('-');
                const fechaFormateada = `${d}/${m}/${y}`;
                return `- ${fechaFormateada} a las ${timeFormatted}`;
            });

            const reply = `Hola ${this.fullName(paciente)}, tienes las siguientes citas programadas:\n\n${replies.join('\n')}`;
            await this.sendMessage(remoteJid, reply, clinicId, instance);
        } else {
            const reply = `Hola ${this.fullName(paciente)}, no encontré citas futuras agendadas.`;
            await this.sendMessage(remoteJid, reply, clinicId, instance);
        }
    }

    async checkDoctorAppointments(doctor: any, remoteJid: string, clinicId: number, instance: number = 1) {
        const appointments = await this.agendaService.findAllByDoctor(doctor.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const weeklyAppointments = appointments.filter(a => {
            const [year, month, day] = a.fecha.toString().split('-').map(Number);
            const appDateObj = new Date(year, month - 1, day);
            return appDateObj >= today && appDateObj <= nextWeek;
        }).sort((a, b) => {
            if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
            return a.hora.localeCompare(b.hora);
        });

        if (weeklyAppointments.length > 0) {
            const replies = weeklyAppointments.map(app => {
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                const pacienteName = app.paciente ? `${app.paciente.nombre} ${app.paciente.paterno}` : 'Paciente sin nombre';
                return `📅 ${app.fecha} 🕒 ${timeFormatted}\n👤 ${pacienteName}\n🏥 ${app.clinica?.nombre || 'Clínica'}\n📝 ${app.tratamiento || 'Consulta'}`;
            });
            const reply = `Dr. ${doctor.paterno}, sus citas para esta semana:\n\n${replies.join('\n\n')}`;
            await this.sendMessage(remoteJid, reply, clinicId, instance);
        } else {
            await this.sendMessage(remoteJid, `Dr. ${doctor.paterno}, no tiene citas programadas para esta semana.`, clinicId, instance);
        }
    }

    async checkDoctorAppointmentsToday(doctor: any, remoteJid: string, clinicId: number, instance: number = 1) {
        const appointments = await this.agendaService.findAllByDoctor(doctor.id);

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const todayAppointments = appointments
            .filter(a => a.fecha === todayStr && a.estado === 'confirmado')
            .sort((a, b) => a.hora.localeCompare(b.hora));

        if (todayAppointments.length > 0) {
            const replies = todayAppointments.map(app => {
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                const pacienteName = app.paciente ? `${app.paciente.nombre} ${app.paciente.paterno}` : 'Paciente sin nombre';
                return `📅 ${app.fecha} 🕒 ${timeFormatted}\n👤 ${pacienteName}\n🏥 ${app.clinica?.nombre || 'Clínica'}\n📝 ${app.tratamiento || 'Consulta'}`;
            });
            const reply = `Dr. ${doctor.paterno}, sus citas para HOY:\n\n${replies.join('\n\n')}`;
            await this.sendMessage(remoteJid, reply, clinicId, instance);
        }
    }

    async sendBirthdayGreeting(pacienteId: number, clinicId: number) {
        const paciente = await this.pacientesService.findOne(pacienteId);
        if (!paciente) {
            throw new Error('Paciente no encontrado');
        }

        const currentYear = new Date().getFullYear();
        if (paciente.ultimo_cumpleanos_felicitado === currentYear) {
            throw new Error('Ya se envió una felicitación a este paciente este año');
        }

        let celular = paciente.celular?.replace(/\D/g, '');
        if (!celular) {
            throw new Error('El paciente no tiene número de celular registrado');
        }

        if (!celular.startsWith('591') && celular.length === 8) {
            celular = `591${celular}`;
        }
        const jid = `${celular}@s.whatsapp.net`;

        const clinica = await this.clinicaRepository.findOne({ where: { id: clinicId } });
        const clinicaText = clinica ? clinica.nombre : 'la clínica';
        const text = `¡Hola ${paciente.nombre} ${paciente.paterno}! 🎉 En nombre de todo el equipo de ${clinicaText}, te deseamos un muy feliz cumpleaños. ¡Que tengas un excelente día! 🎂🎈\n\n📌 Hola, somos ${clinicaText}, por favor guarda nuestro número para recibir tus felicitaciones y recordatorios.`;

        await this.sendMessage(jid, text, clinicId);

        await this.pacientesService.update(pacienteId, { ultimo_cumpleanos_felicitado: currentYear } as any);
        return { success: true };
    }

    async sendMessage(jid: string, content: string | any, clinicId?: number, instance?: number) {
        if (!clinicId) {
            console.warn(`[Chatbot] sendMessage called without clinicId for ${jid}. Falling back to first connected session.`);
            for (const [key, s] of this.sessions.entries()) {
                if (s.status === 'connected' && s.sock) {
                    const [cid] = key.split('-');
                    clinicId = Number(cid);
                    instance = Number(key.split('-')[1]);
                    break;
                }
            }
        }

        if (!clinicId) {
            throw new Error('No se especificó clinicId y no hay sesiones activas');
        }

        // If instance not specified, find any connected for this clinic
        if (!instance) {
            for (const inst of [1, 2]) {
                const s = this.getSession(clinicId, inst);
                if (s.status === 'connected' && s.sock) {
                    instance = inst;
                    break;
                }
            }
        }

        // Default to instance 1 if still not found
        if (!instance) instance = 1;

        const session = this.getSession(clinicId, instance);
        if (session.status !== 'connected' || !session.sock) {
            console.warn(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Cannot send message to ${jid}: Not connected (status: ${session.status})`);
            throw new Error(`El chatbot (Instancia ${instance}) no está conectado a WhatsApp`);
        }

        try {
            await session.sock.sendPresenceUpdate('composing', jid);
            // Anti-ban delay (1-3 seconds)
            const delayMs = Math.floor(Math.random() * 2000) + 1000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            await session.sock.sendPresenceUpdate('paused', jid);

            if (typeof content === 'string') {
                await session.sock.sendMessage(jid, { text: content });
            } else {
                await session.sock.sendMessage(jid, content);
            }
        } catch (error) {
            console.error(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Error sending message:`, error);
            throw error;
        }
    }

    async sendLocation(jid: string, lat: number, lon: number, name: string, address: string, clinicId?: number, instance?: number) {
        try {
            await this.sendMessage(jid, {
                location: {
                    degreesLatitude: lat,
                    degreesLongitude: lon,
                    name,
                    address,
                }
            }, clinicId, instance);
        } catch (error) {
            console.error(`[Chatbot] Error sending location to ${jid}:`, error);
        }
    }

    async sendAgendaPoll(jid: string, pollName: string, options: string[], citaId: number, clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        if (session.status !== 'connected' || !session.sock) {
            console.warn(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Cannot send poll to ${jid}: Not connected`);
            throw new Error(`El chatbot (Instancia ${instance}) no está conectado a WhatsApp`);
        }

        try {
            await session.sock.sendPresenceUpdate('composing', jid);
            // Increased delay to 3-8 seconds
            const delayMs = Math.floor(Math.random() * 5000) + 3000;
            await new Promise(resolve => setTimeout(resolve, delayMs));
            await session.sock.sendPresenceUpdate('paused', jid);

            const msg = await session.sock.sendMessage(jid, {
                poll: {
                    name: pollName,
                    values: options,
                    selectableCount: 1
                }
            });
            session.pollStore.set(msg?.key?.id, { message: msg.message, citaId });
            try {
                fs.appendFileSync(`chatbot-poll-clinic-${clinicId}-inst-${instance}.log`, `\n[${new Date().toISOString()}] Sent Poll for Cita ${citaId}. msg.key.id: ${msg?.key?.id}\n`);
            } catch (e) { }
            return msg;
        } catch (error) {
            console.error(`[Chatbot] [Clinic ${clinicId}] [Instance ${instance}] Error sending poll:`, error);
            throw error;
        }
    }

    /**
     * Envía un menú de texto A/B al paciente y registra sesión waiting_agenda_response.
     */
    async sendAgendaMenu(jid: string, mensajeIntro: string, citaId: number, clinicId: number, instance: number = 1): Promise<void> {
        const session = this.getSession(clinicId, instance);
        const clinica = await this.clinicaRepository.findOne({ where: { id: clinicId } });
        const nomClinica = clinica?.nombre || 'la Clínica';
        const menuTexto = `${mensajeIntro}\n\nPor favor responde con una letra:\n*A* Confirmar Cita\n*B* Cancelar Cita\n*C* Deseo reprogramar\n\n⚠️ IMPORTANTE: - Si presenta resfrío o una enfermedad de riesgo no podremos brindarle la atención para evitar contagios del personal de la clínica y pacientes en general. Para ello deberá informar y se reprogramará la cita cuando se haya recuperado.\n\n📌 Por favor guarda nuestro número para recibir tus recordatorios.`;
        await this.sendMessage(jid, menuTexto, clinicId, instance);
        session.userSessions.set(jid, {
            type: 'waiting_agenda_response' as any,
            timestamp: Date.now(),
            citaId,
        });
    }

    async handleAgendaPollResponse(selectedOption: string, citaId: number, remoteJid: string, clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        if (selectedOption.includes('Confirmar')) {
            await this.agendaService.update(citaId, { estado: 'confirmado' } as any);
            await this.sendMessage(remoteJid, "¡Gracias! Tu cita ha sido confirmada satisfactoriamente.", clinicId, instance);
        } else if (selectedOption.includes('Cancelar')) {
            try {
                await this.agendaService.update(citaId, { estado: 'cancelado' } as any);
                await this.sendMessage(remoteJid, 'Por favor, comuníquese con la Clínica para agendar su cita en otra fecha y horario', clinicId, instance);
            } catch (err) { }
        }
    }

    getStatus(clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        let phoneNumber = null;

        if (session.status === 'connected' && session.sock?.user?.id) {
            phoneNumber = session.sock.user.id.split(':')[0];
        }

        return {
            status: session.status,
            qr: session.qrCode,
            phoneNumber
        };
    }

    async disconnect(clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        if (session.sock) {
            session.intentionalDisconnect = true;
            session.sock.end(undefined);
            session.status = 'disconnected';
            session.qrCode = null;
            session.initializationStartTime = null;

            if (session.initializationTimeout) {
                clearTimeout(session.initializationTimeout);
                session.initializationTimeout = null;
            }
        }
    }

    async resetSession(clinicId: number, instance: number = 1) {
        await this.disconnect(clinicId, instance);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const session = this.getSession(clinicId, instance);
        session.status = 'disconnected';
        session.qrCode = null;

        // Clear database sessions for this clinic and instance
        await this.whatsappSessionRepository.delete({ clinicId, instanceNumber: instance });
        console.log(`[Chatbot] Deleted database sessions for Clinic ${clinicId} Instance ${instance}`);
    }

    private async handleConsultarInventario(remoteJid: string, text: string, clinicId: number, instance: number = 1) {
        const keywords = ['cuanto', 'cuantos', 'hay', 'stock', 'existencia', 'inventario', 'de'];
        let itemName = text;

        keywords.forEach(k => {
            const regex = new RegExp(`\\b${k}\\b`, 'gi');
            itemName = itemName.replace(regex, '');
        });

        itemName = itemName.replace(/[?¿!]/g, '').trim();

        if (!itemName) {
            await this.sendMessage(remoteJid, 'Por favor, dime qué producto deseas consultar. Ejemplo: "¿Cuánto algodón hay?"', clinicId, instance);
            return;
        }

        const result = await this.inventarioService.findAll(itemName, 1, 5);

        if (result.data.length === 0) {
            await this.sendMessage(remoteJid, `Lo siento, no encontré productos que coincidan con "${itemName}" en el inventario.`, clinicId, instance);
        } else if (result.data.length === 1) {
            const item = result.data[0];
            await this.sendMessage(remoteJid, `*Inventario:* ${item.descripcion}\n` +
                `- Clínica: ${item.clinica?.nombre || 'General'}\n` +
                `- Cantidad existente: ${item.cantidad_existente}\n` +
                `- Stock mínimo: ${item.stock_minimo}`, clinicId, instance);
        } else {
            let reply = `Encontré varios resultados para "${itemName}":\n\n`;
            result.data.forEach(item => {
                reply += `*${item.descripcion}*\n- Clínica: ${item.clinica?.nombre || 'General'}\n- Existencia: ${item.cantidad_existente} | Mínimo: ${item.stock_minimo}\n\n`;
            });
            reply += `Por favor, intenta ser más específico si no ves el producto que buscas.`;
            await this.sendMessage(remoteJid, reply, clinicId, instance);
        }
    }

    async enviarSaldoDeudor(pacienteId: number, clinicId: number, instance: number = 1, historiaClinicaId?: number): Promise<{ success: boolean; message: string }> {
        const paciente = await this.pacientesService.findOne(pacienteId);
        if (!paciente) throw new Error('Paciente no encontrado');

        let celular = paciente.celular?.replace(/\D/g, '');
        if (!celular) throw new Error('El paciente no tiene número de celular registrado');
        if (celular.length === 8 && /^[67]/.test(celular)) celular = `591${celular}`;
        const jid = `${celular}@s.whatsapp.net`;

        const clinica = await this.clinicaRepository.findOne({ where: { id: clinicId } });
        const nomClinica = clinica?.nombre || 'la Clínica';
        const nombrePaciente = `${paciente.nombre || ''} ${paciente.paterno || ''} ${paciente.materno || ''}`.trim();

        const messageText = await this.calculateDetailedSaldo(pacienteId, clinicId, historiaClinicaId);

        // If the return was the "Felicidades" message, we don't throw error but send it
        const finalMessage = `Hola *${nombrePaciente}*, le informamos sobre su estado de cuenta en *${nomClinica}*:\n\n${messageText}\n\nPor favor, comuníquese con la clínica para cualquier duda u observación.`;

        await this.sendMessage(jid, finalMessage, clinicId, instance);

        // Send QR if available and there is actual debt (and not a "Felicidades" message)
        if (clinica?.qr_pago && !messageText.includes('Felicidades') && !messageText.includes('cancelado')) {
            try {
                const session = this.getSession(clinicId, instance);
                if (session.sock && session.status === 'connected') {
                    const base64Data = clinica.qr_pago.split(',')[1];
                    if (base64Data) {
                        const buffer = Buffer.from(base64Data, 'base64');
                        await session.sock.sendMessage(jid, {
                            image: buffer,
                            caption: 'Escanee este código QR para realizar su pago.'
                        });
                    }
                }
            } catch (error) {
                console.error('Error al enviar QR de pago:', error);
            }
        }

        return { success: true, message: 'Mensaje enviado correctamente' };
    }

    private async handleBranchInfoRequest(remoteJid: string, action: 'DIRECCION' | 'HORARIO', clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        const sucursales = await this.sucursalRepository.find({ where: { clinicaId: clinicId } });
        const clinica = await this.clinicaRepository.findOne({ where: { id: clinicId } });
        const clinicaNombre = clinica?.nombre || 'la Clínica';

        if (sucursales.length === 0) {
            await this.sendMessage(remoteJid, `Por el momento no tenemos sucursales registradas.`, clinicId, instance);
            return;
        }

        if (sucursales.length === 1) {
            const s = sucursales[0];
            if (action === 'DIRECCION') {
                if (s.foto) {
                    try {
                        const base64Data = s.foto.includes(',') ? s.foto.split(',')[1] : s.foto;
                        const buffer = Buffer.from(base64Data, 'base64');
                        const sessionObj = this.getSession(clinicId, instance);
                        if (sessionObj.sock && sessionObj.status === 'connected') {
                            await sessionObj.sock.sendMessage(remoteJid, { image: buffer, caption: `📍 ${s.nombre}` });
                        }
                    } catch (e) {
                        console.error('[Chatbot] Error sending branch photo:', e);
                    }
                }
                await this.sendMessage(remoteJid, `🦷 Clínica ${clinicaNombre} 🦷\n\n📍 Dirección:\n${s.direccion}`, clinicId, instance);
                if (s.latitud && s.longitud) {
                    await this.sendLocation(remoteJid, Number(s.latitud), Number(s.longitud), s.nombre, s.direccion, clinicId, instance);
                }
            } else {
                await this.sendMessage(remoteJid, `El horario de atención de nuestra sucursal *${s.nombre}* es:\n⏰ ${s.horario}`, clinicId, instance);
            }
            return;
        }

        // Múltiples sucursales: menú con letras A, B, C...
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const label = action === 'DIRECCION' ? 'dirección' : 'horario';
        let menu = `📍 *Sucursales*\nResponda con una LETRA:\n\n`;
        sucursales.forEach((s, i) => {
            menu += `*${letters[i]}* ${s.nombre}\n`;
        });

        session.userSessions.set(remoteJid, {
            type: 'waiting_branch_selection',
            timestamp: Date.now(),
            branchAction: action
        });
        await this.sendMessage(remoteJid, menu, clinicId, instance);
    }

    async sendPdf(jid: string, buffer: Buffer, fileName: string, clinicId: number, instance: number = 1) {
        const session = this.getSession(clinicId, instance);
        if (session.sock && session.status === 'connected') {
            await session.sock.sendMessage(jid, {
                document: buffer,
                mimetype: 'application/pdf',
                fileName: fileName
            });
            return { success: true };
        } else {
            throw new Error('Chatbot no conectado o no inicializado');
        }
    }
}
