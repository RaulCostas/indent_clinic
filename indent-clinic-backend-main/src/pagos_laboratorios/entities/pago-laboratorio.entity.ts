import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { TrabajoLaboratorio } from '../../trabajos_laboratorios/entities/trabajo_laboratorio.entity';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('pagos_laboratorios')
export class PagoLaboratorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column()
    idTrabajos_Laboratorios: number;

    @OneToOne(() => TrabajoLaboratorio)
    @JoinColumn({ name: 'idTrabajos_Laboratorios' })
    trabajoLaboratorio: TrabajoLaboratorio;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    monto: number;

    @Column()
    moneda: string;

    @Column()
    idforma_pago: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    tc: number;

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'idforma_pago' })
    formaPago: FormaPago;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;
}
