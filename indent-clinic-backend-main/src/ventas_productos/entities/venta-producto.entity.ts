import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';
import { VentaProductoDetalle } from './venta-producto-detalle.entity';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';

@Entity('venta_producto')
export class VentaProducto {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn({ type: 'timestamp' })
    fecha: Date;

    @Column({ type: 'int' })
    personalId: number;

    @ManyToOne(() => Personal)
    @JoinColumn({ name: 'personalId' })
    personal: Personal;

    @Column({ type: 'int' })
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 40 })
    comision_porcentaje: number; // 40% as requested

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    comision_monto: number; // calculated total * 0.4

    @Column({ type: 'int', nullable: true })
    formaPagoId: number;

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'formaPagoId' })
    formaPago: FormaPago;

    @Column({ type: 'int', nullable: true })
    clinicaId: number | null;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @OneToMany(() => VentaProductoDetalle, (detalle: VentaProductoDetalle) => detalle.venta, { cascade: true })
    detalles: VentaProductoDetalle[];

    @Column({ type: 'text', nullable: true })
    observaciones: string | null;

    @Column({ type: 'boolean', default: false })
    comision_pagada: boolean;

    @Column({ type: 'timestamp', nullable: true })
    comision_fecha_pago: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
