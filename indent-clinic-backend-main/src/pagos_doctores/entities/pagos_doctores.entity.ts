import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';
import { PagosDetalleDoctores } from './pagos-detalle-doctores.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('pagos_doctores')
export class PagosDoctores {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    idDoctor: number;

    @ManyToOne(() => Doctor)
    @JoinColumn({ name: 'idDoctor' })
    doctor: Doctor;

    @Column({ type: 'date' })
    fecha: Date;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    comision: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column()
    moneda: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    tc: number;

    @Column()
    idForma_pago: number;

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'idForma_pago' })
    formaPago: FormaPago;

    @OneToMany(() => PagosDetalleDoctores, (detalle) => detalle.pago, { cascade: true })
    detalles: PagosDetalleDoctores[];

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;
}
