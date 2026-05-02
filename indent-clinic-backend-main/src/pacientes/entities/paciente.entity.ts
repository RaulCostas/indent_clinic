import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { FichaMedica } from '../../ficha_medica/entities/ficha_medica.entity';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';
import { User } from '../../users/entities/user.entity';

@Entity('pacientes')
export class Paciente {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha: string;

    @Column()
    paterno: string;

    @Column({ nullable: true })
    materno: string;

    @Column()
    nombre: string;

    @Column({ nullable: true })
    ci: string;

    @Column({ nullable: true })
    direccion: string;

    @Column({ nullable: true })
    lugar_residencia: string;

    @Column({ nullable: true })
    telefono: string;

    @Column()
    celular: string;

    @Column({ nullable: true })
    ultimo_cumpleanos_felicitado: number;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    profesion: string;

    @Column({ nullable: true })
    estado_civil: string;

    @Column({ type: 'date' })
    fecha_nacimiento: string;

    @Column()
    sexo: string;

    @Column()
    seguro_medico: string;

    @Column({ type: 'date', nullable: true })
    fecha_vencimiento: string;

    @Column({ nullable: true })
    responsable: string;

    @Column({ nullable: true })
    parentesco: string;

    @Column({ nullable: true })
    direccion_responsable: string;

    @Column({ nullable: true })
    telefono_responsable: string;

    @Column({ default: 'activo' })
    estado: string;

    @Column({ nullable: true })
    clasificacion: string;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column({ nullable: true })
    usuarioId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @OneToOne(() => FichaMedica, (ficha) => ficha.paciente, { cascade: true })
    @JoinColumn({ name: 'fichaMedicaId' })
    fichaMedica: FichaMedica;

    @OneToMany(() => HistoriaClinica, (historia) => historia.paciente)
    historiaClinica: HistoriaClinica[];

    @OneToMany('Propuesta', (propuesta: any) => propuesta.paciente)
    propuestas: any[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
