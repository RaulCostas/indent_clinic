import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Personal } from '../../personal/entities/personal.entity';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { User } from '../../users/entities/user.entity';

@Entity('calificacion')
export class Calificacion {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    personalId: number;

    @ManyToOne(() => Personal)
    @JoinColumn({ name: 'personalId' })
    personal: Personal;

    @Column()
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column()
    consultorio: number;

    @Column()
    calificacion: string; // 'Malo', 'Regular', 'Bueno'

    @Column({ type: 'date' })
    fecha: Date;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column()
    evaluadorId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'evaluadorId' })
    evaluador: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
