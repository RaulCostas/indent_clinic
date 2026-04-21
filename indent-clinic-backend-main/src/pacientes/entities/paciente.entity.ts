import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { FichaMedica } from '../../ficha_medica/entities/ficha_medica.entity';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('pacientes')
export class Paciente {
    @PrimaryGeneratedColumn()
    id: number;


    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha: string;

    @Column({ nullable: true })
    access_id: string;

    @Column()
    paterno: string;

    @Column({ nullable: true })
    materno: string;

    @Column()
    nombre: string;

    @Column({ nullable: true })
    ci: string;

    @Column()
    direccion: string;

    @Column({ nullable: true })
    lugar_residencia: string;

    @Column()
    telefono: string;

    @Column()
    celular: string;

    @Column({ nullable: true })
    ultimo_cumpleanos_felicitado: number;

    @Column()
    email: string;

    @Column()
    casilla: string;

    @Column()
    profesion: string;

    @Column()
    estado_civil: string;

    @Column()
    direccion_oficina: string;

    @Column()
    telefono_oficina: string;

    @Column({ type: 'date' })
    fecha_nacimiento: string;

    @Column()
    sexo: string;

    @Column()
    seguro_medico: string;

    @Column()
    poliza: string;

    @Column()
    responsable: string;

    @Column()
    parentesco: string;

    @Column()
    direccion_responsable: string;

    @Column()
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
