import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('firmas_digitales')
export class FirmaDigital {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50 })
    tipoDocumento: string; // 'presupuesto' | 'historia_clinica' | 'receta'

    @Column({ type: 'int' })
    documentoId: number;

    @Column({ type: 'varchar', length: 20 })
    tipoFirma: string; // 'dibujada' | 'imagen'

    @Column({ type: 'text' })
    firmaData: string; // Base64 encoded signature image

    @Column({ type: 'int' })
    usuarioId: number;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @Column({ type: 'varchar', length: 50 })
    rolFirmante: string; // 'paciente' | 'doctor' | 'personal' | 'administrador'

    @Column({ type: 'timestamp' })
    timestamp: Date;

    @Column({ type: 'varchar', length: 64, nullable: true })
    hashDocumento: string; // SHA-256 hash of document

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string;

    @Column({ type: 'text', nullable: true })
    userAgent: string;

    @Column({ type: 'boolean', default: false })
    verificado: boolean;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
