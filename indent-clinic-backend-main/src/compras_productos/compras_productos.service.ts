import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like } from 'typeorm';
import { CompraProducto } from './entities/compra-producto.entity';
import { CompraProductoDetalle } from './entities/compra-producto-detalle.entity';
import { ProductoComercial } from '../productos_comerciales/entities/producto_comercial.entity';
import { CreateCompraProductoDto } from './dto/create-compra-producto.dto';
import { Egreso } from '../egresos/entities/egreso.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { FormaPago } from '../forma_pago/entities/forma_pago.entity';
import { LoteProducto } from '../productos_comerciales/entities/lote-producto.entity';

@Injectable()
export class ComprasProductosService {
    constructor(
        @InjectRepository(CompraProducto)
        private readonly compraRepository: Repository<CompraProducto>,
        @InjectRepository(ProductoComercial)
        private readonly productoRepository: Repository<ProductoComercial>,
        @InjectRepository(Proveedor)
        private readonly proveedorRepository: Repository<Proveedor>,
        private readonly dataSource: DataSource,
    ) { }

    async onModuleInit() {
        // Migración única para detallar egresos antiguos de compras
        try {
            const egresos = await this.dataSource.getRepository(Egreso).find({
                where: { detalle: Like('PAGO PROVEEDOR: %') }
            });

            for (const egreso of egresos) {
                const match = egreso.detalle.match(/COMPRA #(\d+)/);
                if (match) {
                    const compraId = parseInt(match[1]);
                    const compra = await this.compraRepository.findOne({
                        where: { id: compraId },
                        relations: ['proveedor', 'detalles', 'detalles.producto']
                    });

                    if (compra) {
                        const productosResumen = compra.detalles
                            .map(d => `${d.producto?.nombre} x${d.cantidad}`)
                            .join(', ');
                        
                        egreso.detalle = `PAGO PROV: ${compra.proveedor?.proveedor || 'S/P'} - COMPRA #${compra.id} (${productosResumen})`;
                        await this.dataSource.getRepository(Egreso).save(egreso);
                    }
                }
            }
        } catch (e) {
            console.error('Error migrando egresos:', e);
        }
    }

    async create(createDto: CreateCompraProductoDto): Promise<CompraProducto> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Crear cabecera
            const compra = new CompraProducto();
            compra.fecha = createDto.fecha ? new Date(createDto.fecha + 'T12:00:00') : new Date();
            compra.proveedorId = createDto.proveedorId;
            compra.clinicaId = createDto.clinicaId || null;
            compra.total = createDto.total;
            compra.observaciones = createDto.observaciones || null;
            compra.pagada = false;

            const savedCompra = await queryRunner.manager.save(compra);

            // 2. Crear detalles e incrementar stock
            for (const det of createDto.detalles) {
                // A. Crear LoteProducto automático
                const lote = new LoteProducto();
                lote.productoId = det.productoId;
                lote.numero_lote = det.numero_lote || 'S/N';
                lote.fecha_vencimiento = det.fecha_vencimiento || null;
                lote.costo_unitario = det.costo_unitario;
                lote.cantidad_inicial = det.cantidad;
                lote.cantidad_actual = det.cantidad;
                lote.clinicaId = savedCompra.clinicaId;
                lote.estado = 'activo';
                lote.fecha_ingreso = savedCompra.fecha;

                const savedLote = await queryRunner.manager.save(lote);

                // B. Crear Detalle de Compra vinculado al lote
                const detalle = new CompraProductoDetalle();
                detalle.compraId = savedCompra.id;
                detalle.productoId = det.productoId;
                detalle.loteId = savedLote.id;
                detalle.cantidad = det.cantidad;
                detalle.costo_unitario = det.costo_unitario;
                detalle.subtotal = Number((det.cantidad * det.costo_unitario).toFixed(2));
                detalle.numero_lote = det.numero_lote || null;
                detalle.fecha_vencimiento = det.fecha_vencimiento || null;
                
                await queryRunner.manager.save(detalle);

                // C. Incrementar stock global del producto
                await queryRunner.manager.increment(ProductoComercial, { id: det.productoId }, 'stock_actual', det.cantidad);
            }

            await queryRunner.commitTransaction();
            return savedCompra;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async registrarPago(id: number, formaPagoId: number): Promise<CompraProducto> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const compra = await queryRunner.manager.findOne(CompraProducto, {
                where: { id },
                relations: ['proveedor', 'detalles', 'detalles.producto']
            });

            if (!compra) throw new NotFoundException('Compra no encontrada');
            if (compra.pagada) throw new BadRequestException('La compra ya ha sido pagada');

            // 1. Marcar como pagada
            compra.pagada = true;
            compra.fecha_pago = new Date();
            const updatedCompra = await queryRunner.manager.save(compra);

            // 2. Crear Egreso en Hoja Diaria
            const productosResumen = compra.detalles
                .map(d => `${d.producto?.nombre} x${d.cantidad}`)
                .join(', ');

            const egreso = new Egreso();
            egreso.fecha = new Date(); // Fecha de hoy (pago)
            egreso.detalle = `PAGO PROV: ${compra.proveedor?.proveedor || 'S/P'} - COMPRA #${compra.id} (${productosResumen})`;
            egreso.monto = compra.total;
            egreso.moneda = 'Bolivianos';
            egreso.clinicaId = compra.clinicaId;
            egreso.formaPago = { id: formaPagoId } as FormaPago;

            await queryRunner.manager.save(egreso);

            await queryRunner.commitTransaction();
            return updatedCompra;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(clinicaId?: number, pagada?: boolean): Promise<any[]> {
        const where: any = {};
        if (clinicaId) where.clinicaId = clinicaId;
        if (pagada !== undefined) where.pagada = pagada;

        const compras = await this.compraRepository.find({
            where,
            relations: ['proveedor', 'detalles', 'detalles.producto', 'detalles.lote'],
            order: { fecha: 'DESC' }
        });

        return compras.map(c => ({
            ...c,
            tieneVentas: c.detalles.some(d => d.lote && Number(d.lote.cantidad_actual) < Number(d.lote.cantidad_inicial))
        }));
    }

    async findOne(id: number): Promise<any> {
        const compra = await this.compraRepository.findOne({
            where: { id },
            relations: ['proveedor', 'detalles', 'detalles.producto', 'detalles.lote']
        });
        if (!compra) throw new NotFoundException('Compra no encontrada');
        
        return {
            ...compra,
            tieneVentas: compra.detalles.some(d => d.lote && Number(d.lote.cantidad_actual) < Number(d.lote.cantidad_inicial))
        };
    }

    async remove(id: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const compra = await queryRunner.manager.findOne(CompraProducto, {
                where: { id },
                relations: ['detalles', 'detalles.lote']
            });

            if (!compra) throw new NotFoundException('Compra no encontrada');
            if (compra.pagada) throw new BadRequestException('No se puede eliminar una compra ya pagada. Debe anular el egreso primero (manual).');

            // Validar si tiene ventas para bloquear eliminación
            const tieneVentas = compra.detalles.some(d => d.lote && Number(d.lote.cantidad_actual) < Number(d.lote.cantidad_inicial));
            if (tieneVentas) {
                throw new BadRequestException('No se puede eliminar esta compra porque ya se han realizado ventas de sus productos.');
            }

            // Revertir Stock y Eliminar Lotes
            for (const det of compra.detalles) {
                // Restar del stock global
                await queryRunner.manager.decrement(ProductoComercial, { id: det.productoId }, 'stock_actual', det.cantidad);
                
                // Eliminar lote asociado (solo si existe)
                if (det.loteId) {
                    await queryRunner.manager.delete(LoteProducto, { id: det.loteId });
                }
            }

            await queryRunner.manager.remove(compra);
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async update(id: number, updateDto: CreateCompraProductoDto): Promise<CompraProducto> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const compra = await queryRunner.manager.findOne(CompraProducto, {
                where: { id },
                relations: ['detalles', 'detalles.lote']
            });

            if (!compra) throw new NotFoundException('Compra no encontrada');
            if (compra.pagada) throw new BadRequestException('No se puede editar una compra ya pagada');

            // Validar si tiene ventas para bloquear edición
            const tieneVentas = compra.detalles.some(d => d.lote && Number(d.lote.cantidad_actual) < Number(d.lote.cantidad_inicial));
            if (tieneVentas) {
                throw new BadRequestException('No se puede editar esta compra porque ya se han realizado ventas de sus productos.');
            }

            // 1. Revertir Stock antiguo y eliminar lotes antiguos
            for (const det of compra.detalles) {
                await queryRunner.manager.decrement(ProductoComercial, { id: det.productoId }, 'stock_actual', det.cantidad);
                if (det.loteId) {
                    await queryRunner.manager.delete(LoteProducto, { id: det.loteId });
                }
            }

            // 2. Eliminar detalles antiguos
            await queryRunner.manager.delete(CompraProductoDetalle, { compraId: id });

            // 3. Actualizar cabecera
            compra.fecha = updateDto.fecha ? new Date(updateDto.fecha + 'T12:00:00') : compra.fecha;
            compra.proveedorId = updateDto.proveedorId;
            compra.total = updateDto.total;
            compra.observaciones = updateDto.observaciones || null;
            compra.clinicaId = updateDto.clinicaId || compra.clinicaId;

            const savedCompra = await queryRunner.manager.save(compra);

            // 4. Crear nuevos detalles, lotes e incrementar stock
            for (const det of updateDto.detalles) {
                // A. Crear nuevo LoteProducto
                const lote = new LoteProducto();
                lote.productoId = det.productoId;
                lote.numero_lote = det.numero_lote || 'S/N';
                lote.fecha_vencimiento = det.fecha_vencimiento || null;
                lote.costo_unitario = det.costo_unitario;
                lote.cantidad_inicial = det.cantidad;
                lote.cantidad_actual = det.cantidad;
                lote.clinicaId = savedCompra.clinicaId;
                lote.estado = 'activo';
                lote.fecha_ingreso = savedCompra.fecha;

                const savedLote = await queryRunner.manager.save(lote);

                // B. Crear nuevo Detalle vinculado
                const detalle = new CompraProductoDetalle();
                detalle.compraId = savedCompra.id;
                detalle.productoId = det.productoId;
                detalle.loteId = savedLote.id;
                detalle.cantidad = det.cantidad;
                detalle.costo_unitario = det.costo_unitario;
                detalle.subtotal = Number((det.cantidad * det.costo_unitario).toFixed(2));
                detalle.numero_lote = det.numero_lote || null;
                detalle.fecha_vencimiento = det.fecha_vencimiento || null;

                await queryRunner.manager.save(detalle);

                // C. Incrementar stock global
                await queryRunner.manager.increment(ProductoComercial, { id: det.productoId }, 'stock_actual', det.cantidad);
            }

            await queryRunner.commitTransaction();
            return savedCompra;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
