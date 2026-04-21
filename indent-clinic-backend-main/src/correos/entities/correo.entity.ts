import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('correos')
export class Correo {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'remitente_id' })
    remitente: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'destinatario_id' })
    destinatario: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'copia_id' })
    copia: User;

    @Column()
    asunto: string;

    @Column('text')
    mensaje: string;

    @CreateDateColumn()
    fecha_envio: Date;

    @Column({ default: false })
    leido_destinatario: boolean;

    @Column({ default: false })
    leido_copia: boolean;
}
