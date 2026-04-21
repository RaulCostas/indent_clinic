import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TrabajoLaboratorio } from '../../trabajos_laboratorios/entities/trabajo_laboratorio.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('seguimiento_trabajo')
export class SeguimientoTrabajo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    envio_retorno: string;

    @Column({ type: 'date' })
    fecha: string;

    @Column('text')
    observaciones: string;

    @Column()
    trabajoLaboratorioId: number;

    @ManyToOne(() => TrabajoLaboratorio)
    @JoinColumn({ name: 'trabajoLaboratorioId' })
    trabajoLaboratorio: TrabajoLaboratorio;

    @Column({ type: 'int', nullable: true })
    clinicaId: number | null;

    @ManyToOne(() => Clinica)
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;
}
