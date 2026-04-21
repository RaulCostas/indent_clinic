import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Proforma } from './proforma.entity';
import { Arancel } from '../../arancel/entities/arancel.entity';

@Entity('proforma_detalle')
export class ProformaDetalle {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    proformaId: number;

    @ManyToOne(() => Proforma, (proforma) => proforma.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'proformaId' })
    proforma: Proforma;

    @Column()
    arancelId: number;

    @ManyToOne(() => Arancel)
    @JoinColumn({ name: 'arancelId' })
    arancel: Arancel;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    precioUnitario: number;

    @Column({ nullable: true })
    piezas: string;

    @Column()
    cantidad: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    total: number;

    @Column({ default: false })
    posible: boolean;

    @Column({ type: 'varchar', length: 20, default: 'normal' })
    tipoPrecio: string;
}
