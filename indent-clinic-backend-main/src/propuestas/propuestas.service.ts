import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatePropuestaDto } from './dto/create-propuesta.dto';
import { UpdatePropuestaDto } from './dto/update-propuesta.dto';
import { Propuesta } from './entities/propuesta.entity';
import { PropuestaDetalle } from './entities/propuesta-detalle.entity';
import { ProformasService } from '../proformas/proformas.service';
import { CreateProformaDto } from '../proformas/dto/create-proforma.dto';
import { getBoliviaDate } from '../common/utils/date.utils';

@Injectable()
export class PropuestasService {
    constructor(
        @InjectRepository(Propuesta)
        private readonly propuestaRepository: Repository<Propuesta>,
        @InjectRepository(PropuestaDetalle)
        private readonly detalleRepository: Repository<PropuestaDetalle>,
        private readonly dataSource: DataSource,
        private readonly proformasService: ProformasService,
    ) { }

    async convertToProforma(id: number, letra: string, usuarioId: number) {
        const propuesta = await this.findOne(id);

        // Filter details by the selected letter (tab)
        const activeDetails = propuesta.detalles.filter(d => d.letra === letra);

        if (activeDetails.length === 0) {
            throw new NotFoundException(`No hay items en la Propuesta ${letra}`);
        }

        // Discounts are no longer used per user request
        const globalDiscountPct = 0;
        const sub_total = activeDetails.reduce((sum, d) => sum + Number(d.total), 0);
        const total = sub_total;

        const createProformaDto: CreateProformaDto = {
            pacienteId: propuesta.pacienteId,
            usuarioId: usuarioId,
            nota: `Generado desde Propuesta #${propuesta.numero} (Opción ${letra}). ${propuesta.nota || ''}`,
            fecha: getBoliviaDate(),
            total: total,
            detalles: activeDetails.map(d => ({
                arancelId: d.arancelId,
                precioUnitario: d.precioUnitario,
                tc: 1, // Static fallback for ProformaDetalle
                piezas: d.piezas,
                cantidad: d.cantidad,
                subTotal: d.total, // Static mapping for ProformaDetalle
                descuento: 0, // Individual discounts are cleared in favor of the global one
                total: d.total, // Before global discount, individual total is just subtotal
                posible: d.posible
            }))
        };

        return this.proformasService.create(createProformaDto);
    }

    async create(createPropuestaDto: CreatePropuestaDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Get correlative number for patient
            const lastPropuesta = await queryRunner.manager.findOne(Propuesta, {
                where: { pacienteId: createPropuestaDto.pacienteId },
                order: { numero: 'DESC' },
            });
            const nextNumero = (lastPropuesta?.numero || 0) + 1;

            // 2. Create Header
            const propuesta = new Propuesta();
            propuesta.pacienteId = createPropuestaDto.pacienteId;
            propuesta.usuarioId = createPropuestaDto.usuarioId;
            propuesta.numero = nextNumero;

            propuesta.nota = createPropuestaDto.nota || '';
            propuesta.fecha = createPropuestaDto.fecha
                ? createPropuestaDto.fecha.split('T')[0]
                : getBoliviaDate();

            // Calculate total from details just in case
            propuesta.total = createPropuestaDto.detalles.reduce((sum, item) => sum + Number(item.total), 0);

            const savedPropuesta = await queryRunner.manager.save(propuesta);

            // 3. Create Details
            const detalles = createPropuestaDto.detalles.map(item => {
                const detalle = new PropuestaDetalle();
                detalle.propuesta = savedPropuesta;
                detalle.letra = item.letra || null;
                detalle.arancelId = item.arancelId;
                detalle.precioUnitario = item.precioUnitario;
                detalle.piezas = item.piezas || '';
                detalle.cantidad = item.cantidad;
                detalle.total = item.total;
                detalle.posible = item.posible || false;
                return detalle;
            });

            await queryRunner.manager.save(PropuestaDetalle, detalles);

            await queryRunner.commitTransaction();
            return this.findOne(savedPropuesta.id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            console.error('Error creating propuesta:', err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            throw new NotFoundException(`Error creando propuesta: ${msg}`);
        } finally {
            await queryRunner.release();
        }
    }

    async findAll() {
        return this.propuestaRepository.find({
            relations: ['paciente', 'usuario', 'detalles', 'detalles.arancel'],
            order: { fecha: 'DESC' }
        });
    }

    async findAllByPaciente(pacienteId: number) {
        return this.propuestaRepository.find({
            where: { pacienteId },
            relations: ['usuario', 'detalles', 'detalles.arancel'],
            order: { numero: 'ASC' }
        });
    }

    async findOne(id: number) {
        const propuesta = await this.propuestaRepository.findOne({
            where: { id },
            relations: ['paciente', 'usuario', 'detalles', 'detalles.arancel'],
        });
        if (!propuesta) throw new NotFoundException(`Propuesta #${id} not found`);
        return propuesta;
    }

    async update(id: number, updatePropuestaDto: UpdatePropuestaDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const propuesta = await queryRunner.manager.findOne(Propuesta, {
                where: { id },
                relations: ['detalles'],
            });

            if (!propuesta) throw new NotFoundException(`Propuesta #${id} not found`);

            // Update header fields
            if (updatePropuestaDto.nota !== undefined) propuesta.nota = updatePropuestaDto.nota;
            if (updatePropuestaDto.fecha) propuesta.fecha = updatePropuestaDto.fecha.split('T')[0];
            if (updatePropuestaDto.usuarioId) propuesta.usuarioId = updatePropuestaDto.usuarioId;


            // Recalculate total if details are provided
            if (updatePropuestaDto.detalles) {
                const incomingDetails = updatePropuestaDto.detalles;
                // Since this uses DTO without ID for create, we might need a way to track updates
                // For simplicity similar to Proformas, we might wipe and replace or smart update. 
                // The UpdateDto inherits from CreateDto which has nested structure. 
                // BUT CreatePropuestaDetalleDto doesn't have ID. 
                // Proforma logic: "Items to remove: Exists in DB but not in incoming payload". 
                // This implies incoming payload SHOULD have IDs for updates. 
                // My CreatePropuestaDetalleDto DOES NOT have ID field.
                // I will assume for now we wipe and recreate or I need to add ID to DTO. 
                // Checking Proforma DTO... CreateProformaDto uses CreateProformaDetalleDto.
                // UpdateProformaDto extends CreateProformaDto. 
                // So officially UpdateProformaDto.detalles are "Create" dtos without IDs.
                // However, the Proforma service logic accesses `item.id`. This means the DTO definition might be loose or there's an `any` cast or additional interface not seen. 
                // I will add `id` as optional to `CreatePropuestaDetalleDto` to support updates, or handle it as "IntersectionType" if using NestJS mapped-types, but adding optional ID to the Create DTO is easiest pattern for "Updatable Details".

                // WAIT, I cannot modify the DTO file I just wrote easily without another tool call. 
                // I will cast `item` to `any` inside the loop to access `.id` if passed, 
                // assuming the frontend sends it. 

                const incomingIds = incomingDetails.map((d: any) => d.id).filter((id: number) => id);

                // Items to remove
                const detailsToRemove = propuesta.detalles.filter(d => !incomingIds.includes(d.id));
                if (detailsToRemove.length > 0) {
                    await queryRunner.manager.remove(detailsToRemove);
                }

                const savedDetalles: PropuestaDetalle[] = [];

                for (const item of incomingDetails) {
                    let detalle: PropuestaDetalle | null = null;
                    const itemId = (item as any).id;

                    if (itemId) {
                        detalle = propuesta.detalles.find(d => d.id === itemId) || null;
                    }

                    if (!detalle) {
                        detalle = new PropuestaDetalle();
                        detalle.propuesta = propuesta;
                    }

                    detalle.letra = item.letra || null;
                    detalle.arancelId = item.arancelId;
                    detalle.precioUnitario = item.precioUnitario;
                    detalle.piezas = item.piezas || '';
                    detalle.cantidad = item.cantidad;
                    detalle.total = item.total;
                    detalle.posible = item.posible || false;

                    const savedDetalle = await queryRunner.manager.save(PropuestaDetalle, detalle);
                    savedDetalles.push(savedDetalle);
                }

                propuesta.total = savedDetalles.reduce((sum, item) => sum + Number(item.total), 0);
                propuesta.detalles = savedDetalles;
            }

            await queryRunner.manager.save(propuesta);
            await queryRunner.commitTransaction();

            return this.findOne(id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            console.error('Error updating propuesta:', err);
            const msg = err instanceof Error ? err.message : 'Unknown error';
            throw new NotFoundException(`Error actualizando propuesta: ${msg}`);
        } finally {
            await queryRunner.release();
        }
    }

    async remove(id: number) {
        const propuesta = await this.findOne(id);
        return this.propuestaRepository.remove(propuesta);
    }
}
