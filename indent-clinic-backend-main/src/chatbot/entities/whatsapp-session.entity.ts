import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('whatsapp_sessions')
@Index(['clinicId', 'instanceNumber', 'type', 'keyId'], { unique: true })
export class WhatsappSession {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @Index()
    clinicId: number;

    @Column()
    @Index()
    type: string; // 'creds' or 'keys'

    @Column({ nullable: true })
    @Index()
    keyId: string; // Used for pre-keys, sessions, etc.

    @Column({ default: 1 })
    @Index()
    instanceNumber: number;

    @Column({ type: 'json' }) // Use 'json' for better compatibility with TypeORM and PG
    data: any;
}
