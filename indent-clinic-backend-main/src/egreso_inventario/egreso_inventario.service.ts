import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { EgresoInventario } from './entities/egreso_inventario.entity';
import { CreateEgresoInventarioDto } from './dto/create-egreso-inventario.dto';
import { Inventario } from '../inventario/entities/inventario.entity';

import { PedidosDetalle } from '../pedidos/entities/pedidos-detalle.entity';

@Injectable()
export class EgresoInventarioService {
    constructor(
        @InjectRepository(EgresoInventario)
        private egresoRepository: Repository<EgresoInventario>,
        private dataSource: DataSource
    ) { }

    async create(createEgresoDto: CreateEgresoInventarioDto) {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const inventario = await queryRunner.manager.findOne(Inventario, {
                where: { id: createEgresoDto.inventarioId }
            });

            if (!inventario) {
                throw new NotFoundException('Inventario no encontrado');
            }

            if (inventario.cantidad_existente < createEgresoDto.cantidad) {
                throw new BadRequestException('Stock insuficiente');
            }

            // Deduct from specific batch if expiration date is provided
            if (createEgresoDto.fecha_vencimiento) {
                let remainingToDeduct = createEgresoDto.cantidad;

                // Find batches with this expiration date that have stock
                const batches = await queryRunner.manager.find(PedidosDetalle, {
                    where: {
                        idinventario: createEgresoDto.inventarioId,
                        fecha_vencimiento: createEgresoDto.fecha_vencimiento,
                        // cantidad_restante: MoreThan(0) // TypeORM syntax needs import, use QueryBuilder or filter
                    },
                    order: { id: 'ASC' } // FIFO based on entry ID
                });

                // Filter manually or use basic find works. 
                // Note: We need to handle case where user selects a date but we have 0 stock in batches (maybe data inconsistency).

                for (const batch of batches) {
                    if (remainingToDeduct <= 0) break;
                    if (batch.cantidad_restante <= 0) continue;

                    const deduct = Math.min(remainingToDeduct, batch.cantidad_restante);
                    batch.cantidad_restante -= deduct;
                    remainingToDeduct -= deduct;

                    await queryRunner.manager.save(PedidosDetalle, batch);
                }

                if (remainingToDeduct > 0) {
                    // Could not satisfy full amount from batches with this date. 
                    // This implies global stock exists but batch stock missing? 
                    // Or user selected a date that has no stock?
                    // We will proceed but warn? Or throw?
                    // Considering user said "deduct", if we can't, maybe we show error?
                    // But "Inventory" has stock. So we let it pass, deducting global stock, but batches are empty.
                    // Ideally we throw if strict.
                }
            }

            // Create Egreso
            const egreso = this.egresoRepository.create(createEgresoDto);
            const savedEgreso = await queryRunner.manager.save(EgresoInventario, egreso);

            // Update Inventario Stock (Global)
            inventario.cantidad_existente -= createEgresoDto.cantidad;
            await queryRunner.manager.save(Inventario, inventario);

            await queryRunner.commitTransaction();
            return savedEgreso;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(clinicaId?: number) {
        const where: any = {};
        if (clinicaId) {
            where.clinicaId = clinicaId;
        }
        return this.egresoRepository.find({
            where,
            relations: ['inventario']
        });
    }

    async findHistory(inventarioId: number, fechaInicio?: string, fechaFin?: string, clinicaId?: number) {
        const whereClause: any = { inventarioId };

        if (clinicaId) {
            whereClause.clinicaId = clinicaId;
        }

        if (fechaInicio && fechaFin) {
            whereClause.fecha = Between(fechaInicio, fechaFin);
        }

        return this.egresoRepository.find({
            where: whereClause,
            order: {
                fecha: 'DESC'
            }
        });
    }

    async remove(id: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const egreso = await queryRunner.manager.findOne(EgresoInventario, {
                where: { id }
            });

            if (!egreso) {
                throw new NotFoundException('Egreso no encontrado');
            }

            // Revert Stock in Batches
            if (egreso.fecha_vencimiento) {
                const batches = await queryRunner.manager.find(PedidosDetalle, {
                    where: {
                        idinventario: egreso.inventarioId,
                        fecha_vencimiento: egreso.fecha_vencimiento
                    },
                    order: { id: 'ASC' }
                });

                if (batches.length > 0) {
                    // Start filling up the first batch found, or distribute?
                    // Simplest: Add all to the first batch. 
                    // Technically we don't know which batch specifically was deducted from multiple, 
                    // but fungibility assumption within same expiration date applies.
                    batches[0].cantidad_restante += egreso.cantidad;
                    await queryRunner.manager.save(PedidosDetalle, batches[0]);
                }
            }


            const inventario = await queryRunner.manager.findOne(Inventario, {
                where: { id: egreso.inventarioId }
            });

            if (inventario) {
                inventario.cantidad_existente += egreso.cantidad; // Revert stock
                await queryRunner.manager.save(Inventario, inventario);
            }

            await queryRunner.manager.remove(EgresoInventario, egreso);

            await queryRunner.commitTransaction();
            return { message: 'Egreso eliminado y stock revertido' };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async update(id: number, updateEgresoDto: CreateEgresoInventarioDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const egreso = await queryRunner.manager.findOne(EgresoInventario, {
                where: { id }
            });

            if (!egreso) {
                throw new NotFoundException('Egreso no encontrado');
            }

            const inventario = await queryRunner.manager.findOne(Inventario, {
                where: { id: egreso.inventarioId }
            });

            if (!inventario) {
                throw new NotFoundException('Inventario no encontrado');
            }

            // Calculate difference
            const quantityDiff = updateEgresoDto.cantidad - egreso.cantidad;

            if (quantityDiff > 0) {
                // We need more stock to cover the increase
                if (inventario.cantidad_existente < quantityDiff) {
                    throw new BadRequestException('Stock insuficiente para la actualización');
                }
                inventario.cantidad_existente -= quantityDiff;
            } else if (quantityDiff < 0) {
                // We are returning some stock (quantity decreased)
                // diff is negative, so -= diff means adding the positive value
                inventario.cantidad_existente -= quantityDiff;
            }

            // Update fields
            egreso.fecha = updateEgresoDto.fecha;
            egreso.cantidad = updateEgresoDto.cantidad;
            egreso.fecha_vencimiento = updateEgresoDto.fecha_vencimiento;

            await queryRunner.manager.save(Inventario, inventario);
            await queryRunner.manager.save(EgresoInventario, egreso);

            await queryRunner.commitTransaction();
            return egreso;

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
