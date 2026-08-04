import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PagoLaboratorio } from './entities/pago-laboratorio.entity';
import { CreatePagoLaboratorioDto } from './dto/create-pago-laboratorio.dto';
import { UpdatePagoLaboratorioDto } from './dto/update-pago-laboratorio.dto';
import { TrabajoLaboratorio } from '../trabajos_laboratorios/entities/trabajo_laboratorio.entity';

@Injectable()
export class PagosLaboratoriosService {
    constructor(
        @InjectRepository(PagoLaboratorio)
        private pagoLaboratorioRepository: Repository<PagoLaboratorio>,
        private dataSource: DataSource,
    ) { }

    async create(createDto: CreatePagoLaboratorioDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { fecha, idTrabajos_Laboratorios, idforma_pago, monto, ...rest } = createDto;

            // Load the target work to validate and update
            const trabajo = await queryRunner.manager.findOne(TrabajoLaboratorio, {
                where: { id: idTrabajos_Laboratorios }
            });

            if (!trabajo) {
                throw new BadRequestException('Trabajo de laboratorio no encontrado');
            }

            const totalTrabajo = Number(trabajo.total);
            const montoPagadoActual = Number(trabajo.monto_pagado || 0);
            const saldoPendiente = totalTrabajo - montoPagadoActual;
            const montoAbono = Number(monto);

            if (montoAbono <= 0) {
                throw new BadRequestException('El monto del abono debe ser mayor a 0');
            }

            if (montoAbono > saldoPendiente + 0.001) { // 0.001 tolerance for decimals
                throw new BadRequestException(
                    `El monto (Bs ${montoAbono.toFixed(2)}) supera el saldo pendiente (Bs ${saldoPendiente.toFixed(2)})`
                );
            }

            // Save the payment record
            const pagoData = {
                ...rest,
                monto: montoAbono,
                fecha: new Date(fecha + 'T12:00:00'),
                trabajoLaboratorio: { id: idTrabajos_Laboratorios },
                formaPago: { id: idforma_pago }
            };
            const pago = queryRunner.manager.create(PagoLaboratorio, pagoData as any);
            const savedPago = await queryRunner.manager.save(pago);

            // Update accumulated payment and status on the work
            const nuevoMontoPagado = montoPagadoActual + montoAbono;
            const estaLiquidado = nuevoMontoPagado >= totalTrabajo - 0.001;

            await queryRunner.manager.update(TrabajoLaboratorio, idTrabajos_Laboratorios, {
                monto_pagado: nuevoMontoPagado,
                pagado: estaLiquidado ? 'si' : 'no'
            });

            await queryRunner.commitTransaction();
            return savedPago;
        } catch (err: any) {
            console.error('[PagosLaboratoriosService] Error:', err.message, err.detail);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async remove(id: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const pago = await queryRunner.manager.findOne(PagoLaboratorio, { where: { id } });
            if (pago) {
                const trabajo = await queryRunner.manager.findOne(TrabajoLaboratorio, {
                    where: { id: pago.idTrabajos_Laboratorios }
                });

                if (trabajo) {
                    const nuevoMontoPagado = Math.max(0, Number(trabajo.monto_pagado || 0) - Number(pago.monto));
                    const totalTrabajo = Number(trabajo.total);
                    const estaLiquidado = nuevoMontoPagado >= totalTrabajo - 0.001;

                    await queryRunner.manager.update(TrabajoLaboratorio, pago.idTrabajos_Laboratorios, {
                        monto_pagado: nuevoMontoPagado,
                        pagado: estaLiquidado ? 'si' : 'no'
                    });
                }

                await queryRunner.manager.remove(pago);
            }
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(fecha?: string, startDate?: string, endDate?: string, clinicaId?: number, idTrabajosLaboratorios?: number) {
        const queryBuilder = this.pagoLaboratorioRepository.createQueryBuilder('pago')
            .leftJoinAndSelect('pago.trabajoLaboratorio', 'trabajoLaboratorio')
            .leftJoinAndSelect('trabajoLaboratorio.paciente', 'paciente')
            .leftJoinAndSelect('trabajoLaboratorio.laboratorio', 'laboratorio')
            .leftJoinAndSelect('trabajoLaboratorio.precioLaboratorio', 'precioLaboratorio')
            .leftJoinAndSelect('pago.formaPago', 'formaPago');

        if (startDate && endDate) {
            queryBuilder.orderBy('pago.fecha', 'ASC');
        }

        queryBuilder.addOrderBy('laboratorio.laboratorio', 'ASC');

        if (clinicaId) {
            queryBuilder.andWhere('pago.clinicaId = :clinicaId', { clinicaId });
        }

        if (idTrabajosLaboratorios) {
            queryBuilder.andWhere('pago.idTrabajos_Laboratorios = :idTrabajosLaboratorios', { idTrabajosLaboratorios });
        }

        if (startDate && endDate) {
            queryBuilder.andWhere('pago.fecha BETWEEN :startDate AND :endDate', {
                startDate: `${startDate} 00:00:00`,
                endDate: `${endDate} 23:59:59`
            });
        } else if (fecha) {
            queryBuilder.andWhere('pago.fecha BETWEEN :startDate AND :endDate', {
                startDate: `${fecha} 00:00:00`,
                endDate: `${fecha} 23:59:59`
            });
        }

        return await queryBuilder.getMany();
    }

    findOne(id: number) {
        return this.pagoLaboratorioRepository.findOne({
            where: { id },
            relations: ['trabajoLaboratorio', 'formaPago']
        });
    }

    update(id: number, updateDto: UpdatePagoLaboratorioDto) {
        return this.pagoLaboratorioRepository.update(id, updateDto);
    }
}
