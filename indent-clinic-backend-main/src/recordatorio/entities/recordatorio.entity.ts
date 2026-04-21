import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('recordatorio')
export class Recordatorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: ['personal', 'consultorio'] })
    tipo: string;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'time' })
    hora: string;

    @Column({ type: 'text' })
    mensaje: string;

    @Column({ type: 'enum', enum: ['Mensual', 'Anual', 'Solo una vez'] })
    repetir: string;

    @Column({ type: 'enum', enum: ['activo', 'inactivo'], default: 'activo' })
    estado: 'activo' | 'inactivo';

    @Column({ name: 'usuario_id', nullable: true })
    usuarioId: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
