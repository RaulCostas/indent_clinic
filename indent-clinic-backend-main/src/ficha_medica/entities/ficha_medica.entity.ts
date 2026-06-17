import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ficha_medica')
export class FichaMedica {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text', nullable: true })
    ultima_visita_odontologo: string;

    @Column({ type: 'text', nullable: true })
    motivo_consulta: string;

    // --- Antecedentes patológicos personales ---
    @Column({ default: false })
    bruxismo: boolean;

    @Column({ default: false })
    alergia_medicamento: boolean;

    @Column({ nullable: true })
    alergia_medicamento_detalle: string;

    @Column({ default: false })
    medicamento_72h: boolean;

    @Column({ nullable: true })
    medicamento_72h_detalle: string;

    @Column({ default: false })
    tratamiento_medico: boolean;

    @Column({ nullable: true })
    tratamiento_medico_detalle: string;

    @Column({ default: false })
    anestesiado_anteriormente: boolean;

    @Column({ default: false })
    reaccion_anestesia: boolean;

    @Column({ nullable: true })
    reaccion_anestesia_detalle: string;

    // --- Enfermedades ---
    @Column({ default: false })
    enf_neurologicas: boolean;

    @Column({ nullable: true })
    enf_neurologicas_detalle: string;

    @Column({ default: false })
    enf_pulmonares: boolean;

    @Column({ nullable: true })
    enf_pulmonares_detalle: string;

    @Column({ default: false })
    enf_cardiacas: boolean;

    @Column({ nullable: true })
    enf_cardiacas_detalle: string;

    @Column({ default: false })
    enf_higado: boolean;

    @Column({ nullable: true })
    enf_higado_detalle: string;

    @Column({ default: false })
    enf_gastricas: boolean;

    @Column({ nullable: true })
    enf_gastricas_detalle: string;

    @Column({ default: false })
    enf_venereas: boolean;

    @Column({ nullable: true })
    enf_venereas_detalle: string;

    @Column({ default: false })
    enf_renales: boolean;

    @Column({ nullable: true })
    enf_renales_detalle: string;

    @Column({ default: false })
    articulaciones: boolean;

    @Column({ nullable: true })
    articulaciones_detalle: string;

    @Column({ default: false })
    diabetes: boolean;

    @Column({ nullable: true })
    diabetes_detalle: string;

    @Column({ default: false })
    hipertension: boolean;

    @Column({ default: false })
    hipotension: boolean;

    @Column({ default: false })
    anemia: boolean;

    @Column({ nullable: true })
    anemia_detalle: string;

    @Column({ default: false })
    prueba_vih: boolean;

    @Column({ nullable: true })
    prueba_vih_resultado: string; // 'Positivo' | 'Negativo' | null

    // --- Antecedentes Ginecológicos ---
    @Column({ default: false })
    anticonceptivo_hormonal: boolean;

    @Column({ nullable: true })
    anticonceptivo_hormonal_detalle: string;

    @Column({ default: false })
    posibilidad_embarazo: boolean;

    @Column({ nullable: true })
    semana_gestacion: string;

    // --- Hábitos ---
    @Column({ nullable: true })
    cepillado_veces: string;

    @Column({ default: false })
    usa_hilo_dental: boolean;

    @Column({ default: false })
    usa_enjuague: boolean;

    @Column({ default: false })
    fuma: boolean;

    @Column({ nullable: true })
    fuma_cantidad: string;

    @Column({ default: false })
    consume_citricos: boolean;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @OneToOne(() => Paciente, (paciente) => paciente.fichaMedica)
    paciente: Paciente;

    @Column({ nullable: true })
    usuarioId: number;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'usuarioId' })
    usuario: User;
}
