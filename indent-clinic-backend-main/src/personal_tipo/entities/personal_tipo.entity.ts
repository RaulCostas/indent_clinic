import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('personal_tipo')
export class PersonalTipo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255, unique: true })
    area: string;

    @Column({ length: 20, default: 'activo' })
    estado: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updated_at: Date;
}
