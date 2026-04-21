import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from './entities/inventario.entity';
import { PedidosDetalle } from '../pedidos/entities/pedidos-detalle.entity';
import { CreateInventarioDto, UpdateInventarioDto } from './dto/create-inventario.dto';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class InventarioService {
    constructor(
        @InjectRepository(Inventario)
        private inventarioRepository: Repository<Inventario>,
    ) { }

    async create(createInventarioDto: CreateInventarioDto) {
        const inputStr = createInventarioDto.descripcion.trim();
        const normalizedInput = normalizeString(inputStr);

        const allRecords = await this.inventarioRepository.find();
        
        const existing = allRecords.find(r => 
            normalizeString(r.descripcion) === normalizedInput && 
            r.clinicaId == createInventarioDto.clinicaId
        );

        if (existing) {
            throw new BadRequestException('Ya existe un ítem en el inventario con esta descripción para esta clínica');
        }

        createInventarioDto.descripcion = inputStr;
        const inventario = this.inventarioRepository.create(createInventarioDto);
        return this.inventarioRepository.save(inventario);
    }

    async findAll(search?: string, page: number = 1, limit: number = 10, expirationStatus?: string, clinicaId?: number) {
        const queryBuilder = this.inventarioRepository.createQueryBuilder('inventario')
            .leftJoinAndSelect('inventario.especialidad', 'especialidad')
            .leftJoinAndSelect('inventario.grupoInventario', 'grupoInventario')
            .leftJoinAndSelect('inventario.clinica', 'clinica');

        if (search) {
            queryBuilder.andWhere('inventario.descripcion ILIKE :search', { search: `%${search}%` });
        }

        if (clinicaId) {
            queryBuilder.andWhere('inventario.clinicaId = :clinicaId', { clinicaId });
        }

        if (expirationStatus) {
            const today = new Date().toISOString().split('T')[0];
            let dateCondition = "";
            let params = {};

            if (expirationStatus === '3months') {
                dateCondition = "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :futureDate";
                params = { today, futureDate: this.getDateAfterMonths(3) };
            } else if (expirationStatus === '6months') {
                dateCondition = "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :futureDate";
                params = { today, futureDate: this.getDateAfterMonths(6) };
            } else if (expirationStatus === '9months') {
                dateCondition = "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :futureDate";
                params = { today, futureDate: this.getDateAfterMonths(9) };
            } else if (expirationStatus === 'expired') {
                dateCondition = "pd.fecha_vencimiento < :today";
                params = { today };
            }

            if (dateCondition) {
                queryBuilder.andWhere((qb) => {
                    const subQuery = qb.subQuery()
                        .select("1")
                        .from(PedidosDetalle, "pd")
                        .where("pd.idinventario = inventario.id")
                        .andWhere(dateCondition, params)
                        .getQuery();
                    return "EXISTS " + subQuery;
                });
            }
        }

        const [data, total] = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    private getDateAfterMonths(months: number): string {
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        return date.toISOString().split('T')[0];
    }

    async findLowStock(clinicaId?: number) {
        const query = this.inventarioRepository.createQueryBuilder('inventario')
            .leftJoinAndSelect('inventario.especialidad', 'especialidad')
            .leftJoinAndSelect('inventario.grupoInventario', 'grupoInventario')
            .leftJoinAndSelect('inventario.clinica', 'clinica')
            .where('inventario.cantidad_existente < inventario.stock_minimo')
            .andWhere('inventario.estado = :estado', { estado: 'Activo' });

        if (clinicaId) {
            query.andWhere('inventario.clinicaId = :clinicaId', { clinicaId });
        }

        return query.getMany();
    }

    findOne(id: number) {
        return this.inventarioRepository.findOne({
            where: { id },
            relations: ['especialidad', 'grupoInventario'],
        });
    }

    async update(id: number, updateInventarioDto: UpdateInventarioDto) {
        if (updateInventarioDto.descripcion) {
            const inputStr = updateInventarioDto.descripcion.trim();
            const normalizedInput = normalizeString(inputStr);

            const allRecords = await this.inventarioRepository.find();
            
            const currentRecord = await this.findOne(id);
            if (!currentRecord) throw new BadRequestException('El ítem de inventario no existe');

            const recordClinicaId = updateInventarioDto.clinicaId ?? currentRecord.clinicaId;

            const existing = allRecords.find(r => 
                normalizeString(r.descripcion) === normalizedInput && 
                r.clinicaId == recordClinicaId
            );

            if (existing && existing.id !== id) {
                throw new BadRequestException('Ya existe un ítem en el inventario con esta descripción para esta clínica');
            }
            updateInventarioDto.descripcion = inputStr;
        }

        return this.inventarioRepository.update(id, updateInventarioDto);
    }

    remove(id: number) {
        return this.inventarioRepository.delete(id);
    }
    async findExpiringDetails(expirationStatus: string, clinicaId?: number) {
        const queryBuilder = this.inventarioRepository.manager.createQueryBuilder(PedidosDetalle, 'pd')
            .leftJoinAndSelect('pd.inventario', 'inventario')
            .leftJoinAndSelect('inventario.especialidad', 'especialidad')
            .leftJoinAndSelect('inventario.grupoInventario', 'grupoInventario');

        if (clinicaId) {
            queryBuilder.andWhere('inventario.clinicaId = :clinicaId', { clinicaId });
        }

        const today = new Date().toISOString().split('T')[0];

        if (expirationStatus === '3months') {
            queryBuilder.andWhere(
                "pd.fecha_vencimiento >= :today AND pd.fecha_vencimiento <= :threeMonths",
                { today, threeMonths: this.getDateAfterMonths(3) }
            );
        } else if (expirationStatus === '6months') {
            queryBuilder.andWhere(
                "pd.fecha_vencimiento > :threeMonths AND pd.fecha_vencimiento <= :sixMonths",
                { threeMonths: this.getDateAfterMonths(3), sixMonths: this.getDateAfterMonths(6) }
            );
        } else if (expirationStatus === '9months') {
            queryBuilder.andWhere(
                "pd.fecha_vencimiento > :sixMonths AND pd.fecha_vencimiento <= :nineMonths",
                { sixMonths: this.getDateAfterMonths(6), nineMonths: this.getDateAfterMonths(9) }
            );
        } else if (expirationStatus === 'expired') {
            queryBuilder.andWhere("pd.fecha_vencimiento < :today", { today });
        }

        return queryBuilder.getMany();
    }

    async findUsedGroups(clinicaId?: number) {
        const query = this.inventarioRepository.createQueryBuilder('inventario')
            .innerJoin('inventario.grupoInventario', 'grupoInventario')
            .select(['grupoInventario.id as id', 'grupoInventario.grupo as grupo'])
            .where('inventario.idgrupo_inventario IS NOT NULL');

        if (clinicaId) {
            query.andWhere('inventario.clinicaId = :clinicaId', { clinicaId });
        }

        return query.distinct(true).orderBy('grupo', 'ASC').getRawMany();
    }

    async findUsedSpecialties(clinicaId?: number, grupoId?: number) {
        const query = this.inventarioRepository.createQueryBuilder('inventario')
            .innerJoin('inventario.especialidad', 'especialidad')
            .select(['especialidad.id as id', 'especialidad.especialidad as especialidad'])
            .where('inventario.idespecialidad IS NOT NULL');

        if (clinicaId) {
            query.andWhere('inventario.clinicaId = :clinicaId', { clinicaId });
        }

        if (grupoId) {
            query.andWhere('inventario.idgrupo_inventario = :grupoId', { grupoId });
        }

        return query.distinct(true).orderBy('especialidad', 'ASC').getRawMany();
    }
}
