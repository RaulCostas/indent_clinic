import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { User } from '../../users/entities/user.entity';
import { PropuestaDetalle } from './propuesta-detalle.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('propuestas')
export class Propuesta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column()
    numero: number;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ type: 'text', nullable: true })
    nota: string;



    @Column()
    usuarioId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;

    @OneToMany(() => PropuestaDetalle, (detalle) => detalle.propuesta, { cascade: true })
    detalles: PropuestaDetalle[];
}
