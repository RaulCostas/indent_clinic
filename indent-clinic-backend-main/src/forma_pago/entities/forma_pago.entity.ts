import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('forma_pago')
export class FormaPago {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    forma_pago: string;

    @Column({ default: 'activo' })
    estado: string;
}
