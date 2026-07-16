import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateProformaDto } from './dto/create-proforma.dto';
import { UpdateProformaDto } from './dto/update-proforma.dto';
import { Proforma } from './entities/proforma.entity';
import { User } from '../users/entities/user.entity';
import { ProformaDetalle } from './entities/proforma-detalle.entity';
import { ProformaImagen } from './entities/proforma-imagen.entity';
import { UsersService } from '../users/users.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import * as fs from 'fs';
import * as path from 'path';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';
import { HistoriaClinicaService } from '../historia_clinica/historia_clinica.service';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';
import { LocalStorageService } from '../common/storage/local-storage.service';
import { getBoliviaDate } from '../common/utils/date.utils';
import { Paciente } from '../pacientes/entities/paciente.entity';

@Injectable()
export class ProformasService {
  constructor(
    @InjectRepository(Proforma)
    private readonly proformaRepository: Repository<Proforma>,
    @InjectRepository(ProformaDetalle)
    private readonly detalleRepository: Repository<ProformaDetalle>,
    @InjectRepository(ProformaImagen)
    private readonly imagenRepository: Repository<ProformaImagen>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly storageService: SupabaseStorageService,
    private readonly localStorageService: LocalStorageService,
    @Inject(forwardRef(() => ChatbotService))
    private readonly chatbotService: ChatbotService,
    private readonly historiaClinicaService: HistoriaClinicaService,
  ) { }

  async create(createProformaDto: CreateProformaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get correlative number for patient
      const lastProforma = await queryRunner.manager.findOne(Proforma, {
        where: { pacienteId: createProformaDto.pacienteId },
        order: { numero: 'DESC' },
      });
      const nextNumero = (lastProforma?.numero || 0) + 1;

      // 2. Create Proforma Header
      const proforma = new Proforma();
      proforma.pacienteId = createProformaDto.pacienteId;
      proforma.usuarioId = createProformaDto.usuarioId;
      proforma.numero = nextNumero;
      proforma.nota = createProformaDto.nota || '';
      
      // Get patient to find their clinic if not provided
      const patient = await queryRunner.manager.findOne(Paciente as any, { where: { id: proforma.pacienteId } });
      proforma.clinicaId = createProformaDto.clinicaId || (patient as any)?.clinicaId || null;

      proforma.fecha = createProformaDto.fecha
        ? createProformaDto.fecha.split('T')[0]
        : getBoliviaDate();

      // Handle Signature (Upload to Supabase if Base64, fallback to local storage)
      if (createProformaDto['firma'] && createProformaDto['firma'].startsWith('data:image')) {
        const bucket = 'clinica-media';
        const fileName = `signature-proforma-${Date.now()}`;
        
        if (this.storageService.isConfigured()) {
          try {
            proforma.firma = await this.storageService.uploadBase64(bucket, fileName, createProformaDto['firma']);
          } catch (error) {
            console.warn('[ProformasService] Supabase upload failed, falling back to local storage:', error.message);
            proforma.firma = await this.localStorageService.uploadBase64(bucket, fileName, createProformaDto['firma']);
          }
        } else {
          proforma.firma = await this.localStorageService.uploadBase64(bucket, fileName, createProformaDto['firma']);
        }
      }

      // Totals calculation
      proforma.total = createProformaDto.detalles.reduce((sum, item) => item.posible ? sum : sum + Number(item.total), 0);

      const savedProforma = await queryRunner.manager.save(proforma);

      // 3. Create Details
      const detalles = createProformaDto.detalles.map(item => {
        const detalle = new ProformaDetalle();
        detalle.proforma = savedProforma;
        detalle.arancelId = item.arancelId;
        detalle.precioUnitario = item.precioUnitario;
        detalle.piezas = item.piezas || '';
        detalle.cantidad = item.cantidad;
        detalle.total = item.total;
        detalle.posible = item.posible;
        detalle.tipoPrecio = item.tipoPrecio || 'normal';
        return detalle;
      });

      await queryRunner.manager.save(ProformaDetalle, detalles);

      await queryRunner.commitTransaction();
      return this.findOne(savedProforma.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Error creating proforma:', err);
      // Construct a meaningful error message
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new NotFoundException(`Error creando proforma: ${msg}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(limit: number = 20, page: number = 1, clinicaId?: number) {
    const options: any = {
      relations: ['paciente', 'usuario', 'detalles', 'detalles.arancel'],
      order: { fecha: 'DESC' },
      take: limit,
      skip: (page - 1) * limit
    };

    if (clinicaId) {
      options.where = { clinicaId };
    }

    return this.proformaRepository.find(options);
  }

  async findAllByPaciente(pacienteId: number, clinicaId?: number) {
    const where: any = { pacienteId };
    if (clinicaId) {
      where.clinicaId = clinicaId;
    }

    const proformas = await this.proformaRepository.find({
      where,
      relations: ['usuario', 'detalles', 'detalles.arancel'],
      order: { numero: 'DESC' }
    });

    // We need to include the estadoPresupuesto from HistoriaClinica
    const results = await Promise.all(proformas.map(async (p) => {
      const hcEntry = await this.dataSource.getRepository(HistoriaClinica).findOne({
        where: { proformaId: p.id },
        order: { id: 'DESC' } // Take latest status if multiple entries exist
      });

      return {
        ...p,
        estadoPresupuesto: hcEntry?.estadoPresupuesto || 'no terminado'
      };
    }));

    return results;
  }

  async findOne(id: number) {
    const proforma = await this.proformaRepository.createQueryBuilder('proforma')
      .leftJoinAndSelect('proforma.paciente', 'paciente')
      .leftJoinAndSelect('proforma.usuario', 'usuario')
      .leftJoinAndSelect('proforma.detalles', 'detalles')
      .leftJoinAndSelect('detalles.arancel', 'arancel')
      .leftJoinAndSelect('proforma.clinica', 'clinica')
      .where('proforma.id = :id', { id })
      // Seleccionamos campos específicos para evitar traer la 'firma' (Base64 pesado)
      .select([
        'proforma.id', 'proforma.pacienteId', 'proforma.numero', 'proforma.fecha', 
        'proforma.total', 'proforma.nota', 'proforma.usuarioId', 'proforma.clinicaId',
        'proforma.createdAt', 'proforma.updatedAt',
        'paciente.id', 'paciente.nombre', 'paciente.paterno', 'paciente.materno', 'paciente.celular',
        'usuario.id', 'usuario.name',
        'detalles.id', 'detalles.arancelId', 'detalles.precioUnitario', 'detalles.piezas', 'detalles.cantidad', 'detalles.total', 'detalles.posible', 'detalles.tipoPrecio',
        'arancel.id', 'arancel.detalle',
        'clinica.id', 'clinica.nombre'
      ])
      .getOne();

    if (!proforma) throw new NotFoundException(`Proforma #${id} not found`);
    return proforma;
  }

  async update(id: number, updateProformaDto: UpdateProformaDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const proforma = await queryRunner.manager.findOne(Proforma, {
        where: { id },
        relations: ['detalles'],
      });

      if (!proforma) throw new NotFoundException(`Proforma #${id} not found`);

      // Update header fields
      if (updateProformaDto.nota !== undefined) proforma.nota = updateProformaDto.nota;
      if (updateProformaDto.fecha) proforma.fecha = updateProformaDto.fecha.split('T')[0];
      if (updateProformaDto.usuarioId) proforma.usuarioId = updateProformaDto.usuarioId; // Update registered user

      if (updateProformaDto.total !== undefined) proforma.total = updateProformaDto.total;
      if (updateProformaDto.clinicaId !== undefined) proforma.clinicaId = updateProformaDto.clinicaId;

      // Handle Signature update (Upload to Supabase if Base64, fallback to local storage)
      if (updateProformaDto['firma'] && updateProformaDto['firma'].startsWith('data:image')) {
        const bucket = 'clinica-media';
        const fileName = `signature-proforma-${id}-${Date.now()}`;

        if (this.storageService.isConfigured()) {
          try {
            proforma.firma = await this.storageService.uploadBase64(bucket, fileName, updateProformaDto['firma']);
          } catch (error) {
            console.warn('[ProformasService] Supabase upload failed during update, falling back to local storage:', error.message);
            proforma.firma = await this.localStorageService.uploadBase64(bucket, fileName, updateProformaDto['firma']);
          }
        } else {
          proforma.firma = await this.localStorageService.uploadBase64(bucket, fileName, updateProformaDto['firma']);
        }
      } else if (updateProformaDto['firma'] !== undefined) {
        proforma.firma = updateProformaDto['firma'];
      }

      // Recalculate total if details are provided
      if (updateProformaDto.detalles) {
        // Smart Update Strategy:
        // 1. Identify which details to keep/update
        // 2. Identify which details to create
        // 3. Identify which details to remove

        const incomingDetails = updateProformaDto.detalles;
        const incomingIds = incomingDetails.filter(d => d.id).map(d => d.id);

        // Items to remove: Exists in DB but not in incoming payload
        const detailsToRemove = proforma.detalles.filter(d => !incomingIds.includes(d.id));

        if (detailsToRemove.length > 0) {
          // We attempt to remove. If this fails due to FK (item used in History), it will throw, 
          // which is expected (cannot delete used item), but at least we don't delete *everything*.
          await queryRunner.manager.remove(detailsToRemove);
        }

        const savedDetalles: ProformaDetalle[] = [];

        for (const item of incomingDetails) {
          let detalle: ProformaDetalle | null = null;

          if (item.id) {
            // Update existing
            detalle = proforma.detalles.find(d => d.id === item.id) || null;
          }

          if (!detalle) {
            // Create new
            detalle = new ProformaDetalle();
            detalle.proforma = proforma;
          }

          // Update fields
          detalle.arancelId = item.arancelId;
          detalle.precioUnitario = item.precioUnitario;
          detalle.piezas = item.piezas || '';
          detalle.cantidad = item.cantidad;
          detalle.total = item.total;
          detalle.posible = item.posible;
          detalle.tipoPrecio = item.tipoPrecio || 'normal';

          const savedDetalle = await queryRunner.manager.save(ProformaDetalle, detalle);
          savedDetalles.push(savedDetalle);
        }

        // Update proforma total (exclude 'posible' items)
        proforma.total = savedDetalles.reduce((sum, item) => item.posible ? sum : sum + Number(item.total), 0);

        // Update reference for return
        proforma.detalles = savedDetalles;
      }

      await queryRunner.manager.save(proforma);
      await queryRunner.commitTransaction();

      // Sincronizar de forma robusta los estados financieros de las historias clínicas asociadas
      try {
        const hcRecords = await this.dataSource.getRepository(HistoriaClinica).find({
          where: { proformaId: proforma.id },
        });
        for (const hc of hcRecords) {
          await this.historiaClinicaService.syncTreatmentStatus(hc.id);
        }
      } catch (syncErr) {
        console.error('[ProformasService] Error al sincronizar estados financieros tras actualizar proforma:', syncErr);
      }

      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating proforma:', err);
      // Construct a meaningful error message
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new NotFoundException(`Error actualizando proforma: ${msg}`);
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number) {
    const proforma = await this.findOne(id);
    return this.proformaRepository.remove(proforma);
  }

  async uploadImage(proformaId: number, filename: string, buffer: Buffer, mimetype: string, descripcion?: string) {
    const proforma = await this.findOne(proformaId);
    
    let publicUrl = '';
    const bucket = 'clinica-media';
    const filePath = `proformas/${proformaId}/${Date.now()}-${filename}`;

    if (this.storageService.isConfigured()) {
      try {
        publicUrl = await this.storageService.uploadFile(bucket, filePath, buffer, mimetype);
      } catch (error) {
        console.error(`[ProformasService] Supabase upload failed for file ${filename}:`, error.message);
        if (error.stack) console.error(error.stack);
        
        console.warn('[ProformasService] Falling back to local storage...');
        publicUrl = await this.localStorageService.uploadFile(bucket, filePath, buffer);
      }
    } else {
      console.log('[ProformasService] Supabase not configured, using local storage.');
      publicUrl = await this.localStorageService.uploadFile(bucket, filePath, buffer);
    }

    try {
      const imagen = new ProformaImagen();
      imagen.proforma = proforma;
      imagen.nombre_archivo = filename;
      imagen.ruta = publicUrl;
      imagen.descripcion = descripcion || '';
      const saved = await this.imagenRepository.save(imagen);
      console.log(`[ProformasService] Image saved to database with ID: ${saved.id}`);
      return saved;
    } catch (dbError) {
      console.error('[ProformasService] Error saving image to database:', dbError.message);
      if (dbError.stack) console.error(dbError.stack);
      throw new BadRequestException(`Error al registrar la imagen en la base de datos: ${dbError.message}`);
    }
  }

  async getImages(proformaId: number) {
    return this.imagenRepository.find({
      where: { proformaId },
      order: { fecha_creacion: 'DESC' }
    });
  }

  async removeImage(id: number) {
    const imagen = await this.imagenRepository.findOne({ where: { id } });
    if (!imagen) throw new NotFoundException('Imagen no encontrada');

    // Remove from storage
    if (imagen.ruta.includes('supabase') || (this.storageService.isConfigured() && !imagen.ruta.includes('localhost'))) {
      try {
        await this.storageService.deleteFile('clinica-media', imagen.ruta);
      } catch (error) {
        console.warn('[ProformasService] Error deleting from Supabase:', error.message);
      }
    } else {
      await this.localStorageService.deleteFile('clinica-media', imagen.ruta);
    }

    return this.imagenRepository.remove(imagen);
  }

  async sendWhatsApp(id: number, fileBuffer: Buffer) {
    const proforma = await this.findOne(id);
    const paciente = proforma.paciente;

    if (!paciente || !paciente.celular) {
      throw new NotFoundException('El paciente no tiene número de celular registrado');
    }

    // Clean phone number
    let phone = paciente.celular.replace(/\D/g, '');
    if (!phone.startsWith('591')) {
      phone = '591' + phone;
    }
    const jid = `${phone}@s.whatsapp.net`;

    try {
      await this.chatbotService.sendMessage(jid, {
        document: fileBuffer,
        mimetype: 'application/pdf',
        fileName: `Presupuesto_${proforma.numero}.pdf`,
        caption: `Hola ${paciente.nombre}, aquí tiene el detalle de su Plan de Tratamiento (N° ${proforma.numero}).`
      }, proforma.clinicaId ?? undefined);
      return { success: true, message: 'Enviado correctamente' };
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      throw new Error('Error al enviar mensaje de WhatsApp');
    }
  }

  async getFirmaBase64(id: number): Promise<{ base64: string }> {
    const proforma = await this.findOne(id);
    if (!proforma) throw new NotFoundException('Proforma no encontrada');
    if (!proforma.firma) throw new NotFoundException('La proforma no tiene firma registrada');

    if (proforma.firma.startsWith('data:image')) {
        return { base64: proforma.firma };
    }

    try {
        let base64 = '';
        if (proforma.firma.includes('supabase') || (this.storageService.isConfigured() && !proforma.firma.includes('localhost') && !proforma.firma.includes('127.0.0.1'))) {
            base64 = await this.storageService.downloadAsBase64('clinica-media', proforma.firma);
        } else {
            base64 = await this.localStorageService.downloadAsBase64('clinica-media', proforma.firma);
        }
        return { base64 };
    } catch (error) {
        console.error('[ProformasService] Error downloading signature:', error);
        throw new NotFoundException('No se pudo recuperar la imagen de la firma');
    }
  }
}
