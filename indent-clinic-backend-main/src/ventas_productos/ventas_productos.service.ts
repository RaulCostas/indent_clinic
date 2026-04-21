import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { VentaProducto } from './entities/venta-producto.entity';
import { VentaProductoDetalle } from './entities/venta-producto-detalle.entity';
import { ProductoComercial } from '../productos_comerciales/entities/producto_comercial.entity';
import { OtrosIngresosService } from '../otros-ingresos/otros-ingresos.service';
import { EgresosService } from '../egresos/egresos.service';
import { Egreso } from '../egresos/entities/egreso.entity';
import { VentaProductoDetalleLote } from './entities/venta-producto-detalle-lote.entity';
import { LoteProducto } from '../productos_comerciales/entities/lote-producto.entity';
import { CreateVentaProductoDto } from './dto/create-venta-producto.dto';
import { getBoliviaDate, getBoliviaFullDate } from '../common/utils/date.utils';

@Injectable()
export class VentasProductosService {
    constructor(
        @InjectRepository(VentaProducto)
        private readonly ventaRepository: Repository<VentaProducto>,
        @InjectRepository(VentaProductoDetalle)
        private readonly detalleRepository: Repository<VentaProductoDetalle>,
        @InjectRepository(ProductoComercial)
        private readonly productoRepository: Repository<ProductoComercial>,
        private readonly otrosIngresosService: OtrosIngresosService,
        private readonly egresosService: EgresosService,
        private readonly dataSource: DataSource,
    ) { }

    async createVenta(createDto: CreateVentaProductoDto): Promise<VentaProducto> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Validar Stock global de todos los productos primero
            for (const item of createDto.detalles) {
                const producto = await queryRunner.manager.findOne(ProductoComercial, { where: { id: item.productoId } });
                if (!producto) throw new NotFoundException(`Producto #${item.productoId} no encontrado`);
                if (producto.stock_actual < item.cantidad) {
                    throw new BadRequestException(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock_actual}`);
                }
            }

            const venta = new VentaProducto();
            venta.fecha = createDto.fecha ? new Date(createDto.fecha + 'T12:00:00') : getBoliviaFullDate();
            venta.personalId = createDto.personalId;
            venta.pacienteId = createDto.pacienteId;
            venta.clinicaId = createDto.clinicaId ?? null;
            venta.formaPagoId = createDto.formaPagoId;
            venta.total = createDto.total;
            venta.comision_porcentaje = 40;
            venta.observaciones = createDto.observaciones ?? null;

            // Se guardará temporalmente con comisión 0 y se actualizará después de procesar lotes
            venta.comision_monto = 0; 
            const savedVenta = await queryRunner.manager.save(venta);

            let totalUtilidadVenta = 0;

            // 3. Crear detalles y aplicar lógica FIFO por lotes
            for (const item of createDto.detalles) {
                const detalle = new VentaProductoDetalle();
                detalle.ventaId = savedVenta.id;
                detalle.productoId = item.productoId;
                detalle.cantidad = item.cantidad;
                detalle.precio_unitario = item.precio_unitario;
                detalle.subtotal = Number((item.cantidad * item.precio_unitario).toFixed(2));
                const savedDetalle = await queryRunner.manager.save(detalle);

                // Lógica FIFO: Buscar lotes con stock disponible para este producto
                let cantidadPendiente = item.cantidad;
                const lotes = await queryRunner.manager.find(LoteProducto, {
                    where: { 
                        productoId: item.productoId, 
                        estado: 'activo',
                        ...(createDto.clinicaId ? { clinicaId: createDto.clinicaId } : {})
                    },
                    order: { fecha_ingreso: 'ASC' }
                });

                if (lotes.length === 0) {
                    // Fallback si no hay lotes registrados pero hay stock global 
                    // (para compatibilidad con datos migrados sin lotes)
                    const producto = await queryRunner.manager.findOne(ProductoComercial, { where: { id: item.productoId } });
                    const utilidadFallback = (Number(item.precio_unitario) - Number(producto?.costo || 0)) * item.cantidad;
                    totalUtilidadVenta += utilidadFallback;
                } else {
                    for (const lote of lotes) {
                        if (cantidadPendiente <= 0) break;

                        const cantidadAConsumir = Math.min(lote.cantidad_actual, cantidadPendiente);
                        
                        // Registrar el uso de este lote para este detalle
                        const detalleLote = new VentaProductoDetalleLote();
                        detalleLote.ventaDetalleId = savedDetalle.id;
                        detalleLote.loteId = lote.id;
                        detalleLote.cantidad = cantidadAConsumir;
                        detalleLote.costo_historico_lote = lote.costo_unitario;
                        await queryRunner.manager.save(detalleLote);

                        // Calcular utilidad de este tramo
                        const utilidadTramo = (Number(item.precio_unitario) - Number(lote.costo_unitario)) * cantidadAConsumir;
                        totalUtilidadVenta += utilidadTramo;

                        // Actualizar cantidad en el lote
                        lote.cantidad_actual -= cantidadAConsumir;
                        if (lote.cantidad_actual <= 0) lote.estado = 'agotado';
                        await queryRunner.manager.save(lote);

                        cantidadPendiente -= cantidadAConsumir;
                    }

                    if (cantidadPendiente > 0) {
                        // Si después de agotar lotes activos aún falta cantidad, usamos el costo base como fallback
                        const producto = await queryRunner.manager.findOne(ProductoComercial, { where: { id: item.productoId } });
                        totalUtilidadVenta += (Number(item.precio_unitario) - Number(producto?.costo || 0)) * cantidadPendiente;
                    }
                }

                // Descontar stock global
                await queryRunner.manager.decrement(ProductoComercial, { id: item.productoId }, 'stock_actual', item.cantidad);
            }

            // 4. Actualizar comisión final en la cabecera
            savedVenta.comision_monto = Number((totalUtilidadVenta * 0.4).toFixed(2));
            await queryRunner.manager.save(savedVenta);

            // 5. Integración Financiera: Registrar en "Otros Ingresos"
            await this.otrosIngresosService.create({
                fecha: createDto.fecha ? new Date(createDto.fecha + 'T12:00:00') : getBoliviaFullDate(),
                detalle: `VENTA DE PRODUCTOS - REC: ${savedVenta.id}`,
                monto: createDto.total,
                moneda: createDto.moneda || 'Bolivianos',
                formaPagoId: createDto.formaPagoId,
                clinicaId: createDto.clinicaId || 0,
            } as any);

            await queryRunner.commitTransaction();
            return savedVenta;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async registrarCompra(body: { 
        productoId: number; 
        cantidad: number; 
        costoTotal: number; 
        clinicaId: number; 
        formaPagoId: number;
        numero_lote?: string;
        fecha_vencimiento?: string;
    }): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const producto = await queryRunner.manager.findOne(ProductoComercial, { where: { id: body.productoId } });
            if (!producto) throw new NotFoundException('Producto no encontrado');

            const costoUnitario = Number((body.costoTotal / body.cantidad).toFixed(2));

            // 1. Crear nuevo Lote
            const nuevoLote = new LoteProducto();
            nuevoLote.productoId = body.productoId;
            nuevoLote.cantidad_inicial = body.cantidad;
            nuevoLote.cantidad_actual = body.cantidad;
            nuevoLote.costo_unitario = costoUnitario;
            nuevoLote.numero_lote = body.numero_lote || null;
            nuevoLote.fecha_vencimiento = body.fecha_vencimiento || null;
            nuevoLote.clinicaId = body.clinicaId;
            nuevoLote.estado = 'activo';
            await queryRunner.manager.save(nuevoLote);

            // 2. Aumentar Stock global del producto y actualizar su "último costo"
            producto.stock_actual += body.cantidad;
            producto.costo = costoUnitario; // El costo base del producto se actualiza con la última compra
            await queryRunner.manager.save(producto);

            // 3. Registrar Egreso en Hoja Diaria
            await this.egresosService.create({
                detalle: `COMPRA DE MERCADERÍA: ${producto.nombre} (${body.cantidad} und) - LOTE: ${body.numero_lote || 'N/A'}`,
                monto: body.costoTotal,
                moneda: 'Bolivianos',
                fecha: getBoliviaDate(),
                formaPagoId: body.formaPagoId,
                clinicaId: body.clinicaId
            } as any);

            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getComisionesReport(year: number, month: number, clinicaId?: number, personalId?: number) {
        const query = `
            SELECT 
                v.id as "ventaId",
                v.fecha,
                v.total,
                -- Recalcular comisión basándonos en los lotes consumidos si existen, si no, fallback al costo base
                COALESCE(
                    (SELECT SUM((vd_int.precio_unitario - vdl.costo_historico_lote) * vdl.cantidad * 0.4)
                     FROM venta_producto_detalle vd_int
                     JOIN venta_producto_detalle_lote vdl ON vdl."ventaDetalleId" = vd_int.id
                     WHERE vd_int."ventaId" = v.id),
                    ((vd.precio_unitario - prod.costo) * vd.cantidad * 0.4)
                ) as "comision_detalle_recalculada",
                v."comision_monto" as "comision_monto_original", 
                v."comision_pagada",
                v."personalId",
                per.nombre as "personalNombre",
                per.paterno as "personalPaterno",
                per.materno as "personalMaterno",
                pac.nombre as "pacienteNombre",
                pac.paterno as "pacientePaterno",
                vd.cantidad,
                prod.nombre as "productoNombre",
                prod.costo as "productoCosto",
                vd.precio_unitario as "precioUnitario",
                COALESCE(
                    (SELECT string_agg('Lote: ' || l.numero_lote || ' (' || vdl_sub.cantidad || ' und)', ', ')
                     FROM venta_producto_detalle_lote vdl_sub
                     JOIN lote_producto l ON l.id = vdl_sub."loteId"
                     WHERE vdl_sub."ventaDetalleId" = vd.id),
                    'Global'
                ) as "lotes_detalle"
            FROM venta_producto v
            LEFT JOIN personal per ON v."personalId" = per.id
            LEFT JOIN pacientes pac ON v."pacienteId" = pac.id
            LEFT JOIN venta_producto_detalle vd ON vd."ventaId" = v.id
            LEFT JOIN producto_comercial prod ON vd."productoId" = prod.id
            WHERE EXTRACT(YEAR FROM v.fecha) = $1 
              AND EXTRACT(MONTH FROM v.fecha) = $2
              ${clinicaId ? `AND v."clinicaId" = $3` : ''}
              ${personalId ? `AND v."personalId" = ${clinicaId ? '$4' : '$3'}` : ''}
            ORDER BY v.fecha DESC
        `;

        const params = [year, month];
        if (clinicaId) params.push(clinicaId);
        if (personalId) params.push(personalId);

        const rows = await this.dataSource.query(query, params);

        // Agrupación de resultados
        const aggregated = {};

        for (const r of rows) {
            const pid = r.personalId;
            if (!aggregated[pid]) {
                aggregated[pid] = {
                    personalId: pid,
                    nombre: r.personalNombre || 'Desconocido',
                    paterno: r.personalPaterno || '',
                    materno: r.personalMaterno || '',
                    cantidad_ventas: 0,
                    total_ventas: 0,
                    total_comision: 0,
                    total_pendiente: 0,
                    total_pagado: 0,
                    ventas_map: {} // mapa interno por ventaId
                };
            }

            const pData = aggregated[pid];
            const vId = r.ventaId;
            const comisionItem = Number(r.comision_detalle_recalculada || 0);

            if (!pData.ventas_map[vId]) {
                pData.cantidad_ventas += 1;
                pData.total_ventas += Number(r.total || 0);
                // NOTA: Usamos la comisión recalculada por ítem para el total del reporte
                // pData.total_comision += Number(r.comision_monto || 0); // Esto usaba el total * 0.4 antiguo

                pData.ventas_map[vId] = {
                    fecha: r.fecha,
                    paciente: `${r.pacienteNombre || ''} ${r.pacientePaterno || ''}`.trim(),
                    total: Number(r.total || 0),
                    comision: 0, // se sumará ítem por ítem abajo
                    estado: r.comision_pagada ? 'Pagado' : 'Pendiente',
                    comision_pagada: r.comision_pagada,
                    productos_array: []
                };
            }

            pData.ventas_map[vId].comision += comisionItem;
            pData.total_comision += comisionItem;

            if (r.comision_pagada) {
                pData.total_pagado += comisionItem;
            } else {
                pData.total_pendiente += comisionItem;
            }

            if (r.productoNombre) {
                const labelBatch = r.lotes_detalle && r.lotes_detalle !== 'Global' ? ` [${r.lotes_detalle}]` : '';
                pData.ventas_map[vId].productos_array.push(`${r.cantidad}x ${r.productoNombre}${labelBatch}`);
            }
        }

        // Formateo final para el componente React
        return Object.values(aggregated).map((p: any) => {
            const ventas_detalladas = Object.values(p.ventas_map).map((v: any) => ({
                fecha: v.fecha,
                paciente: v.paciente,
                total: v.total,
                comision: v.comision,
                estado: v.estado,
                productos: v.productos_array.join(', ')
            }));

            // Eliminar el mapa temporal antes de enviar
            delete p.ventas_map;
            return {
                ...p,
                ventas_detalladas
            };
        });
    }

    async pagarComisiones(body: { personalId: number; year: number; month: number; formaPagoId: number; total: number; clinicaId: number }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const startDate = new Date(body.year, body.month - 1, 1);
            const endDate = new Date(body.year, body.month, 0, 23, 59, 59);

            // 1. Obtener nombre del personal usando la Entidad para evitar errores de mapeo
            const v = await queryRunner.manager.getRepository(VentaProducto).createQueryBuilder('venta')
                .leftJoinAndSelect('venta.personal', 'personal')
                .where('venta.personalId = :pid', { pid: body.personalId })
                .getOne();
            
            const nombreCompleto = v?.personal ? `${v.personal.nombre} ${v.personal.paterno}` : `ID: ${body.personalId}`;

            // 2. Registrar el Egreso (directamente con el manager para participar en la misma transacción)
            const nuevoEgreso = queryRunner.manager.create(Egreso, {
                detalle: `PAGO DE COMISIÓN: ${nombreCompleto} - PERIODO ${body.month}/${body.year}`,
                monto: Number(body.total),
                moneda: 'Bolivianos',
                fecha: getBoliviaDate(),
                formaPago: { id: body.formaPagoId },
                clinicaId: body.clinicaId
            });
            await queryRunner.manager.save(nuevoEgreso);

            // 3. Marcar ventas como pagadas
            await queryRunner.manager.createQueryBuilder()
                .update(VentaProducto)
                .set({ 
                    comision_pagada: true,
                    comision_fecha_pago: getBoliviaFullDate()
                })
                .where('personalId = :pid', { pid: body.personalId })
                .andWhere('fecha BETWEEN :start AND :end', { start: startDate, end: endDate })
                .andWhere('comision_pagada = :pagada', { pagada: false })
                .andWhere('clinicaId = :cid', { cid: body.clinicaId })
                .execute();

            await queryRunner.commitTransaction();
            return { message: 'Pago registrado y comisiones liquidadas con éxito' };
        } catch (err) {
            console.error('Error en pagarComisiones:', err);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAllVentas(clinicaId?: number): Promise<VentaProducto[]> {
      return await this.ventaRepository.find({
          where: clinicaId ? { clinicaId } : {},
          relations: ['paciente', 'personal', 'detalles', 'detalles.producto'],
          order: { fecha: 'DESC' }
      });
    }
}
