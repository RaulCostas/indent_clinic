import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Laboratorio } from '../../laboratorios/entities/laboratorio.entity';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { PrecioLaboratorio } from '../../precios_laboratorios/entities/precio-laboratorio.entity';
import { Cubeta } from '../../cubetas/entities/cubeta.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';

@Entity('trabajos_laboratorios')
export class TrabajoLaboratorio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    idLaboratorio: number;

    @ManyToOne(() => Laboratorio)
    @JoinColumn({ name: 'idLaboratorio' })
    laboratorio: Laboratorio;

    @Column()
    idPaciente: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'idPaciente' })
    paciente: Paciente;

    @Column({ nullable: true })
    idHistoriaClinica: number;

    @ManyToOne(() => HistoriaClinica)
    @JoinColumn({ name: 'idHistoriaClinica' })
    historiaClinica: HistoriaClinica;

    @Column()
    idprecios_laboratorios: number;

    @ManyToOne(() => PrecioLaboratorio)
    @JoinColumn({ name: 'idprecios_laboratorios' })
    precioLaboratorio: PrecioLaboratorio;

    @Column({ type: 'date' })
    fecha: string;

    @Column()
    pieza: string;

    @Column()
    cantidad: number;

    @Column({ type: 'date' })
    fecha_pedido: string;

    @Column()
    color: string;

    @Column({ default: 'no terminado' })
    estado: string;

    @Column({ type: 'date', nullable: true })
    fecha_terminado: string;

    @Column({ default: 'no' })
    cita: string;

    @Column('text')
    observacion: string;

    @Column({ default: 'no' })
    pagado: string;

    @Column('decimal', { precision: 10, scale: 2 })
    precio_unitario: number;

    @Column('decimal', { precision: 10, scale: 2 })
    total: number;

    @Column({ default: 'no' })
    resaltar: string;

    @Column({ nullable: true })
    idCubeta: number;

    @ManyToOne(() => Cubeta, { nullable: true })
    @JoinColumn({ name: 'idCubeta' })
    cubeta: Cubeta;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @Column({ nullable: true })
    idDoctor: number;

    @ManyToOne(() => Doctor, { nullable: true })
    @JoinColumn({ name: 'idDoctor' })
    doctor: Doctor;
}
