import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PagosDoctores } from './pagos_doctores.entity';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';

@Entity('pagos_detalle_doctores')
export class PagosDetalleDoctores {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => PagosDoctores, (pago) => pago.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idPagos' })
    pago: PagosDoctores;

    @Column()
    idhistoria_clinica: number;

    @ManyToOne(() => HistoriaClinica)
    @JoinColumn({ name: 'idhistoria_clinica' })
    historiaClinica: HistoriaClinica;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    costo_laboratorio: number;

    @Column({ type: 'date', nullable: true })
    fecha_pago_paciente: Date;

    @Column({ nullable: true })
    forma_pago_paciente: string;

    @Column({ nullable: true })
    factura: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    descuento: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    comision: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;
}
