import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { PersonalTipo } from '../../personal_tipo/entities/personal_tipo.entity';
import { Clinica } from '../../clinicas/entities/clinica.entity';

@Entity('personal')
export class Personal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    paterno: string;

    @Column()
    materno: string;

    @Column()
    nombre: string;

    @Column()
    ci: string;

    @Column()
    direccion: string;

    @Column()
    telefono: string;

    @Column()
    celular: string;

    @Column({ type: 'date' })
    fecha_nacimiento: Date;

    @Column({ type: 'date' })
    fecha_ingreso: Date;

    @Column({ nullable: true })
    personal_tipo_id: number;

    @ManyToOne(() => PersonalTipo, { eager: true })
    @JoinColumn({ name: 'personal_tipo_id' })
    personalTipo: PersonalTipo;

    @Column({ default: 'activo' })
    estado: string;

    @Column({ type: 'date', nullable: true })
    fecha_baja: Date;

    @Column({ nullable: true })
    clinicaId: number;

    @ManyToOne(() => Clinica, { nullable: true })
    @JoinColumn({ name: 'clinicaId' })
    clinica: Clinica;
}
