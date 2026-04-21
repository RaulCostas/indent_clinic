import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Proforma } from '../../proformas/entities/proforma.entity';
import { User } from '../../users/entities/user.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('agenda')
export class Agenda {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'time' })
    hora: string;

    @Column({ type: 'int' })
    duracion: number; // en minutos

    @Column({ type: 'int' })
    consultorio: number; // 1 - 8

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
    proformaId: number;

    @ManyToOne(() => Proforma, { nullable: true })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column({ type: 'text', nullable: true })
    tratamiento: string;

    @Column()
    usuarioId: number; // Quien agendó

    @ManyToOne(() => User)
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @CreateDateColumn({ name: 'fecha_agendado' })
    fechaAgendado: Date;

    // Hora agendado is implicitly part of fecha_agendado timestamp, but if specific column needed:
    // We will rely on fechaAgendado being a full timestamp.

    @Column({ default: 'agendado' })
    estado: string;

    @Column({ type: 'text', nullable: true })
    motivoCancelacion: string;

    @Column({ type: 'text', nullable: true })
    observacion: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sucursal: string;

    @Column({ type: 'boolean', default: false })
    recordatorioEnviado: boolean;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @UpdateDateColumn()
    updatedAt: Date;
}
