import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { CreateEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';
import { Egreso } from './entities/egreso.entity';

@Injectable()
export class EgresosService {
    constructor(
        @InjectRepository(Egreso)
        private egresosRepository: Repository<Egreso>,
    ) { }

    async onModuleInit() {
        // Fix for existing records with null forma_pago_id
        await this.egresosRepository.query(`UPDATE egresos SET forma_pago_id = 1 WHERE forma_pago_id IS NULL`);
    }

    create(createEgresoDto: CreateEgresoDto) {
        const { formaPagoId, ...rest } = createEgresoDto;
        const egreso = this.egresosRepository.create({
            ...rest,
            formaPago: { id: formaPagoId }
        });
        return this.egresosRepository.save(egreso);
    }

    async findAll(page: number = 1, limit: number = 10, startDate?: string, endDate?: string, search?: string, clinicaId?: number) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.egresosRepository.createQueryBuilder('egreso')
            .leftJoinAndSelect('egreso.formaPago', 'formaPago')
            .orderBy('egreso.fecha', 'DESC')
            .addOrderBy('egreso.detalle', 'ASC');

        // Apply filters
        if (clinicaId !== undefined && clinicaId !== null) {
            queryBuilder.andWhere('egreso."clinicaId" = :clinicaId', { clinicaId });
        }

        if (search) {
            queryBuilder.andWhere('egreso.detalle ILIKE :search', { search: `%${search}%` });
        }

        if (startDate && endDate) {
            queryBuilder.andWhere('egreso.fecha BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        // Apply pagination
        queryBuilder.skip(skip).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        // Calculate totals using a separate query with the same filters
        const findOptions: any = { 
            relations: ['formaPago'], 
            where: {} 
        };

        if (clinicaId !== undefined && clinicaId !== null) {
            findOptions.where.clinicaId = clinicaId;
        } else {
            // If viewing all, we still want to make sure we don't accidentally ignore it 
            // but for 'Todas' it should stay empty to fetch everything.
        }

        if (search) {
            findOptions.where.detalle = ILike(`%${search}%`);
        }
        if (startDate && endDate) {
            findOptions.where.fecha = Between(startDate, endDate);
        }

        const allEgresosForTotals = await this.egresosRepository.find(findOptions);

        // Initialize totals structure
        const totals: Record<string, { bolivianos: number; dolares: number }> = {};

        allEgresosForTotals.forEach(egreso => {
            const monto = Number(egreso.monto);
            const monedaKey = egreso.moneda === 'Bolivianos' ? 'bolivianos' : 'dolares';
            const formaPagoName = egreso.formaPago?.forma_pago || 'Sin Asignar';

            let key = formaPagoName;

            if (key) {
                // Normalize common keys to ensure consistency
                if (key.toUpperCase() === 'EFECTIVO') key = 'Efectivo';
                else if (key.toUpperCase() === 'QR') key = 'QR';
                else if (key.toUpperCase() === 'DEPOSITO' || key.toUpperCase() === 'DEPÓSITO' || key.toUpperCase() === 'TRANSFERENCIA') key = 'Transferencia';
                else if (key.toUpperCase() === 'DEBITO' || key.toUpperCase() === 'DÉBITO' || key.toUpperCase() === 'DÉBITO/CRÉDITO') key = 'Tarjeta';
                else {
                    key = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                }

                if (!totals[key]) {
                    totals[key] = { bolivianos: 0, dolares: 0 };
                }
                totals[key][monedaKey] += monto;
            }
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totals
        };
    }

    findOne(id: number) {
        return this.egresosRepository.findOne({
            where: { id },
            relations: ['formaPago']
        });
    }

    update(id: number, updateEgresoDto: UpdateEgresoDto) {
        const { formaPagoId, ...rest } = updateEgresoDto;
        return this.egresosRepository.save({
            id,
            ...rest,
            formaPago: formaPagoId ? { id: formaPagoId } : undefined
        });
    }

    remove(id: number) {
        return this.egresosRepository.delete(id);
    }
}
