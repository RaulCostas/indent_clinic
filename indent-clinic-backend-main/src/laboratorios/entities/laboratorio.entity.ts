import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('laboratorios')
export class Laboratorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    laboratorio: string;

    @Column()
    celular: string;

    @Column()
    telefono: string;

    @Column()
    direccion: string;

    @Column()
    email: string;

    @Column()
    banco: string;

    @Column({ name: 'numero_cuenta' })
    numero_cuenta: string;

    @Column()
    estado: string;
}
