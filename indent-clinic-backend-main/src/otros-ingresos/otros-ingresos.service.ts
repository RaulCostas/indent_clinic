import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { CreateOtrosIngresosDto } from './dto/create-otros-ingresos.dto';
import { UpdateOtrosIngresosDto } from './dto/update-otros-ingresos.dto';
import { OtrosIngresos } from './entities/otros-ingresos.entity';

@Injectable()
export class OtrosIngresosService {
    constructor(
        @InjectRepository(OtrosIngresos)
        private otrosIngresosRepository: Repository<OtrosIngresos>,
    ) { }

    create(createOtrosIngresosDto: CreateOtrosIngresosDto) {
        const { formaPagoId, ...rest } = createOtrosIngresosDto;
        const ingreso = this.otrosIngresosRepository.create({
            ...rest,
            formaPagoId
        });
        return this.otrosIngresosRepository.save(ingreso);
    }

    async findAll(page: number = 1, limit: number = 10, startDate?: string, endDate?: string, fecha?: string, search?: string, clinicaId?: number) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.otrosIngresosRepository.createQueryBuilder('ingreso')
            .leftJoinAndSelect('ingreso.formaPago', 'formaPago')
            .orderBy('ingreso.fecha', 'DESC')
            .addOrderBy('ingreso.detalle', 'ASC');

        // Apply filters
        if (clinicaId !== undefined && clinicaId !== null) {
            queryBuilder.andWhere('ingreso."clinicaId" = :clinicaId', { clinicaId });
        }

        if (search) {
            queryBuilder.andWhere('ingreso.detalle ILIKE :search', { search: `%${search}%` });
        }

        if (fecha) {
            queryBuilder.andWhere('ingreso.fecha = :fecha', { fecha });
        } else if (startDate && endDate) {
            queryBuilder.andWhere('ingreso.fecha BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        // Apply pagination
        queryBuilder.skip(skip).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        // Calculate totals for summary (similar to egresos)
        const findOptions: any = { 
            relations: ['formaPago'], 
            where: {} 
        };

        if (clinicaId !== undefined && clinicaId !== null) {
            findOptions.where.clinicaId = clinicaId;
        }

        if (search) {
            findOptions.where.detalle = ILike(`%${search}%`);
        }
        
        if (fecha) {
            findOptions.where.fecha = fecha;
        } else if (startDate && endDate) {
            findOptions.where.fecha = Between(startDate, endDate);
        }

        const allIngresosForTotals = await this.otrosIngresosRepository.find(findOptions);

        const totals: Record<string, { bolivianos: number; dolares: number }> = {};

        allIngresosForTotals.forEach(ingreso => {
            const monto = Number(ingreso.monto);
            const monedaKey = ingreso.moneda === 'Bolivianos' ? 'bolivianos' : 'dolares';
            const formaPagoName = ingreso.formaPago?.forma_pago || 'Sin Asignar';

            let key = formaPagoName;

            if (key) {
                // Normalize keys
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
        return this.otrosIngresosRepository.findOne({
            where: { id },
            relations: ['formaPago']
        });
    }

    update(id: number, updateOtrosIngresosDto: UpdateOtrosIngresosDto) {
        const { formaPagoId, ...rest } = updateOtrosIngresosDto;
        return this.otrosIngresosRepository.save({
            id,
            ...rest,
            formaPagoId: formaPagoId || undefined
        });
    }

    remove(id: number) {
        return this.otrosIngresosRepository.delete(id);
    }
}
