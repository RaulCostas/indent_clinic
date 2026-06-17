import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ChatbotAction {
    MENU_PRINCIPAL = 'MENU_PRINCIPAL',
    TEXTO_LIBRE = 'TEXTO_LIBRE',
    CONSULTAR_CITA = 'CONSULTAR_CITA',
    CONSULTAR_CITA_HOY = 'CONSULTAR_CITA_HOY',
    CONSULTAR_INVENTARIO = 'CONSULTAR_INVENTARIO',
    CONSULTAR_SALDO = 'CONSULTAR_SALDO',
    CONSULTAR_PRESUPUESTO = 'CONSULTAR_PRESUPUESTO',
    CONSULTAR_DIRECCION = 'CONSULTAR_DIRECCION',
    CONSULTAR_HORARIO = 'CONSULTAR_HORARIO',
}

@Entity('chatbot_intentos')
export class ChatbotIntento {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    keywords: string; // Comma separated, e.g., "saldo,cuenta,debo"

    @Column({
        type: 'enum',
        enum: ChatbotAction,
        default: ChatbotAction.TEXTO_LIBRE
    })
    action: ChatbotAction;

    @Column({
        type: 'enum',
        enum: ['PACIENTE', 'USUARIO'],
        default: 'PACIENTE'
    })
    target: 'PACIENTE' | 'USUARIO';

    @Column('text', { nullable: true })
    replyTemplate: string; // Used for TEXTO_LIBRE

    @Column({ default: true })
    active: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
