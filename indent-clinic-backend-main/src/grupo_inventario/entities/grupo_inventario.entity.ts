import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Inventario } from '../../inventario/entities/inventario.entity';

@Entity('grupo_inventario')
export class GrupoInventario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    grupo: string;

    @Column({ default: 'activo' })
    estado: string; // 'activo' | 'inactivo'

    @OneToMany(() => Inventario, (inventario) => inventario.grupoInventario)
    inventarios: Inventario[];
}
