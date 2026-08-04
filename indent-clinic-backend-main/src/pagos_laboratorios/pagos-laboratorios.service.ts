import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PagoLaboratorio } from './entities/pago-laboratorio.entity';
import { CreatePagoLaboratorioDto } from './dto/create-pago-laboratorio.dto';
import { UpdatePagoLaboratorioDto } from './dto/update-pago-laboratorio.dto';
import { TrabajoLaboratorio } from '../trabajos_laboratorios/entities/trabajo_laboratorio.entity';

@Injectable()
export class PagosLaboratoriosService implements OnModuleInit {
    constructor(
        @InjectRepository(PagoLaboratorio)
        private pagoLaboratorioRepository: Repository<PagoLaboratorio>,
        private dataSource: DataSource,
    ) { }

    async onModuleInit() {
        try {
            await this.dataSource.query(`
                ALTER TABLE trabajos_laboratorios 
                ADD COLUMN IF NOT EXISTS "monto_pagado" DECIMAL(10,2) NOT NULL DEFAULT 0;
            `);
            await this.dataSource.query(`
                ALTER TABLE pagos_laboratorios 
                ADD COLUMN IF NOT EXISTS "descuento" DECIMAL(10,2) NOT NULL DEFAULT 0;
            `);
            await this.dataSource.query(`
                UPDATE trabajos_laboratorios tl
                SET "monto_pagado" = COALESCE((
                    SELECT SUM(pl.monto + COALESCE(pl.descuento, 0)) 
                    FROM pagos_laboratorios pl 
                    WHERE pl."idTrabajos_Laboratorios" = tl.id
                ), 0);
            `);
            await this.dataSource.query(`
                ALTER TABLE pagos_laboratorios 
                DROP CONSTRAINT IF EXISTS "UQ_pagos_laboratorios_idTrabajos_Laboratorios";
            `);
            await this.dataSource.query(`
                DROP INDEX IF EXISTS "UQ_pagos_laboratorios_idTrabajos_Laboratorios";
            `);
            console.log('[PagosLaboratoriosService] Auto-migration executed successfully.');
        } catch (e: any) {
            console.error('[PagosLaboratoriosService] Auto-migration notice:', e.message);
        }
    }

    async create(createDto: CreatePagoLaboratorioDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { fecha, idTrabajos_Laboratorios, idforma_pago, monto, descuento, ...rest } = createDto;

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
            const montoAbono = Number(monto || 0);
            const descuentoAbono = Math.max(0, Number(descuento || 0));

            if (montoAbono <= 0 && descuentoAbono <= 0) {
                throw new BadRequestException('Ingrese un monto a abonar o un descuento mayor a 0');
            }

            const totalCoberturaAbono = montoAbono + descuentoAbono;

            if (totalCoberturaAbono > saldoPendiente + 0.001) { // 0.001 tolerance for decimals
                throw new BadRequestException(
                    `El abono más el descuento (Bs ${totalCoberturaAbono.toFixed(2)}) supera el saldo pendiente (Bs ${saldoPendiente.toFixed(2)})`
                );
            }

            // Save the payment record
            const pagoData = {
                ...rest,
                monto: montoAbono,
                descuento: descuentoAbono,
                fecha: new Date(fecha + 'T12:00:00'),
                trabajoLaboratorio: { id: idTrabajos_Laboratorios },
                formaPago: { id: idforma_pago }
            };
            const pago = queryRunner.manager.create(PagoLaboratorio, pagoData as any);
            const savedPago = await queryRunner.manager.save(pago);

            // Update accumulated payment and status on the work
            const nuevoMontoPagado = montoPagadoActual + totalCoberturaAbono;
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
                const idTrabajo = pago.idTrabajos_Laboratorios;
                await queryRunner.manager.remove(pago);

                const trabajo = await queryRunner.manager.findOne(TrabajoLaboratorio, {
                    where: { id: idTrabajo }
                });

                if (trabajo) {
                    const resultSync = await queryRunner.manager.query(`
                        SELECT COALESCE(SUM(pl.monto + COALESCE(pl.descuento, 0)), 0) as total_cubierto
                        FROM pagos_laboratorios pl
                        WHERE pl."idTrabajos_Laboratorios" = $1
                    `, [idTrabajo]);

                    const nuevoMontoPagado = Number(resultSync[0]?.total_cubierto || 0);
                    const totalTrabajo = Number(trabajo.total);
                    const estaLiquidado = nuevoMontoPagado >= totalTrabajo - 0.001;

                    await queryRunner.manager.update(TrabajoLaboratorio, idTrabajo, {
                        monto_pagado: nuevoMontoPagado,
                        pagado: estaLiquidado ? 'si' : 'no'
                    });
                }
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

    async update(id: number, updateDto: UpdatePagoLaboratorioDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const pago = await queryRunner.manager.findOne(PagoLaboratorio, { where: { id } });
            if (!pago) {
                throw new BadRequestException('Pago no encontrado');
            }

            const payload: any = { ...updateDto };
            if (updateDto.fecha) {
                payload.fecha = new Date(updateDto.fecha + 'T12:00:00');
            }
            if (updateDto.idforma_pago) {
                payload.formaPago = { id: updateDto.idforma_pago };
                delete payload.idforma_pago;
            }

            await queryRunner.manager.update(PagoLaboratorio, id, payload);

            const idTrabajo = pago.idTrabajos_Laboratorios;
            const trabajo = await queryRunner.manager.findOne(TrabajoLaboratorio, {
                where: { id: idTrabajo }
            });

            if (trabajo) {
                const resultSync = await queryRunner.manager.query(`
                    SELECT COALESCE(SUM(pl.monto + COALESCE(pl.descuento, 0)), 0) as total_cubierto
                    FROM pagos_laboratorios pl
                    WHERE pl."idTrabajos_Laboratorios" = $1
                `, [idTrabajo]);

                const nuevoMontoPagado = Number(resultSync[0]?.total_cubierto || 0);
                const totalTrabajo = Number(trabajo.total);
                const estaLiquidado = nuevoMontoPagado >= totalTrabajo - 0.001;

                await queryRunner.manager.update(TrabajoLaboratorio, idTrabajo, {
                    monto_pagado: nuevoMontoPagado,
                    pagado: estaLiquidado ? 'si' : 'no'
                });
            }

            await queryRunner.commitTransaction();
            return { message: 'Pago actualizado' };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
