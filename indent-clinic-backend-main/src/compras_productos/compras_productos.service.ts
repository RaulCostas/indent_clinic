import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { CompraProducto } from './entities/compra-producto.entity';
import { CompraProductoDetalle } from './entities/compra-producto-detalle.entity';
import { ProductoComercial } from '../productos_comerciales/entities/producto_comercial.entity';
import { CreateCompraProductoDto } from './dto/create-compra-producto.dto';
import { Egreso } from '../egresos/entities/egreso.entity';
import { Proveedor } from '../proveedores/entities/proveedor.entity';
import { FormaPago } from '../forma_pago/entities/forma_pago.entity';

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
                const detalle = new CompraProductoDetalle();
                detalle.compraId = savedCompra.id;
                detalle.productoId = det.productoId;
                detalle.cantidad = det.cantidad;
                detalle.costo_unitario = det.costo_unitario;
                detalle.subtotal = Number((det.cantidad * det.costo_unitario).toFixed(2));
                
                await queryRunner.manager.save(detalle);

                // Incrementar stock
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
                relations: ['proveedor']
            });

            if (!compra) throw new NotFoundException('Compra no encontrada');
            if (compra.pagada) throw new BadRequestException('La compra ya ha sido pagada');

            // 1. Marcar como pagada
            compra.pagada = true;
            compra.fecha_pago = new Date();
            const updatedCompra = await queryRunner.manager.save(compra);

            // 2. Crear Egreso en Hoja Diaria
            const egreso = new Egreso();
            egreso.fecha = new Date(); // Fecha de hoy (pago)
            egreso.detalle = `PAGO PROVEEDOR: ${compra.proveedor?.proveedor || 'ID: ' + compra.proveedorId} - COMPRA #${compra.id}`;
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

    async findAll(clinicaId?: number, pagada?: boolean): Promise<CompraProducto[]> {
        const where: any = {};
        if (clinicaId) where.clinicaId = clinicaId;
        if (pagada !== undefined) where.pagada = pagada;

        return this.compraRepository.find({
            where,
            relations: ['proveedor', 'detalles', 'detalles.producto'],
            order: { fecha: 'DESC' }
        });
    }

    async findOne(id: number): Promise<CompraProducto> {
        const compra = await this.compraRepository.findOne({
            where: { id },
            relations: ['proveedor', 'detalles', 'detalles.producto']
        });
        if (!compra) throw new NotFoundException('Compra no encontrada');
        return compra;
    }

    async remove(id: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const compra = await queryRunner.manager.findOne(CompraProducto, {
                where: { id },
                relations: ['detalles']
            });

            if (!compra) throw new NotFoundException('Compra no encontrada');
            if (compra.pagada) throw new BadRequestException('No se puede eliminar una compra ya pagada. Debe anular el egreso primero (manual).');

            // Revertir Stock
            for (const det of compra.detalles) {
                await queryRunner.manager.decrement(ProductoComercial, { id: det.productoId }, 'stock_actual', det.cantidad);
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
}
