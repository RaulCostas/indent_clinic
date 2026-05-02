import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Pago } from './entities/pago.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { FormaPago } from '../forma_pago/entities/forma_pago.entity';
import { CreatePagoDto } from './dto/create-pago.dto';
import { UpdatePagoDto } from './dto/update-pago.dto';
import { TransferSaldoDto } from './dto/transfer-saldo.dto';
import { HistoriaClinicaService } from '../historia_clinica/historia_clinica.service';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';
import { getBoliviaDate } from '../common/utils/date.utils';
import { Clinica } from '../clinicas/entities/clinica.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PagosService {
    constructor(
        @InjectRepository(Pago)
        private readonly pagoRepository: Repository<Pago>,
        private readonly dataSource: DataSource,
        private readonly historiaClinicaService: HistoriaClinicaService,
    ) { }

    async create(createDto: CreatePagoDto): Promise<any> {
        console.log(`[PAGOS_AUDIT] Recibida solicitud de creación. Payload:`, JSON.stringify(createDto, null, 2));
        try {
            // Recuperar el clinicaId de forma robusta
            let finalClinicaId = createDto.clinicaId;
            if (!finalClinicaId) {
                if (createDto.proformaId) {
                    const prof = await this.dataSource.getRepository(Proforma).findOne({ where: { id: createDto.proformaId } });
                    if (prof?.clinicaId) finalClinicaId = prof.clinicaId;
                } else if (createDto.pacienteId) {
                    const pac = await this.dataSource.getRepository(Paciente).findOne({ where: { id: createDto.pacienteId } });
                    if (pac?.clinicaId) finalClinicaId = pac.clinicaId;
                }
            }

            // Map idUsuario to usuarioId if needed (backward compatibility)
            if (createDto.idUsuario && !createDto.usuarioId) {
                createDto.usuarioId = createDto.idUsuario;
            }

            const results: Pago[] = [];

            // Case 1: Bulk assignments from frontend
            if (createDto.assignments && createDto.assignments.length > 0) {
                for (const asgn of createDto.assignments) {
                    const hcId = Number(asgn.historiaClinicaId);
                    const pago = this.pagoRepository.create({
                        ...createDto,
                        monto: Number(asgn.monto),
                        descuento: Number(asgn.descuento || 0),
                        historiaClinicaId: hcId,
                        fecha: createDto.fecha || getBoliviaDate().split('T')[0],
                        clinicaId: finalClinicaId,
                    });
                    if (createDto.formaPagoId) pago.formaPagoRel = { id: createDto.formaPagoId } as any;
                    if (createDto.comisionTarjetaId) pago.comisionTarjeta = { id: createDto.comisionTarjetaId } as any;
                    
                    const saved = await this.pagoRepository.save(pago);
                    results.push(saved);

                    // Sync Treatment Status
                    if (hcId) {
                        await this.historiaClinicaService.syncTreatmentStatus(hcId);
                    }
                }
            } 
            // Case 2: Single treatment payment 
            else {
                const hcId = createDto.historiaClinicaId ? Number(createDto.historiaClinicaId) : null;
                const pago = this.pagoRepository.create({
                    ...createDto,
                    monto: Number(createDto.monto),
                    descuento: Number(createDto.descuento || 0),
                    historiaClinicaId: hcId as any,
                    fecha: createDto.fecha || getBoliviaDate().split('T')[0],
                    clinicaId: finalClinicaId,
                });
                if (createDto.formaPagoId) pago.formaPagoRel = { id: createDto.formaPagoId } as any;
                if (createDto.comisionTarjetaId) pago.comisionTarjeta = { id: createDto.comisionTarjetaId } as any;

                const saved = await this.pagoRepository.save(pago);
                results.push(saved);

            }

            // REBALANCEO GLOBAL: Si el pago está asociado a una proforma, rebalancear todos sus tratamientos
            if (createDto.proformaId) {
                await this.historiaClinicaService.rebalanceProformaStatus(Number(createDto.proformaId));
            }

            console.log(`[PAGOS_AUDIT] FINALIZADO creación de ${results.length} pagos.`);
            return results.length === 1 ? results[0] : results;
        } catch (error) {
            console.error('[PAGOS_FATAL] Error crítico en creación:', error);
            throw error;
        }
    }

    async findAll(fecha?: string, startDate?: string, endDate?: string, clinicaId?: number): Promise<Pago[]> {
        const qb = this.pagoRepository.createQueryBuilder('pago')
            .leftJoinAndSelect('pago.paciente', 'paciente')
            .leftJoinAndSelect('pago.proforma', 'proforma')
            .leftJoinAndSelect('proforma.historiaClinica', 'historiaClinica')
            .leftJoinAndSelect('proforma.pagos', 'proformaPagos')
            .leftJoinAndSelect('pago.comisionTarjeta', 'comisionTarjeta')
            .leftJoinAndSelect('pago.formaPagoRel', 'formaPagoRel')
            .orderBy('pago.fecha', 'DESC');

        if (startDate && endDate) {
            qb.andWhere('pago.fecha BETWEEN :start AND :end', {
                start: `${startDate} 00:00:00`,
                end: `${endDate} 23:59:59`
            });
        } else if (fecha) {
            qb.andWhere('pago.fecha BETWEEN :start AND :end', {
                start: `${fecha} 00:00:00`,
                end: `${fecha} 23:59:59`
            });
        }

        if (clinicaId) {
            qb.andWhere('proforma.clinicaId = :clinicaId', { clinicaId });
        }

        return await qb.getMany();

    }

    async findAllByPaciente(pacienteId: number): Promise<Pago[]> {
        return await this.pagoRepository.find({
            where: { pacienteId },
            relations: ['paciente', 'proforma', 'comisionTarjeta', 'formaPagoRel'],
            order: { fecha: 'DESC' }
        });
    }

    async findOne(id: number): Promise<Pago> {
        const pago = await this.pagoRepository.findOne({
            where: { id },
            relations: ['paciente', 'proforma', 'comisionTarjeta', 'formaPagoRel']
        });
        if (!pago) {
            throw new NotFoundException(`Pago #${id} not found`);
        }
        return pago;
    }

    async update(id: number, updateDto: UpdatePagoDto): Promise<Pago> {
        const pago = await this.findOne(id);
        
        // Cierre de Caja Check
        if (pago.clinicaId) {
            const clinica = await this.dataSource.getRepository(Clinica).findOne({ where: { id: pago.clinicaId } });
            
            // Si el usuario tiene el permiso de cerrar caja (no tiene la restricción), puede hacer bypass
            let canBypass = false;
            if (updateDto.idUsuario) {
                const user = await this.dataSource.getRepository(User).findOne({ where: { id: updateDto.idUsuario } });
                if (user && Array.isArray(user.permisos) && !user.permisos.includes('cerrar-caja')) {
                    canBypass = true;
                }
            }

            if (!canBypass && clinica?.fecha_cierre_caja && pago.fecha <= clinica.fecha_cierre_caja) {
                throw new BadRequestException(`No se puede modificar este pago porque la caja para la fecha ${pago.fecha} ya está cerrada.`);
            }
        }

        this.pagoRepository.merge(pago, updateDto);
        if (updateDto.formaPagoId) {
            pago.formaPagoRel = { id: updateDto.formaPagoId } as any;
        }
        if (updateDto.comisionTarjetaId) {
            pago.comisionTarjeta = { id: updateDto.comisionTarjetaId } as any;
        }
        
        const savedPago = await this.pagoRepository.save(pago);
        
        // Rebalancear si hay proforma
        const pfId = savedPago.proformaId || (savedPago.proforma ? savedPago.proforma.id : null);
        if (pfId) {
            await this.historiaClinicaService.rebalanceProformaStatus(Number(pfId));
        }

        return savedPago;
    }

    async remove(id: number, idUsuario?: number): Promise<void> {
        console.log(`[PAGOS_AUDIT] Eliminando pago #${id}`);
        const pago = await this.pagoRepository.findOne({ where: { id } });
        if (!pago) return;

        // Cierre de Caja Check
        if (pago.clinicaId) {
            const clinica = await this.dataSource.getRepository(Clinica).findOne({ where: { id: pago.clinicaId } });
            
            let canBypass = false;
            if (idUsuario) {
                const user = await this.dataSource.getRepository(User).findOne({ where: { id: idUsuario } });
                if (user && Array.isArray(user.permisos) && !user.permisos.includes('cerrar-caja')) {
                    canBypass = true;
                }
            }

            if (!canBypass && clinica?.fecha_cierre_caja && pago.fecha <= clinica.fecha_cierre_caja) {
                throw new BadRequestException(`No se puede eliminar este pago porque la caja para la fecha ${pago.fecha} ya está cerrada.`);
            }
        }


        const pfId = pago.proformaId;
        
        await this.pagoRepository.delete(id);

        // Rebalancear después de eliminar para que los tratamientos vuelvan a estar pendientes si falta dinero
        if (pfId) {
            await this.historiaClinicaService.rebalanceProformaStatus(Number(pfId));
        }
    }

    async transferirSaldo(transferDto: TransferSaldoDto): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Fetch related entities to construct the observation string
            // Better to fetch Paciente directly using entity name string to avoid circular dependency if not imported?
            // Or just use the table name or import the entity. I will import entities at the top.
            // Let's assume standard import is better. 
            // Actually, I can use queryRunner.manager.findOne(Paciente, ...) if I add the import.

            // Re-fetching robustly:
            const PacienteRepo = queryRunner.manager.getRepository(Paciente);
            const ProformaRepo = queryRunner.manager.getRepository(Proforma);
            const FormaPagoRepo = queryRunner.manager.getRepository(FormaPago);

            // Fetch 'Efectivo' payment method
            let efectivo = await FormaPagoRepo.findOne({ where: { forma_pago: 'Efectivo' } });
            // Fallback to searching case insensitive or just ID 1
            if (!efectivo) {
                // Try loose search or ID 1
                const all = await FormaPagoRepo.find();
                efectivo = all.find(fp => fp.forma_pago.toLowerCase().includes('efectivo')) || await FormaPagoRepo.findOne({ where: { id: 1 } });
            }

            if (!efectivo) {
                throw new NotFoundException('No se encontró la forma de pago "Efectivo" para realizar la transferencia automática.');
            }

            const sourceP = await PacienteRepo.findOne({ where: { id: transferDto.sourcePacienteId } });
            const targetP = await PacienteRepo.findOne({ where: { id: transferDto.targetPacienteId } });

            if (!sourceP || !targetP) {
                throw new NotFoundException('Pacientes no encontrados para la transferencia');
            }

            let sourceProfNum = 'GENERAL';
            if (transferDto.sourceProformaId) {
                const sp = await ProformaRepo.findOne({ where: { id: transferDto.sourceProformaId } });
                if (sp) sourceProfNum = sp.numero.toString();
            }

            let targetProfNum = 'GENERAL';
            if (transferDto.targetProformaId) {
                const tp = await ProformaRepo.findOne({ where: { id: transferDto.targetProformaId } });
                if (tp) targetProfNum = tp.numero.toString();
            }

            const sourceName = `${sourceP.nombre} ${sourceP.paterno}`;
            const targetName = `${targetP.nombre} ${targetP.paterno}`;

            // 1. Outgoing Payment (Source)
            // "TRAS. DE SALDO DEL PACIENTE: X, DEL PRES. # XX AL PACIENTE: Y AL PRES. # YY"
            const obsSource = `TRAS. DE SALDO DEL PACIENTE: ${sourceName}, DEL PRES. # ${sourceProfNum} AL PACIENTE: ${targetName} AL PRES. # ${targetProfNum}`;

            const outgoingPago = new Pago();
            outgoingPago.pacienteId = transferDto.sourcePacienteId;
            outgoingPago.proformaId = (transferDto.sourceProformaId || null) as any;
            outgoingPago.monto = -Math.abs(transferDto.amount); // Negative
            outgoingPago.moneda = 'Bolivianos';
            outgoingPago.tc = 0; // "vacios" - typically 0 or null for numbers? User said "vacios", but TS expects number. 0 is safer.
            outgoingPago.recibo = '';
            outgoingPago.factura = '';
            outgoingPago.formaPagoRel = efectivo; // EFECTIVO
            outgoingPago.observaciones = obsSource.toUpperCase();
            outgoingPago.fecha = getBoliviaDate();

            // 2. Incoming Payment (Target)
            // "TRAS. DE SALDO DEL PACIENTE: Y, DEL PRES. # YY AL PACIENTE: X AL PRES. # XX"
            const obsTarget = `TRAS. DE SALDO DEL PACIENTE: ${targetName}, DEL PRES. # ${targetProfNum} AL PACIENTE: ${sourceName} AL PRES. # ${sourceProfNum}`;

            const incomingPago = new Pago();
            incomingPago.pacienteId = transferDto.targetPacienteId;
            incomingPago.proformaId = (transferDto.targetProformaId || null) as any;
            incomingPago.monto = Math.abs(transferDto.amount); // Positive
            incomingPago.moneda = 'Bolivianos';
            incomingPago.tc = 0;
            incomingPago.recibo = '';
            incomingPago.factura = '';
            incomingPago.formaPagoRel = efectivo; // EFECTIVO
            incomingPago.observaciones = obsTarget.toUpperCase();
            incomingPago.fecha = getBoliviaDate();

            await queryRunner.manager.save(outgoingPago);
            await queryRunner.manager.save(incomingPago);

            await queryRunner.commitTransaction();
        } catch (err) {
            console.error("Error en Transacción de Transferencia:", err);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
