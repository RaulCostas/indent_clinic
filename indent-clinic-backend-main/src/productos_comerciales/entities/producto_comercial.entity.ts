import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('producto_comercial')
export class ProductoComercial {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    precio_venta: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    costo: number;

    @Column({ type: 'int', default: 0 })
    stock_actual: number;

    @Column({ type: 'int', default: 0 })
    stock_minimo: number;

    @Column({ type: 'int', nullable: true })
    clinicaId: number | null;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column({ default: 'activo' })
    estado: string; // 'activo' | 'inactivo'

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
