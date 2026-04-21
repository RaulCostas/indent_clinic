import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Inventario } from '../../inventario/entities/inventario.entity';

@Entity('especialidad')
export class Especialidad {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    especialidad: string;

    @Column({ default: 'activo' })
    estado: string;

    @OneToMany(() => Inventario, (inventario) => inventario.especialidad)
    inventarios: Inventario[];
}
