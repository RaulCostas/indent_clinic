import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { GastosFijos } from '../../gastos_fijos/entities/gastos_fijos.entity';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';
import { Clinica } from 'src/clinicas/entities/clinica.entity';

@Entity('pagos_gastos_fijos')
export class PagosGastosFijos {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @ManyToOne(() => GastosFijos)
    @JoinColumn({ name: 'gasto_fijo_id' })
    gastoFijo: GastosFijos;

    @Column({ type: 'date' })
    fecha: Date;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column()
    moneda: string; // 'Bolivianos' | 'Dólares'

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'forma_pago_id' })
    formaPago: FormaPago;

    @Column({ nullable: true })
    observaciones: string;

    @Column({ nullable: true })
    clinicaId: number;
}
