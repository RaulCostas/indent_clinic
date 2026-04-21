import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, OneToOne } from 'typeorm';
import { Proveedor } from 'src/proveedores/entities/proveedor.entity';
import { PedidosDetalle } from 'src/pedidos/entities/pedidos-detalle.entity';
import { PagosPedidos } from '../../pagos_pedidos/entities/pagos_pedidos.entity';
import { Clinica } from 'src/clinicas/entities/clinica.entity';

@Entity('pedidos')
export class Pedidos {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: string;

    @ManyToOne(() => Proveedor, (proveedor) => proveedor.pedidos)
    @JoinColumn({ name: 'idproveedor' })
    proveedor: Proveedor;

    @Column()
    idproveedor: number;

    @Column('decimal', { precision: 10, scale: 2 })
    Sub_Total: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    Descuento: number;

    @Column('decimal', { precision: 10, scale: 2 })
    Total: number;

    @Column({ type: 'text', nullable: true })
    Observaciones: string;

    @Column({ default: false })
    Pagado: boolean;

    @OneToMany(() => PedidosDetalle, (detalle) => detalle.pedido, { cascade: true })
    detalles: PedidosDetalle[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToOne(() => PagosPedidos, (pago) => pago.pedido)
    pago: PagosPedidos;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column({ nullable: true })
    clinicaId: number;
}
