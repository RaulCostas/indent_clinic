import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PagosGastosFijos } from './entities/pagos_gastos_fijos.entity';
import { CreatePagosGastosFijosDto } from './dto/create-pagos_gastos_fijos.dto';

@Injectable()
export class PagosGastosFijosService {
    constructor(
        @InjectRepository(PagosGastosFijos)
        private pagosRepository: Repository<PagosGastosFijos>,
    ) { }

    async create(createDto: CreatePagosGastosFijosDto) {
        const { gastoFijoId, formaPagoId, fecha, monto, moneda, observaciones } = createDto;
        console.log('[PagosGastosFijos] DTO recibido:', JSON.stringify(createDto));

        const gastoFijoIdNum = Number(gastoFijoId);
        const formaPagoIdNum = formaPagoId ? Number(formaPagoId) : null;
        const montoNum = Number(monto);

        if (isNaN(gastoFijoIdNum)) throw new Error('gastoFijoId inválido (NaN)');
        if (isNaN(montoNum)) throw new Error('monto inválido (NaN)');

        const nuevoPago = this.pagosRepository.create({
            fecha: new Date(fecha + 'T12:00:00'), // Forzar el mediodía para evitar cambios de día por Timezone UTC
            monto: montoNum,
            moneda,
            observaciones: observaciones || null,
            gastoFijo: { id: gastoFijoIdNum },
            formaPago: formaPagoIdNum ? { id: formaPagoIdNum } : null,
            clinicaId: createDto.clinicaId ? Number(createDto.clinicaId) : null,
        } as any); // Force cast to any to bypass DeepPartial mismatch quirk if needed

        console.log('[PagosGastosFijos] Objeto a guardar:', JSON.stringify(nuevoPago));

        try {
            return await this.pagosRepository.save(nuevoPago);
        } catch (err) {
            console.error('[PagosGastosFijos] ERROR:', err.message, '| Detail:', err.detail);
            throw err;
        }
    }

    findAll(fecha?: string, startDate?: string, endDate?: string, clinicaId?: number) {
        const options: any = {
            relations: ['gastoFijo', 'formaPago'],
            order: { fecha: 'DESC' },
            where: {}
        };
        if (startDate && endDate) {
            options.where.fecha = Between(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        } else if (fecha) {
            options.where.fecha = Between(`${fecha} 00:00:00`, `${fecha} 23:59:59`);
        }

        if (clinicaId) {
            options.where.clinicaId = clinicaId;
        }

        return this.pagosRepository.find(options);
    }

    findOne(id: number) {
        return this.pagosRepository.findOne({ where: { id }, relations: ['gastoFijo', 'formaPago'] });
    }

    async update(id: number, updateDto: CreatePagosGastosFijosDto) {
        const { gastoFijoId, formaPagoId, fecha, monto, moneda, observaciones } = updateDto;

        const updateData: any = {};
        if (fecha !== undefined) updateData.fecha = new Date(fecha + 'T12:00:00');
        if (monto !== undefined) updateData.monto = Number(monto);
        if (moneda !== undefined) updateData.moneda = moneda;
        if (observaciones !== undefined) updateData.observaciones = observaciones || null;
        if (gastoFijoId !== undefined) updateData.gastoFijo = { id: Number(gastoFijoId) };
        if (formaPagoId !== undefined) updateData.formaPago = formaPagoId ? { id: Number(formaPagoId) } : null;
        if (updateDto.clinicaId !== undefined) updateData.clinicaId = updateDto.clinicaId ? Number(updateDto.clinicaId) : null;

        try {
            const pago = await this.pagosRepository.preload({
                id,
                ...updateData
            });
            if (!pago) {
                throw new Error(`PagoGastoFijo con ID ${id} no encontrado`);
            }
            return await this.pagosRepository.save(pago);
        } catch (err) {
            console.error('[PagosGastosFijos] ERROR al actualizar:', err);
            throw err;
        }
    }

    remove(id: number) {
        return this.pagosRepository.delete(id);
    }
}
