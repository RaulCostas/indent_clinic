import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';
import { CompraProductoDetalle } from './compra-producto-detalle.entity';

@Entity('compra_producto')
export class CompraProducto {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: Date;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ default: false })
    pagada: boolean;

    @Column({ type: 'timestamp', nullable: true })
    fecha_pago: Date;

    @Column({ type: 'text', nullable: true })
    observaciones: string | null;

    @Column({ type: 'int' })
    proveedorId: number;

    @ManyToOne(() => Proveedor)
    @JoinColumn({ name: 'proveedorId' })
    proveedor: Proveedor;

    @Column({ type: 'int', nullable: true })
    clinicaId: number | null;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @OneToMany(() => CompraProductoDetalle, (detalle) => detalle.compra)
    detalles: CompraProductoDetalle[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
