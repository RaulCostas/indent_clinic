import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ComisionTarjeta } from '../../comision_tarjeta/entities/comision_tarjeta.entity';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';
import { User } from '../../users/entities/user.entity';

@Entity('pagos')
export class Pago {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ nullable: true })
    proformaId: number;

    @ManyToOne(() => Proforma)
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    monto_comision: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    tc: number;

    @Column({ nullable: true })
    recibo: string;

    @Column({ nullable: true })
    factura: string;

    @ManyToOne(() => ComisionTarjeta)
    @JoinColumn({ name: 'comisionTarjetaId' })
    comisionTarjeta: ComisionTarjeta;

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'formaPagoId' })
    formaPagoRel: FormaPago;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ nullable: true })
    historiaClinicaId: number;

    @Column({
        type: 'enum',
        enum: ['Bolivianos', 'Dólares'],
        default: 'Bolivianos'
    })
    moneda: string;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    descuento: number;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column({ nullable: true })
    usuarioId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
