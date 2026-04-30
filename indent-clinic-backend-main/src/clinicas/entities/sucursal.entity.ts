import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Clinica } from './clinica.entity';

@Entity('sucursales')
export class Sucursal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 150 })
    nombre: string;

    @Column({ type: 'text', nullable: true })
    direccion: string;

    @Column({ type: 'text', nullable: true })
    horario: string;

    @Column({ length: 50, nullable: true })
    telefono: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitud: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitud: number;

    @Column({ type: 'text', nullable: true })
    google_maps_url: string;

    @Column({ default: false })
    es_principal: boolean;

    @Column()
    clinicaId: number;

    @ManyToOne(() => Clinica, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
