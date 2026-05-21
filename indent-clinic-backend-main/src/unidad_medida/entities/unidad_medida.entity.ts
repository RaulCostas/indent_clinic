import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Inventario } from 'src/inventario/entities/inventario.entity';

@Entity('unidad_medida')
export class UnidadMedida {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    nombre: string;

    @Column({ default: 'Activo' })
    estado: string; // 'Activo' | 'Inactivo'

    @OneToMany(() => Inventario, (inventario) => inventario.unidadMedida)
    inventarios: Inventario[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
