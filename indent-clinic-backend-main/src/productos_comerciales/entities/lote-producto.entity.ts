import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ProductoComercial } from './producto_comercial.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('lote_producto')
export class LoteProducto {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    productoId: number;

    @ManyToOne(() => ProductoComercial)
    @JoinColumn({ name: 'productoId' })
    producto: ProductoComercial;

    @Column({ type: 'varchar', nullable: true })
    numero_lote: string | null;

    @Column({ type: 'date', nullable: true })
    fecha_vencimiento: Date | string | null;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    costo_unitario: number;

    @Column({ type: 'int' })
    cantidad_inicial: number;

    @Column({ type: 'int' })
    cantidad_actual: number;

    @Column({ type: 'int', nullable: true })
    clinicaId: number | null;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column({ default: 'activo' })
    estado: string; // 'activo' | 'agotado' | 'vencido'

    @CreateDateColumn()
    fecha_ingreso: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
