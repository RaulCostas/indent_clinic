import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Especialidad } from 'src/especialidad/entities/especialidad.entity';
import { GrupoInventario } from 'src/grupo_inventario/entities/grupo_inventario.entity';
import { EgresoInventario } from 'src/egreso_inventario/entities/egreso_inventario.entity';
import { PedidosDetalle } from 'src/pedidos/entities/pedidos-detalle.entity';
import { Clinica } from 'src/clinicas/entities/clinica.entity';

@Entity('inventario')
export class Inventario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    descripcion: string;

    @Column('int')
    cantidad_existente: number;

    @Column('int')
    stock_minimo: number;

    @Column({ default: 'Activo' })
    estado: string; // 'Activo' | 'Inactivo'

    @ManyToOne(() => Especialidad, (especialidad) => especialidad.inventarios)
    @JoinColumn({ name: 'idespecialidad' })
    especialidad: Especialidad;

    @Column({ nullable: true })
    idespecialidad: number;

    @ManyToOne(() => GrupoInventario, (grupo) => grupo.inventarios)
    @JoinColumn({ name: 'idgrupo_inventario' })
    grupoInventario: GrupoInventario;

    @Column({ nullable: true })
    idgrupo_inventario: number;

    @OneToMany(() => EgresoInventario, (egreso) => egreso.inventario)
    egresosInventario: EgresoInventario[];

    @OneToMany(() => PedidosDetalle, (detalle) => detalle.inventario)
    pedidosDetalle: PedidosDetalle[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column({ nullable: true })
    clinicaId: number;
}
