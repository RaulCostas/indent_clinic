import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Receta } from './receta.entity';

@Entity('receta_detalle')
export class RecetaDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'receta_id' })
    recetaId: number;

    @Column({ type: 'text' })
    medicamento: string;

    @Column({ type: 'text' })
    cantidad: string;

    @Column({ type: 'text' })
    indicacion: string;

    @ManyToOne(() => Receta, receta => receta.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'receta_id' })
    receta: Receta;
}
