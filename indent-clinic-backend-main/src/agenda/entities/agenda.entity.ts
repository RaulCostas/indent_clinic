import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { User } from '../../users/entities/user.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';
import { Sucursal } from '../../clinicas/entities/sucursal.entity';

@Entity('agenda')
export class Agenda {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'time' })
    hora: string;

    @Column({ type: 'int' })
    duracion: number;


    @Column({ nullable: true })
    pacienteId: number;

    @ManyToOne(() => Paciente, { nullable: true })
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column()
    doctorId: number;

    @ManyToOne(() => Doctor)
    @JoinColumn({ name: 'doctorId' })
    doctor: Doctor;

    @Column({ nullable: true })
    doctorDerivaId: number;

    @ManyToOne(() => Doctor, { nullable: true })
    @JoinColumn({ name: 'doctorDerivaId' })
    doctorDeriva: Doctor;

    @Column({ nullable: true })
    proformaId: number;

    @ManyToOne(() => Proforma, { nullable: true })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column({ type: 'text', nullable: true })
    tratamiento: string;

    @Column()
    usuarioId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @Column({ default: 'pendiente' })
    estado: string;

    @Column({ type: 'text', nullable: true })
    observacion: string;

    @Column({ type: 'text', nullable: true })
    motivoCancelacion: string;

    @Column({ nullable: true })
    sucursalId: number;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursalId' })
    sucursal: Sucursal;

    @Column({ type: 'boolean', default: false })
    recordatorioEnviado: boolean;

    @Column({ default: false })
    notificado: boolean;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @CreateDateColumn({ name: 'fecha_agendado' })
    fechaAgendado: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
