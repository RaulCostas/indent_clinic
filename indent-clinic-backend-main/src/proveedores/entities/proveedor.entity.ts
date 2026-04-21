import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Pedidos } from 'src/pedidos/entities/pedidos.entity';

@Entity('proveedores')
export class Proveedor {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    proveedor: string;

    @Column()
    celular: string;

    @Column()
    direccion: string;

    @Column()
    email: string;

    @Column()
    nombre_contacto: string;

    @Column()
    celular_contacto: string;

    @Column({ default: 'activo' })
    estado: string;

    @OneToMany(() => Pedidos, (pedido) => pedido.proveedor)
    pedidos: Pedidos[];
}
