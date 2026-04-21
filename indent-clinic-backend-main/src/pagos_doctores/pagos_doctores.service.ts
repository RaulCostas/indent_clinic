import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { CreatePagosDoctoresDto } from './dto/create-pagos_doctores.dto';
import { UpdatePagosDoctoresDto } from './dto/update-pagos_doctores.dto';
import { PagosDoctores } from './entities/pagos_doctores.entity';
import { PagosDetalleDoctores } from './entities/pagos-detalle-doctores.entity';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Injectable()
export class PagosDoctoresService {
    constructor(
        @InjectRepository(PagosDoctores)
        private readonly pagosRepository: Repository<PagosDoctores>,
        private readonly dataSource: DataSource,
    ) { }

    async create(createDto: CreatePagosDoctoresDto) {
        const { detalles, idDoctor, idForma_pago, fecha, ...headerData } = createDto;

        return this.dataSource.transaction(async manager => {
            try {
                // 1. Create Header
                const pagoData = {
                    ...headerData,
                    fecha: new Date(fecha + 'T12:00:00'),
                    doctor: { id: idDoctor },
                    formaPago: { id: idForma_pago }
                };

                const pago = manager.create(PagosDoctores, pagoData);
                const savedPago = await manager.save(pago);

                if (detalles && detalles.length > 0) {
                    for (const d of detalles) {
                        // 2. Create Detail
                        const detalle = manager.create(PagosDetalleDoctores, {
                            ...d,
                            pago: savedPago,
                            comision: d.comision || 0 // Explicitly setting comision
                        });
                        await manager.save(detalle);

                        // 3. Update HistoriaClinica status
                        await manager.update(HistoriaClinica, d.idhistoria_clinica, {
                            pagado: 'SI'
                        });
                    }
                }
                return savedPago;
            } catch (error: any) {
                console.error('[PagosDoctoresService] CREATE Error:', error.message, error.detail);
                throw error;
            }
        });
    }

    async findAll(page?: number, limit?: number, search?: string, fecha?: string, startDate?: string, endDate?: string, clinicaId?: number) {
        const queryBuilder = this.pagosRepository.createQueryBuilder('pago')
            .leftJoinAndSelect('pago.doctor', 'doctor')
            .leftJoinAndSelect('pago.formaPago', 'formaPago')
            .leftJoinAndSelect('pago.detalles', 'detalles')
            .leftJoinAndSelect('detalles.historiaClinica', 'historiaClinica')
            .leftJoinAndSelect('historiaClinica.paciente', 'paciente')
            .orderBy('pago.fecha', 'DESC');

        // Apply date filters
        if (startDate && endDate) {
            queryBuilder.andWhere('pago.fecha BETWEEN :startDate AND :endDate', {
                startDate: `${startDate} 00:00:00`,
                endDate: `${endDate} 23:59:59`
            });
        } else if (fecha) {
            queryBuilder.andWhere('pago.fecha BETWEEN :startDate AND :endDate', {
                startDate: `${fecha} 00:00:00`,
                endDate: `${fecha} 23:59:59`
            });
        }

        if (clinicaId) {
            queryBuilder.andWhere('pago.clinicaId = :clinicaId', { clinicaId });
        }

        // Apply search filter (search by doctor name)
        if (search) {
            queryBuilder.andWhere(
                '(LOWER(doctor.nombre) LIKE LOWER(:search) OR LOWER(doctor.paterno) LIKE LOWER(:search) OR LOWER(doctor.materno) LIKE LOWER(:search))',
                { search: `%${search}%` }
            );
        }

        // If pagination parameters are provided, return paginated results
        if (page && limit) {
            const skip = (page - 1) * limit;

            const [data, total] = await queryBuilder
                .skip(skip)
                .take(limit)
                .getManyAndCount();

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        }

        // Otherwise, return all results
        return queryBuilder.getMany();
    }

    async findOne(id: number) {
        const pago = await this.pagosRepository.findOne({
            where: { id },
            relations: ['doctor', 'formaPago', 'detalles', 'detalles.historiaClinica', 'detalles.historiaClinica.paciente'] // Added patient relation
        });
        if (!pago) throw new NotFoundException(`Pago #${id} not found`);
        return pago;
    }

    async update(id: number, updateDto: UpdatePagosDoctoresDto) {
        const { detalles, ...headerData } = updateDto;

        return this.dataSource.transaction(async manager => {
            // 1. Get existing payment with details
            const existingPago = await manager.findOne(PagosDoctores, {
                where: { id },
                relations: ['detalles']
            });

            if (!existingPago) {
                throw new NotFoundException(`Pago #${id} not found`);
            }

            // 2. Revert previous effects: Set 'pagado' = 'NO' for all OLD details
            if (existingPago.detalles && existingPago.detalles.length > 0) {
                for (const oldDetail of existingPago.detalles) {
                    await manager.update(HistoriaClinica, oldDetail.idhistoria_clinica, {
                        pagado: 'NO'
                    });
                }
            }

            // 3. Delete old details
            await manager.delete(PagosDetalleDoctores, { pago: { id } });

            // 4. Update Header
            await manager.update(PagosDoctores, id, headerData);
            const savedPago = await manager.findOne(PagosDoctores, { where: { id } });

            if (!savedPago) throw new NotFoundException('Error updating payment header');

            // 5. Create New Details & Update Status
            if (detalles && detalles.length > 0) {
                for (const d of detalles) {
                    // Create Detail
                    const detalle = manager.create(PagosDetalleDoctores, {
                        ...d,
                        pago: savedPago,
                        comision: d.comision || 0
                    });
                    await manager.save(detalle);

                    // Update HistoriaClinica status to 'SI'
                    await manager.update(HistoriaClinica, d.idhistoria_clinica, {
                        pagado: 'SI'
                    });
                }
            }

            return savedPago;
        });
    }

    async remove(id: number) {
        // Also need to revert status on delete!
        const pago = await this.findOne(id);

        return this.dataSource.transaction(async manager => {
            if (pago.detalles && pago.detalles.length > 0) {
                for (const detail of pago.detalles) {
                    await manager.update(HistoriaClinica, detail.idhistoria_clinica, {
                        pagado: 'NO'
                    });
                }
            }
            return await manager.remove(pago);
        });
    }
}
