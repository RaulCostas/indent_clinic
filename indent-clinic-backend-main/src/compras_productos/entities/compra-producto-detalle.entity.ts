import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CompraProducto } from './compra-producto.entity';
import { ProductoComercial } from '../../productos_comerciales/entities/producto_comercial.entity';
import { LoteProducto } from '../../productos_comerciales/entities/lote-producto.entity';

@Entity('compra_producto_detalle')
export class CompraProductoDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    compraId: number;

    @ManyToOne(() => CompraProducto, (compra) => compra.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'compraId' })
    compra: CompraProducto;

    @Column({ type: 'int' })
    productoId: number;

    @ManyToOne(() => ProductoComercial)
    @JoinColumn({ name: 'productoId' })
    producto: ProductoComercial;

    @Column({ type: 'int' })
    cantidad: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    costo_unitario: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    subtotal: number;

    @Column({ type: 'int', nullable: true })
    loteId: number | null;

    @ManyToOne(() => LoteProducto, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'loteId' })
    lote: LoteProducto;

    @Column({ type: 'varchar', nullable: true })
    numero_lote: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_vencimiento: string | null;
}
