import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VentaProductoDetalle } from './venta-producto-detalle.entity';
import { LoteProducto } from '../../productos_comerciales/entities/lote-producto.entity';

@Entity('venta_producto_detalle_lote')
export class VentaProductoDetalleLote {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    ventaDetalleId: number;

    @ManyToOne(() => VentaProductoDetalle)
    @JoinColumn({ name: 'ventaDetalleId' })
    ventaDetalle: VentaProductoDetalle;

    @Column({ type: 'int' })
    loteId: number;

    @ManyToOne(() => LoteProducto)
    @JoinColumn({ name: 'loteId' })
    lote: LoteProducto;

    @Column({ type: 'int' })
    cantidad: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    costo_historico_lote: number; // El costo que tenía el lote al momento de la venta
}
