import { Injectable, NotFoundException, OnModuleInit, BadRequestException } from '@nestjs/common';
import { CreateGrupoInventarioDto } from './dto/create-grupo_inventario.dto';
import { UpdateGrupoInventarioDto } from './dto/update-grupo_inventario.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { GrupoInventario } from './entities/grupo_inventario.entity';
import { Repository, Like } from 'typeorm';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class GrupoInventarioService implements OnModuleInit {
  constructor(
    @InjectRepository(GrupoInventario)
    private readonly grupoInventarioRepository: Repository<GrupoInventario>,
  ) { }

  async onModuleInit() {
    await this.migrateStatusToLowercase();
  }

  private async migrateStatusToLowercase() {
    console.log('[GrupoInventario] Running status migration to lowercase...');
    const resultActivo = await this.grupoInventarioRepository.update(
      { estado: 'Activo' },
      { estado: 'activo' }
    );
    const resultInactivo = await this.grupoInventarioRepository.update(
      { estado: 'Inactivo' },
      { estado: 'inactivo' }
    );
    if (resultActivo.affected || resultInactivo.affected) {
      console.log(`[GrupoInventario] Migration complete. Updated ${resultActivo.affected || 0} active and ${resultInactivo.affected || 0} inactive records.`);
    } else {
      console.log('[GrupoInventario] No records needed migration.');
    }
  }

  async create(createGrupoInventarioDto: CreateGrupoInventarioDto) {
    const inputStr = createGrupoInventarioDto.grupo.trim();
    const normalizedInput = normalizeString(inputStr);

    const allRecords = await this.grupoInventarioRepository.find();
    const existing = allRecords.find(r => normalizeString(r.grupo) === normalizedInput);

    if (existing) {
        throw new BadRequestException('El grupo de inventario ya existe');
    }

    const grupo = this.grupoInventarioRepository.create({
        ...createGrupoInventarioDto,
        grupo: inputStr
    });
    return this.grupoInventarioRepository.save(grupo);
  }

  async findAll(search?: string, page: number = 1, limit: number = 5) {
    const skip = (page - 1) * limit;
    const whereCondition = search ? [
      { grupo: Like(`%${search}%`) },
    ] : {};

    const [data, total] = await this.grupoInventarioRepository.findAndCount({
      where: whereCondition,
      take: limit,
      skip: skip,
      order: { id: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const grupo = await this.grupoInventarioRepository.findOneBy({ id });
    if (!grupo) throw new NotFoundException(`Grupo con ID ${id} no encontrado`);
    return grupo;
  }

  async update(id: number, updateGrupoInventarioDto: UpdateGrupoInventarioDto) {
    const grupoBase = await this.findOne(id);
    
    if (updateGrupoInventarioDto.grupo) {
        const inputStr = updateGrupoInventarioDto.grupo.trim();
        const normalizedInput = normalizeString(inputStr);

        const allRecords = await this.grupoInventarioRepository.find();
        const existing = allRecords.find(r => normalizeString(r.grupo) === normalizedInput);

        if (existing && existing.id !== id) {
            throw new BadRequestException('El grupo de inventario ya existe');
        }
        updateGrupoInventarioDto.grupo = inputStr;
    }
    
    this.grupoInventarioRepository.merge(grupoBase, updateGrupoInventarioDto);
    return this.grupoInventarioRepository.save(grupoBase);
  }

  async remove(id: number) {
    const grupo = await this.findOne(id);
    return this.grupoInventarioRepository.remove(grupo);
  }
}
