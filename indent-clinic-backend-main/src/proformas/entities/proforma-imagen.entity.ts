import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Proforma } from './proforma.entity';

@Entity('proformas_imagenes')
export class ProformaImagen {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    proformaId: number;

    @ManyToOne(() => Proforma, (proforma) => proforma.imagenes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column()
    nombre_archivo: string;

    @Column()
    ruta: string;

    @Column({ nullable: true })
    descripcion: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fecha_creacion: Date;
}
