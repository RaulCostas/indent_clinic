import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('contacto')
export class Contacto {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    contacto: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    celular: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    telefono: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string;

    @Column({ type: 'text', nullable: true })
    direccion: string;

    @Column({ type: 'enum', enum: ['activo', 'inactivo'], default: 'activo' })
    estado: 'activo' | 'inactivo';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
