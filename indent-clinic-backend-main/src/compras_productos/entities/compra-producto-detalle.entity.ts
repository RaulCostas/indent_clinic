import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CompraProducto } from './compra-producto.entity';
import { ProductoComercial } from '../../productos_comerciales/entities/producto_comercial.entity';

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
}
