import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Pedidos } from '../../pedidos/entities/pedidos.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('pagos_pedidos')
export class PagosPedidos {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: Date;

    @OneToOne(() => Pedidos)
    @JoinColumn({ name: 'idPedido' })
    pedido: Pedidos;

    @Column()
    idPedido: number;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column({ nullable: true })
    factura: string;

    @Column({ nullable: true })
    recibo: string;

    @Column()
    forma_pago: string;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;
}
