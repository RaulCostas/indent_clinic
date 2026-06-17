import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { PagoLaboratorio } from './entities/pago-laboratorio.entity';
import { CreatePagoLaboratorioDto } from './dto/create-pago-laboratorio.dto';
import { UpdatePagoLaboratorioDto } from './dto/update-pago-laboratorio.dto';
import { TrabajoLaboratorio } from '../trabajos_laboratorios/entities/trabajo_laboratorio.entity';

@Injectable()
export class PagosLaboratoriosService {
    constructor(
        @InjectRepository(PagoLaboratorio)
        private pagoLaboratorioRepository: Repository<PagoLaboratorio>,
        private dataSource: DataSource,
    ) { }

    async create(createDto: CreatePagoLaboratorioDto) {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { fecha, idTrabajos_Laboratorios, idforma_pago, ...rest } = createDto;

            const pagoData = {
                ...rest,
                fecha: new Date(fecha + 'T12:00:00'),
                trabajoLaboratorio: { id: idTrabajos_Laboratorios },
                formaPago: { id: idforma_pago }
            };

            // Save Payment
            const pago = queryRunner.manager.create(PagoLaboratorio, pagoData as any);
            const savedPago = await queryRunner.manager.save(pago);

            // Update Work Status
            await queryRunner.manager.update(TrabajoLaboratorio, idTrabajos_Laboratorios, {
                pagado: 'si'
            });

            await queryRunner.commitTransaction();
            return savedPago;
        } catch (err: any) {
            console.error('[PagosLaboratoriosService] Error:', err.message, err.detail);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /*
     * Note: For removal, we should probably revert the 'pagado' status to 'no',
     * but the prompt didn't explicitly ask for full reversal logic. I'll add a simple delete for now,
     * or better yet, a robust check. Let's stick to simple delete but ideally we'd set pagado='no'.
     * I'll implement the revert logic for robustness.
     */
    async remove(id: number) {
        const queryRunner = this.dataSource.createQueryRunner();

        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const pago = await queryRunner.manager.findOne(PagoLaboratorio, { where: { id } });
            if (pago) {
                // Revert Work Status
                await queryRunner.manager.update(TrabajoLaboratorio, pago.idTrabajos_Laboratorios, {
                    pagado: 'no'
                });
                // Delete Payment
                await queryRunner.manager.remove(pago);
            }
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(fecha?: string, startDate?: string, endDate?: string, clinicaId?: number) {
        const queryBuilder = this.pagoLaboratorioRepository.createQueryBuilder('pago')
            .leftJoinAndSelect('pago.trabajoLaboratorio', 'trabajoLaboratorio')
            .leftJoinAndSelect('trabajoLaboratorio.paciente', 'paciente')
            .leftJoinAndSelect('trabajoLaboratorio.laboratorio', 'laboratorio')
            .leftJoinAndSelect('trabajoLaboratorio.precioLaboratorio', 'precioLaboratorio')
            .leftJoinAndSelect('pago.formaPago', 'formaPago');

        if (startDate && endDate) {
            queryBuilder.orderBy('pago.fecha', 'ASC');
        }
        
        queryBuilder.addOrderBy('laboratorio.laboratorio', 'ASC');

        if (clinicaId) {
            queryBuilder.andWhere('pago.clinicaId = :clinicaId', { clinicaId });
        }

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

        return await queryBuilder.getMany();
    }

    findOne(id: number) {
        return this.pagoLaboratorioRepository.findOne({
            where: { id },
            relations: ['trabajoLaboratorio', 'formaPago']
        });
    }

    update(id: number, updateDto: UpdatePagoLaboratorioDto) {
        // If changing strict fields like ID, this gets complex. Assuming simple updates for now.
        return this.pagoLaboratorioRepository.update(id, updateDto);
    }
}
