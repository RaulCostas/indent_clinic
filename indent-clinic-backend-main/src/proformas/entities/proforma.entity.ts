import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { User } from '../../users/entities/user.entity';
import { ProformaDetalle } from './proforma-detalle.entity';
import { ProformaImagen } from './proforma-imagen.entity';
import { Pago } from '../../pagos/entities/pago.entity';
import { RecordatorioPlan } from '../../recordatorio_plan/entities/recordatorio-plan.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';
// import { SecuenciaTratamiento } from '../../secuencia_tratamiento/entities/secuencia_tratamiento.entity';

@Entity('proformas')
export class Proforma {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    pacienteId: number;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'pacienteId' })
    paciente: Paciente;

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

    @OneToMany(() => ProformaDetalle, (detalle) => detalle.proforma, { cascade: true })
    detalles: ProformaDetalle[];

    @OneToMany(() => ProformaImagen, (imagen) => imagen.proforma, { cascade: true })
    imagenes: ProformaImagen[];

    @OneToMany(() => Pago, (pago) => pago.proforma)
    pagos: Pago[];

    @OneToMany(() => RecordatorioPlan, (recordatorio) => recordatorio.proforma)
    recordatorios: RecordatorioPlan[];

    @OneToMany(() => HistoriaClinica, (h) => h.proforma)
    historiaClinica: HistoriaClinica[];

    // @OneToOne(() => SecuenciaTratamiento, (secuencia) => secuencia.proforma)
    // secuenciaTratamiento: SecuenciaTratamiento;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'int', nullable: true })
    clinicaId: number | null;

    @ManyToOne(() => Clinica, { nullable: true, eager: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;

    @UpdateDateColumn()
    updatedAt: Date;
}

