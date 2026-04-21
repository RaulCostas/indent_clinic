import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cubetas')
export class Cubeta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    codigo: string;

    @Column()
    descripcion: string;

    @Column()
    dentro_fuera: string; // 'DENTRO' | 'FUERA'

    @Column({ default: 'activo' })
    estado: string; // 'activo' | 'inactivo'

    @Column({ nullable: true })
    clinicaId: number;
}
