import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';

@Entity('pagos_tablet')
export class PagoTablet {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre_paciente: string;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column({ nullable: true })
    clinicaId: number;


    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'formaPagoId' })
    formaPago: FormaPago;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;
}
