import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('clinicas')
export class Clinica {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 150 })
    nombre: string;

    @Column({ length: 150, unique: true, nullable: true })
    slug: string;

    @Column({ type: 'text', nullable: true })
    direccion: string;

    @Column({ length: 50, nullable: true })
    telefono: string;

    @Column({ length: 10, nullable: true })
    codigoPaisCelular: string;

    @Column({ length: 50, nullable: true })
    celular: string;

    @Column({ default: true })
    activo: boolean;

    @Column({ length: 10, default: 'Bs.' })
    monedaDefault: string;

    @Column({ type: 'text', nullable: true })
    logo: string;
    @Column({ type: 'text', nullable: true })
    horario_atencion: string;
    
    @Column({ type: 'date', nullable: true })
    fecha_cierre_caja: string;

    @Column({ type: 'text', nullable: true })
    qr_pago: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
