import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Especialidad } from '../../especialidad/entities/especialidad.entity';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { ProformaDetalle } from '../../proformas/entities/proforma-detalle.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('historia_clinica')
export class HistoriaClinica {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ type: 'date' })
    fecha: Date;

    @Column({ nullable: true })
    pieza: string;

    @Column({ type: 'int', default: 1 })
    cantidad: number;

    @Column({ nullable: true })
    proformaDetalleId: number;

    @ManyToOne(() => ProformaDetalle, { nullable: true })
    @JoinColumn({ name: 'proformaDetalleId' })
    proformaDetalle: ProformaDetalle;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ nullable: true })
    especialidadId: number;

    @ManyToOne(() => Especialidad, { nullable: true })
    @JoinColumn({ name: 'especialidadId' })
    especialidad: Especialidad;

    @Column({ nullable: true })
    doctorId: number;

    @ManyToOne(() => Doctor, { nullable: true })
    @JoinColumn({ name: 'doctorId' })
    doctor: Doctor;


    @Column({ type: 'text', nullable: true })
    diagnostico: string;

    @Column({ default: 'no terminado' })
    estadoTratamiento: string; // 'terminado' | 'no terminado'

    @Column({ default: 'no terminado' })
    estadoPresupuesto: string; // 'terminado' | 'no terminado'

    @Column({ nullable: true })
    proformaId: number;

    @ManyToOne(() => Proforma, { nullable: true })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column({ nullable: true })
    tratamiento: string;

    @Column({ default: false, name: 'Caso_Clinico' })
    casoClinico: boolean;


    @Column({ default: 'NO' })
    pagado: string; // 'SI' | 'NO' (pago al doctor)

    @Column({ default: false })
    cancelado: boolean; // pago del paciente

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    precio: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    descuento: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    precioConDescuento: number;


    @Column({ type: 'text', nullable: true })
    firmaPaciente: string;


    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
