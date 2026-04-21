import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalTipo } from './entities/personal_tipo.entity';
import { CreatePersonalTipoDto } from './dto/create-personal-tipo.dto';
import { UpdatePersonalTipoDto } from './dto/update-personal-tipo.dto';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class PersonalTipoService {
    constructor(
        @InjectRepository(PersonalTipo)
        private personalTipoRepository: Repository<PersonalTipo>,
    ) { }

    async create(createDto: CreatePersonalTipoDto): Promise<PersonalTipo> {
        const inputArea = createDto.area.trim();
        const normalizedInput = normalizeString(inputArea);

        const allAreas = await this.personalTipoRepository.find();
        const existing = allAreas.find(a => normalizeString(a.area) === normalizedInput);

        if (existing) {
            throw new ConflictException('El Área ya existe');
        }

        const personalTipo = this.personalTipoRepository.create({
            ...createDto,
            area: inputArea
        });
        return await this.personalTipoRepository.save(personalTipo);
    }

    async findAll(): Promise<PersonalTipo[]> {
        return await this.personalTipoRepository.find({
            order: { id: 'DESC' },
        });
    }

    async findOne(id: number): Promise<PersonalTipo | null> {
        return await this.personalTipoRepository.findOne({
            where: { id },
        });
    }

    async update(id: number, updateDto: UpdatePersonalTipoDto): Promise<PersonalTipo> {
        if (updateDto.area) {
            const inputArea = updateDto.area.trim();
            const normalizedInput = normalizeString(inputArea);

            const allAreas = await this.personalTipoRepository.find();
            const existing = allAreas.find(a => normalizeString(a.area) === normalizedInput);

            if (existing && existing.id !== id) {
                throw new ConflictException('El Área ya existe');
            }
            updateDto.area = inputArea;
        }

        await this.personalTipoRepository.update(id, updateDto);
        const updated = await this.findOne(id);
        if (!updated) {
            throw new ConflictException('Error al actualizar el área');
        }
        return updated;
    }

    async remove(id: number): Promise<void> {
        await this.personalTipoRepository.update(id, { estado: 'inactivo' });
    }

    async reactivate(id: number): Promise<void> {
        await this.personalTipoRepository.update(id, { estado: 'activo' });
    }
}
