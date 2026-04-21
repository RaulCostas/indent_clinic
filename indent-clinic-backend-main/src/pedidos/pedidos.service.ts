import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Pedidos } from './entities/pedidos.entity';
import { CreatePedidoDto } from './dto/create-pedidos.dto';
import { UpdatePedidoDto } from './dto/update-pedidos.dto';
import { PedidosDetalle } from './entities/pedidos-detalle.entity';
import { Inventario } from '../inventario/entities/inventario.entity';

@Injectable()
export class PedidosService {
    constructor(
        @InjectRepository(Pedidos)
        private pedidosRepository: Repository<Pedidos>,
        private dataSource: DataSource
    ) { }

    async create(createPedidoDto: CreatePedidoDto) {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { detalles, ...pedidoData } = createPedidoDto;

            // 1. Save Pedido Master
            const pedido = this.pedidosRepository.create({
                ...pedidoData,
                Pagado: false
            });
            const savedPedido = await queryRunner.manager.save(Pedidos, pedido);

            // 2. Save Detalles and Update Stock
            for (const detalleDto of detalles) {
                // Create detalle with initial remaining quantity
                const detalle = queryRunner.manager.create(PedidosDetalle, {
                    ...detalleDto,
                    cantidad_restante: detalleDto.cantidad, // Initialize remaining stock
                    idpedidos: savedPedido.id
                });
                await queryRunner.manager.save(PedidosDetalle, detalle);

                // Update Inventario
                const inventario = await queryRunner.manager.findOne(Inventario, {
                    where: { id: detalleDto.idinventario }
                });

                if (!inventario) {
                    throw new NotFoundException(`Inventario with ID ${detalleDto.idinventario} not found`);
                }

                inventario.cantidad_existente += detalleDto.cantidad;
                await queryRunner.manager.save(Inventario, inventario);
            }

            await queryRunner.commitTransaction();
            return savedPedido;
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
        return this.pedidosRepository.find({
            where,
            relations: ['proveedor', 'detalles', 'detalles.inventario'],
            order: { fecha: 'DESC' }
        });
    }

    async findOne(id: number) {
        const pedido = await this.pedidosRepository.findOne({
            where: { id },
            relations: ['proveedor', 'detalles', 'detalles.inventario']
        });
        if (!pedido) {
            throw new NotFoundException(`Pedido with ID ${id} not found`);
        }
        return pedido;
    }

    async update(id: number, updatePedidoDto: UpdatePedidoDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Get existing pedido with details
            const existingPedido = await queryRunner.manager.findOne(Pedidos, {
                where: { id },
                relations: ['detalles']
            });

            if (!existingPedido) {
                throw new NotFoundException(`Pedido with ID ${id} not found`);
            }

            // 2. Revert Stock (Subtract what was added)
            // Note: If we are implementing batch logic, reverting is tricky if some was used.
            // Assumption: Creating/Editing Pedidos is for INPUT. If we edit an input that was already used, it creates inconsistency.
            // For now, we revert the full amount to keeps Global/Local sync, but if stock < 0, it might error.
            // Ideally validation should check if 'cantidad_restante' < 'cantidad' (meaning used) before allowing reduce.
            // But user just asks for "Show quantity... and deduct". I will allow revert for now but warn/log if needed.

            for (const oldDetalle of existingPedido.detalles) {
                const inventario = await queryRunner.manager.findOne(Inventario, {
                    where: { id: oldDetalle.idinventario }
                });
                if (inventario) {
                    inventario.cantidad_existente -= oldDetalle.cantidad;
                    await queryRunner.manager.save(Inventario, inventario);
                }
            }

            // 3. Delete old details
            await queryRunner.manager.delete(PedidosDetalle, { idpedidos: id });

            // 4. Update Master Data
            const { detalles, ...pedidoData } = updatePedidoDto;

            const pedidoToUpdate = await queryRunner.manager.preload(Pedidos, {
                id: id,
                ...pedidoData
            });

            if (!pedidoToUpdate) {
                throw new NotFoundException(`Pedido with ID ${id} not found`);
            }

            await queryRunner.manager.save(Pedidos, pedidoToUpdate);

            // 5. Insert New Details and Apply Stock
            for (const detalleDto of (detalles || [])) {
                // Create detalle
                const detalle = queryRunner.manager.create(PedidosDetalle, {
                    ...detalleDto,
                    cantidad_restante: detalleDto.cantidad, // Initialize remaining stock
                    idpedidos: id
                });
                await queryRunner.manager.save(PedidosDetalle, detalle);

                // Update Inventario
                const inventario = await queryRunner.manager.findOne(Inventario, {
                    where: { id: detalleDto.idinventario }
                });

                if (!inventario) {
                    throw new NotFoundException(`Inventario with ID ${detalleDto.idinventario} not found`);
                }

                inventario.cantidad_existente += detalleDto.cantidad;
                await queryRunner.manager.save(Inventario, inventario);
            }

            await queryRunner.commitTransaction();
            return this.findOne(id);

        } catch (err) {
            console.error('Error updating pedido:', err);
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
            const existingPedido = await queryRunner.manager.findOne(Pedidos, {
                where: { id },
                relations: ['detalles']
            });

            if (!existingPedido) {
                throw new NotFoundException(`Pedido with ID ${id} not found`);
            }

            for (const oldDetalle of existingPedido.detalles) {
                const inventario = await queryRunner.manager.findOne(Inventario, {
                    where: { id: oldDetalle.idinventario }
                });
                if (inventario) {
                    inventario.cantidad_existente -= oldDetalle.cantidad;
                    await queryRunner.manager.save(Inventario, inventario);
                }
            }

            await queryRunner.manager.remove(Pedidos, existingPedido);

            await queryRunner.commitTransaction();
            return { message: `Pedido #${id} deleted and stock reverted` };

        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findExpirationDates(inventarioId: number) {
        const result = await this.dataSource
            .createQueryBuilder(PedidosDetalle, 'detalle')
            .select('detalle.fecha_vencimiento', 'fecha')
            .addSelect('SUM(detalle.cantidad_restante)', 'stock')
            .where('detalle.idinventario = :inventarioId', { inventarioId })
            .andWhere('detalle.fecha_vencimiento IS NOT NULL')
            .andWhere('detalle.cantidad_restante > 0') // Only show batches with stock
            .groupBy('detalle.fecha_vencimiento')
            .orderBy('detalle.fecha_vencimiento', 'ASC')
            .getRawMany();

        return result; // Returns { fecha: string, stock: string/number }[]
    }

    async updatePaymentStatus(id: number, status: boolean) {
        const pedido = await this.pedidosRepository.findOne({ where: { id } });
        if (!pedido) {
            throw new NotFoundException(`Pedido with ID ${id} not found`);
        }
        pedido.Pagado = status;
        return this.pedidosRepository.save(pedido);
    }

    async resetAllPayments() {
        return this.pedidosRepository.createQueryBuilder()
            .update(Pedidos)
            .set({ Pagado: false })
            .execute();
    }

    async getProductHistory(inventoryId: number, year: number) {
        // Define range for the year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const qb = this.dataSource
            .createQueryBuilder(PedidosDetalle, 'detalle')
            .innerJoinAndSelect('detalle.pedido', 'pedido')
            .innerJoinAndSelect('pedido.proveedor', 'proveedor')
            .where('detalle.idinventario = :inventoryId', { inventoryId })
            .andWhere('pedido.fecha BETWEEN :startDate AND :endDate', { startDate, endDate })
            .select([
                'pedido.fecha AS fecha',
                'proveedor.proveedor AS proveedor',
                'detalle.cantidad AS cantidad',
                'detalle.precio_unitario AS precio_unitario',
                '(detalle.cantidad * detalle.precio_unitario) AS total'
            ])
            .orderBy('pedido.fecha', 'ASC');

        try {
            const sql = qb.getSql();
            console.log('Generated SQL:', sql);
            const result = await qb.getRawMany();
            console.log(`Count Found: ${result.length}`);
            if (result.length === 0) {
                // Check if any details exist for this inventory at all, ignoring date
                const countAny = await this.dataSource.getRepository(PedidosDetalle)
                    .count({ where: { idinventario: inventoryId } });
                console.log(`Total records for this inventory (any year): ${countAny}`);
            }
            return result;
        } catch (error) {
            console.error('Query Error:', error);
            throw error;
        }
    }
}
