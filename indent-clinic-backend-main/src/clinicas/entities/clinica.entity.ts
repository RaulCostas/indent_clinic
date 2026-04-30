import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Sucursal } from './sucursal.entity';

@Entity('clinicas')
export class Clinica {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 150 })
    nombre: string;

    @Column({ length: 150, unique: true, nullable: true })
    slug: string;

    @Column({ default: true })
    activo: boolean;

    @Column({ length: 10, default: 'Bs.' })
    monedaDefault: string;

    @Column({ type: 'text', nullable: true })
    logo: string;
    
    @Column({ type: 'date', nullable: true })
    fecha_cierre_caja: string;

    @Column({ type: 'text', nullable: true })
    qr_pago: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Sucursal, (sucursal) => sucursal.clinica)
    sucursales: Sucursal[];

    @UpdateDateColumn()
    updatedAt: Date;
}
