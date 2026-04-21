import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('gastos_fijos')
export class GastosFijos {
    @PrimaryGeneratedColumn()
    id: number;



    @Column()
    dia: number;

    @Column({ default: false })
    anual: boolean;

    @Column({ nullable: true })
    mes: string;

    @Column()
    gasto_fijo: string;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column()
    moneda: string;

    @Column({ default: 'activo' })
    estado: string;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;
}
