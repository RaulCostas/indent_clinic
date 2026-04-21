import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contacto } from './entities/contacto.entity';
import { CreateContactoDto } from './dto/create-contacto.dto';
import { UpdateContactoDto } from './dto/update-contacto.dto';

@Injectable()
export class ContactosService {
    constructor(
        @InjectRepository(Contacto)
        private readonly contactoRepository: Repository<Contacto>,
    ) { }

    async create(createDto: CreateContactoDto): Promise<Contacto> {
        await this.checkDuplicate(createDto);
        const contacto = this.contactoRepository.create(createDto);
        return await this.contactoRepository.save(contacto);
    }

    async findAll(search?: string, estado?: string, page: number = 1, limit: number = 10): Promise<{ data: Contacto[], total: number }> {
        const query = this.contactoRepository.createQueryBuilder('contacto');

        if (search) {
            query.where(
                '(contacto.contacto LIKE :search OR contacto.celular LIKE :search OR contacto.telefono LIKE :search OR contacto.email LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (estado) {
            query.andWhere('contacto.estado = :estado', { estado });
        }

        query.orderBy('contacto.contacto', 'ASC');

        const total = await query.getCount();

        if (limit > 0) {
            query.skip((page - 1) * limit).take(limit);
        }

        const data = await query.getMany();

        return { data, total };
    }

    async findOne(id: number): Promise<Contacto> {
        const contacto = await this.contactoRepository.findOne({ where: { id } });
        if (!contacto) {
            throw new NotFoundException(`Contacto #${id} not found`);
        }
        return contacto;
    }

    async update(id: number, updateDto: UpdateContactoDto): Promise<Contacto> {
        await this.checkDuplicate(updateDto, id);
        const contacto = await this.findOne(id);
        this.contactoRepository.merge(contacto, updateDto);
        return await this.contactoRepository.save(contacto);
    }

    private async checkDuplicate(dto: Partial<Contacto>, id?: number) {
        const { contacto, celular, telefono } = dto;

        if (contacto) {
            const query = this.contactoRepository.createQueryBuilder('contacto')
                .where('TRIM(LOWER(contacto.contacto)) = :contacto', { contacto: contacto.trim().toLowerCase() });
            if (id) query.andWhere('contacto.id != :id', { id });
            const exists = await query.getOne();
            if (exists) throw new BadRequestException(['Ya existe un contacto registrado con este nombre']);
        }

        if (celular) {
            const query = this.contactoRepository.createQueryBuilder('contacto')
                .where('TRIM(contacto.celular) = :celular', { celular: celular.trim() });
            if (id) query.andWhere('contacto.id != :id', { id });
            const exists = await query.getOne();
            if (exists) throw new BadRequestException(['Este número de celular ya está registrado en otro contacto']);
        }

        if (telefono) {
            const query = this.contactoRepository.createQueryBuilder('contacto')
                .where('TRIM(contacto.telefono) = :telefono', { telefono: telefono.trim() });
            if (id) query.andWhere('contacto.id != :id', { id });
            const exists = await query.getOne();
            if (exists) throw new BadRequestException(['Este número de teléfono ya está registrado en otro contacto']);
        }
    }

    async remove(id: number): Promise<void> {
        // Soft delete by setting estado to 'inactivo'
        await this.contactoRepository.update(id, { estado: 'inactivo' });
    }
}
