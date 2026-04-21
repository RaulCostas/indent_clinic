import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { VentaProducto } from './venta-producto.entity';
import { ProductoComercial } from '../../productos_comerciales/entities/producto_comercial.entity';

@Entity('venta_producto_detalle')
export class VentaProductoDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    ventaId: number;

    @ManyToOne(() => VentaProducto, (venta) => venta.detalles)
    @JoinColumn({ name: 'ventaId' })
    venta: VentaProducto;

    @Column({ type: 'int' })
    productoId: number;

    @ManyToOne(() => ProductoComercial)
    @JoinColumn({ name: 'productoId' })
    producto: ProductoComercial;

    @Column('int')
    cantidad: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    precio_unitario: number;
    
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    subtotal: number; // cantidad * precio_unitario
}
