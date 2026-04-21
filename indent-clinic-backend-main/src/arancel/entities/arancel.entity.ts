import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Especialidad } from '../../especialidad/entities/especialidad.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('arancel')
export class Arancel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    detalle: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    precio: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    precio_sin_seguro: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    precio_gold: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    precio_silver: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    precio_odontologico: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    comision: number;

    @Column({ length: 10, nullable: true })
    moneda: string;

    @Column({ default: 'activo' })
    estado: string;

    @Column()
    idEspecialidad: number;

    @ManyToOne(() => Especialidad)
    @JoinColumn({ name: 'idEspecialidad' })
    especialidad: Especialidad;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @UpdateDateColumn()
    updatedAt: Date;
}
