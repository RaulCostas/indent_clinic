import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Personal } from '../../personal/entities/personal.entity';

@Entity('vacaciones')
export class Vacacion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    idpersonal: number;

    @ManyToOne(() => Personal, { eager: true })
    @JoinColumn({ name: 'idpersonal' })
    personal: Personal;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha: string;

    @Column()
    tipo_solicitud: string;

    @Column('int')
    cantidad_dias: number;

    @Column({ type: 'date' })
    fecha_desde: string;

    @Column({ type: 'date' })
    fecha_hasta: string;

    @Column({ default: 'NO' })
    autorizado: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column({ default: 'activo' })
    estado: string;
}
