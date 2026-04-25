import { Injectable, NotFoundException, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinica } from './entities/clinica.entity';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { UpdateClinicaDto } from './dto/update-clinica.dto';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const generateSlug = (str: string) => {
    return normalizeString(str).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

@Injectable()
export class ClinicasService {
    private readonly logger = new Logger(ClinicasService.name);
    constructor(
        @InjectRepository(Clinica)
        private clinicasRepository: Repository<Clinica>,
        private readonly storageService: SupabaseStorageService,
    ) { }
    
    async onModuleInit() {
        this.logger.log('Checking for clinics without slugs...');
        const clinicas = await this.clinicasRepository.find();
        for (const clinica of clinicas) {
            if (!clinica.slug) {
                clinica.slug = generateSlug(clinica.nombre);
                await this.clinicasRepository.save(clinica);
                this.logger.log(`Generated slug for clinic: ${clinica.nombre} -> ${clinica.slug}`);
            }
        }
    }

    async create(createClinicaDto: CreateClinicaDto): Promise<Clinica> {
        this.logger.log(`[ClinicasService] Creating clinic: ${createClinicaDto.nombre}`);

        const inputNombre = createClinicaDto.nombre.trim();
        const normalizedInput = normalizeString(inputNombre);

        const allRecords = await this.clinicasRepository.find();
        const existing = allRecords.find(r => normalizeString(r.nombre) === normalizedInput);

        if (existing) {
            throw new BadRequestException('Ya existe una clínica con ese nombre');
        }

        if (createClinicaDto.logo && createClinicaDto.logo.startsWith('data:image')) {
            this.logger.log(`[ClinicasService] Detected Base64 logo, attempting upload...`);
            createClinicaDto.logo = await this.storageService.uploadBase64('clinica-media', `logo-clinica-${inputNombre.replace(/\s+/g, '-')}`, createClinicaDto.logo);
            this.logger.log(`[ClinicasService] Logo uploaded successfully: ${createClinicaDto.logo}`);
        }
        if (createClinicaDto.qr_pago && createClinicaDto.qr_pago.startsWith('data:image')) {
            this.logger.log(`[ClinicasService] Detected Base64 qr_pago, attempting upload...`);
            createClinicaDto.qr_pago = await this.storageService.uploadBase64('clinica-media', `qr-pago-${inputNombre.replace(/\s+/g, '-')}`, createClinicaDto.qr_pago);
            this.logger.log(`[ClinicasService] QR Pago uploaded successfully: ${createClinicaDto.qr_pago}`);
        }
        createClinicaDto.nombre = inputNombre;
        const clinica = this.clinicasRepository.create(createClinicaDto);
        if (!clinica.slug) {
            clinica.slug = generateSlug(inputNombre);
        }
        return this.clinicasRepository.save(clinica);
    }

    findAll(): Promise<Clinica[]> {
        return this.clinicasRepository.find({ order: { nombre: 'ASC' } });
    }

    async findOne(id: number): Promise<Clinica> {
        const clinica = await this.clinicasRepository.findOne({ where: { id } });
        if (!clinica) throw new NotFoundException(`Clínica #${id} no encontrada`);
        return clinica;
    }

    async update(id: number, updateClinicaDto: UpdateClinicaDto): Promise<Clinica> {
        this.logger.log(`[ClinicasService] Updating clinic ID: ${id}`);
        const clinica = await this.findOne(id);
        
        if (updateClinicaDto.nombre) {
            const inputNombre = updateClinicaDto.nombre.trim();
            const normalizedInput = normalizeString(inputNombre);

            const allRecords = await this.clinicasRepository.find();
            const existing = allRecords.find(r => normalizeString(r.nombre) === normalizedInput);

            if (existing && existing.id !== id) {
                throw new BadRequestException('Ya existe una clínica con ese nombre');
            }
            updateClinicaDto.nombre = inputNombre;
            // Also update slug if name changed
            (updateClinicaDto as any).slug = generateSlug(inputNombre);
        }

        if (updateClinicaDto.logo && updateClinicaDto.logo.startsWith('data:image')) {
            this.logger.log(`[ClinicasService] Detected new Base64 logo for clinic ${id}, attempting upload...`);
            // Delete old logo if it exists and is a URL
            if (clinica.logo && clinica.logo.startsWith('http')) {
                await this.storageService.deleteFile('clinica-media', clinica.logo);
            }
            updateClinicaDto.logo = await this.storageService.uploadBase64('clinica-media', `logo-clinica-${id}`, updateClinicaDto.logo);
            this.logger.log(`[ClinicasService] Logo updated successfully: ${updateClinicaDto.logo}`);
        }

        if (updateClinicaDto.qr_pago && updateClinicaDto.qr_pago.startsWith('data:image')) {
            this.logger.log(`[ClinicasService] Detected new Base64 qr_pago for clinic ${id}, attempting upload...`);
            if (clinica.qr_pago && clinica.qr_pago.startsWith('http')) {
                await this.storageService.deleteFile('clinica-media', clinica.qr_pago);
            }
            updateClinicaDto.qr_pago = await this.storageService.uploadBase64('clinica-media', `qr-pago-${id}`, updateClinicaDto.qr_pago);
            this.logger.log(`[ClinicasService] QR Pago updated successfully: ${updateClinicaDto.qr_pago}`);
        }
        Object.assign(clinica, updateClinicaDto);
        return this.clinicasRepository.save(clinica);
    }

    async findBySlug(slug: string): Promise<Clinica> {
        const clinica = await this.clinicasRepository.findOne({ where: { slug, activo: true } });
        if (!clinica) throw new NotFoundException(`Sede "${slug}" no encontrada`);
        return clinica;
    }

    async remove(id: number): Promise<void> {
        const clinica = await this.findOne(id);
        clinica.activo = false;
        await this.clinicasRepository.save(clinica);
    }
}
