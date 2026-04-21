import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Laboratorio } from '../../laboratorios/entities/laboratorio.entity';

@Entity('precios_laboratorios')
export class PrecioLaboratorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    detalle: string;

    @Column('decimal', { precision: 10, scale: 2 })
    precio: number;

    @Column()
    idLaboratorio: number;

    @ManyToOne(() => Laboratorio)
    @JoinColumn({ name: 'idLaboratorio' })
    laboratorio: Laboratorio;

    @Column({ default: 'activo' })
    estado: string;
}
