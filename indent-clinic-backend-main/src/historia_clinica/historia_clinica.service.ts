import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, In, IsNull, DataSource } from 'typeorm';
import { HistoriaClinica } from './entities/historia_clinica.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { Paciente } from '../pacientes/entities/paciente.entity';
import { CreateHistoriaClinicaDto } from './dto/create-historia_clinica.dto';
import { UpdateHistoriaClinicaDto } from './dto/update-historia_clinica.dto';
import { TrabajoLaboratorio } from '../trabajos_laboratorios/entities/trabajo_laboratorio.entity';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';
import { PagosDetalleDoctores } from '../pagos_doctores/entities/pagos-detalle-doctores.entity';

@Injectable()
export class HistoriaClinicaService {
    constructor(
        @InjectRepository(HistoriaClinica)
        private readonly historiaClinicaRepository: Repository<HistoriaClinica>,
        @InjectRepository(Pago)
        private readonly pagoRepository: Repository<Pago>,
        @InjectRepository(TrabajoLaboratorio)
        private readonly trabajoLaboratorioRepository: Repository<TrabajoLaboratorio>,
        @InjectRepository(PagosDetalleDoctores)
        private readonly pagosDetalleDoctoresRepository: Repository<PagosDetalleDoctores>,
        private readonly dataSource: DataSource,
        private readonly storageService: SupabaseStorageService,
    ) { }

    async create(createDto: CreateHistoriaClinicaDto): Promise<HistoriaClinica> {
        if (createDto.firmaPaciente && createDto.firmaPaciente.startsWith('data:image')) {
            try {
                createDto.firmaPaciente = await this.storageService.uploadBase64('clinica-media', `signature-hc-${createDto.pacienteId}-${Date.now()}`, createDto.firmaPaciente);
            } catch (error) {
                console.warn('[HistoriaClinicaService] Supabase upload failed, saving as Base64 in database:', error.message);
            }
        }
        // Recuperar clinicaId de forma robusta si no viene en el DTO
        // Si es parte de una proforma, heredar el estado del presupuesto mas reciente si no viene en el DTO
        if (createDto.proformaId && !createDto.estadoPresupuesto) {
            const latest = await this.historiaClinicaRepository.findOne({
                where: { proformaId: createDto.proformaId },
                order: { id: 'DESC' }
            });
            if (latest) {
                createDto.estadoPresupuesto = latest.estadoPresupuesto;
            }
        }

        // Recuperar clinicaId de forma robusta si no viene en el DTO
        if (!createDto.clinicaId) {
            if (createDto.proformaId) {
                const prof = await this.historiaClinicaRepository.manager.getRepository(Proforma).findOne({ where: { id: createDto.proformaId } });
                if (prof?.clinicaId) createDto.clinicaId = prof.clinicaId;
            } else if (createDto.pacienteId) {
                const pac = await this.historiaClinicaRepository.manager.getRepository(Paciente).findOne({ where: { id: createDto.pacienteId } });
                if (pac?.clinicaId) createDto.clinicaId = pac.clinicaId;
            }
        }

        const historia = this.historiaClinicaRepository.create(createDto);
        return await this.historiaClinicaRepository.save(historia);
    }

    async findAll(): Promise<HistoriaClinica[]> {
        return await this.historiaClinicaRepository.find({
            relations: ['paciente', 'doctor', 'especialidad', 'personal', 'proforma', 'proformaDetalle', 'proformaDetalle.arancel'],
            order: { fecha: 'DESC' }
        });
    }

    async findAllByPaciente(pacienteId: number): Promise<HistoriaClinica[]> {
        return await this.historiaClinicaRepository.find({
            where: { pacienteId },
            relations: ['paciente', 'doctor', 'especialidad', 'personal', 'proforma', 'proformaDetalle'],
            order: { fecha: 'DESC' }
        });
    }

    async findPendientesPago(doctorId: number, clinicaId?: number): Promise<any[]> {
        const timestamp = new Date().toISOString();
        console.log(`[PAGOS_DOCTORES][${timestamp}] Buscando pendientes para Doctor #${doctorId} (Clinica: ${clinicaId})`);
        
        const qb = this.historiaClinicaRepository.createQueryBuilder('hc')
            .leftJoinAndSelect('hc.paciente', 'paciente')
            .leftJoinAndSelect('hc.doctor', 'doctor')
            .leftJoinAndSelect('hc.especialidad', 'especialidad')
            .leftJoinAndSelect('hc.personal', 'personal')
            .leftJoinAndSelect('hc.proforma', 'proforma')
            .leftJoinAndSelect('hc.proformaDetalle', 'proformaDetalle')
            .leftJoinAndSelect('proformaDetalle.arancel', 'arancel');
            // NO usamos relaciones para pagos ni pagosDetalleDoctores para evitar circularidad
            
        qb.where('hc.doctorId = :doctorId', { doctorId })
            .andWhere('hc.pagado = :pagado', { pagado: 'NO' })
            .andWhere('hc.estadoTratamiento = :estado', { estado: 'terminado' });

        if (clinicaId && Number(clinicaId) !== 0) {
            qb.andWhere('( (proforma.clinicaId = :clinicaId) OR (proforma.id IS NULL AND hc.clinicaId = :clinicaId) )', { clinicaId });
        }

        qb.orderBy('hc.fecha', 'ASC');

        const candidatos = await qb.getMany();
        console.log(`[PAGOS_DOCTORES][${timestamp}] #${candidatos.length} candidatos potenciales de DB.`);

        const resultados = await Promise.all(candidatos.map(async (hc) => {
            // 1. Verificar si YA se pagó al doctor (en la tabla de detalles)
            const yaPagadoAlDoctor = await this.pagosDetalleDoctoresRepository.findOne({
                where: { idhistoria_clinica: hc.id }
            });

            if (yaPagadoAlDoctor) {
                return null;
            }

            // 1. Determinar el precio objetivo (lo que el paciente debe cubrir)
            const basePrice = Number(hc.proformaDetalle?.precioUnitario || hc.precio || 0);
            const targetPrice = Number(hc.precioConDescuento) || (basePrice - Number(hc.descuento || 0));

            // 2. Calcular cuánto se ha pagado (Tomando en cuenta el pozo de la proforma si existe)
            let totalPagadoYDescontado = 0;
            let pagosPaciente: Pago[] = [];
            
            if (hc.proformaId) {
                const poolResults = await this.dataSource.query(
                    `SELECT 
                        SUM(CAST(monto AS NUMERIC)) as "montoTotal",
                        SUM(CAST(descuento AS NUMERIC)) as "descuentoTotal"
                     FROM pagos 
                     WHERE "proformaId" = $1`,
                    [hc.proformaId]
                );
                totalPagadoYDescontado = Number(poolResults[0]?.montoTotal || 0) + Number(poolResults[0]?.descuentoTotal || 0);
                
                // Para el 'latestPayment', necesitamos los pagos reales
                pagosPaciente = await this.pagoRepository.find({
                    where: { proformaId: hc.proformaId },
                    relations: ['formaPagoRel']
                });
            } else {
                pagosPaciente = await this.pagoRepository.find({
                    where: { historiaClinicaId: hc.id },
                    relations: ['formaPagoRel']
                });
                totalPagadoYDescontado = (pagosPaciente || []).reduce((acc, p) => 
                    acc + Number(p.monto) + Number(p.descuento || 0), 0);
            }

            const hc_cancelado_bool = Boolean(hc.cancelado);
            const isFullyPaidByPatient = hc_cancelado_bool || 
                                       targetPrice <= 0 || 
                                       totalPagadoYDescontado >= (targetPrice - 0.5);

            if (!isFullyPaidByPatient) {
                console.warn(`[PAGOS_DOCTORES][${timestamp}] HC #${hc.id} EXCLUIDO: Saldo insuficiente. (Paid:${totalPagadoYDescontado} vs Target:${targetPrice})`);
                return null;
            }

            const pagoConFactura = (pagosPaciente || []).find(p => p.factura && p.factura.trim() !== '');
            const latestPayment = (pagosPaciente || []).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

            const labWorks = await this.trabajoLaboratorioRepository.find({
                where: { idHistoriaClinica: hc.id }
            });
            const costoLaboratorioAuto = labWorks.reduce((acc, work) => acc + (Number(work.total) || 0), 0);

            return {
                ...hc,
                precio: basePrice, // Enviamos el precio base para que el frontend reste el descuento una sola vez
                ultimoPagoPaciente: latestPayment ? {
                    fecha: latestPayment.fecha,
                    forma_pago: (latestPayment as any).formaPagoRel?.forma_pago || '',
                    monto: latestPayment.monto,
                    moneda: latestPayment.moneda,
                    factura: pagoConFactura ? pagoConFactura.factura : (latestPayment.factura || null)
                } : null,
                comisionDefault: hc.proformaDetalle?.arancel?.comision || 0,
                costoLaboratorioAuto
            };
        }));

        const finalResults = resultados.filter(r => r !== null);
        console.log(`[PAGOS_DOCTORES][${timestamp}] Retornando ${finalResults.length} ítems finales para vista.`);
        return finalResults;
    }

    async findDoctoresConPendientes(clinicaId?: number): Promise<any[]> {
        const qb = this.historiaClinicaRepository
            .createQueryBuilder('hc')
            .innerJoin('hc.doctor', 'doctor')
            .leftJoin('hc.proformaDetalle', 'detalle')
            .where('hc.pagado = :pagado', { pagado: 'NO' })
            .andWhere('hc.estadoTratamiento = :estado', { estado: 'terminado' });

        if (clinicaId) {
            qb.leftJoin('hc.proforma', 'proforma')
                .andWhere('proforma.clinicaId = :clinicaId', { clinicaId });
        }

        // We only want doctors who have at least one treatment satisfying the "Full Payment" condition
        // Here we just get the doctors who have at least one TERMINADO and NO PAGADO.
        // We filter the actual eligibility in findPendientesPago for performance.
        // safer aliases for getRawMany
        const doctors = await qb.select('doctor.id', 'id')
            .addSelect('doctor.nombre', 'nombre')
            .addSelect('doctor.paterno', 'paterno')
            .addSelect('doctor.materno', 'materno')
            .distinct(true)
            .orderBy('doctor.paterno', 'ASC')
            .getRawMany();

        console.log(`[PAGOS_DOCTORES] Doctores encontrados con pendientes: ${doctors.length}`);
        return doctors;
    }

    async findCancelados(): Promise<any[]> {
        const results = await this.historiaClinicaRepository.createQueryBuilder('hc')
            .leftJoinAndSelect('hc.paciente', 'paciente')
            .leftJoinAndSelect('hc.doctor', 'doctor')
            .leftJoinAndSelect('hc.proforma', 'proforma')
            .leftJoinAndSelect('hc.proformaDetalle', 'detalle')
            .where('hc.pagado = :pagado', { pagado: 'SI' })
            .orderBy('hc.fecha', 'DESC')
            .getMany();

        return await Promise.all(results.map(async (hc) => {
            // Fetch doctor payment details manually
            const detailDoc = await this.pagosDetalleDoctoresRepository.findOne({
                where: { idhistoria_clinica: hc.id },
                relations: ['pago']
            });

            // Fetch patient payments manually via proforma
            let proformaPagos: Pago[] = [];
            if (hc.proformaId) {
                proformaPagos = await this.pagoRepository.find({
                    where: { proformaId: hc.proformaId },
                    relations: ['formaPagoRel'],
                    order: { fecha: 'DESC' }
                });
            }

            const latestPayment = proformaPagos[0] || null;
            const pagoConFactura = proformaPagos.find(p => p.factura && p.factura.trim() !== '');

            return {
                ...hc,
                numeroPresupuesto: hc.proforma?.numero,
                costoLaboratorio: detailDoc ? Number(detailDoc.costo_laboratorio) : 0,
                fechaPagoPaciente: latestPayment?.fecha,
                formaPagoPaciente: latestPayment?.formaPagoRel?.forma_pago,
                descuento: detailDoc ? Number(detailDoc.descuento) : 0,
                comision: detailDoc ? Number(detailDoc.comision) : 0,
                pagoDoctorMonto: detailDoc ? Number(detailDoc.total) : 0,
                fechaPagoDoctor: detailDoc?.pago?.fecha,
                factura: pagoConFactura ? pagoConFactura.factura : (latestPayment?.factura || null)
            };
        }));
    }

    async findOne(id: number): Promise<HistoriaClinica> {
        const historia = await this.historiaClinicaRepository.findOne({
            where: { id },
            relations: ['paciente', 'doctor', 'especialidad', 'personal', 'proforma', 'proformaDetalle']
        });
        if (!historia) {
            throw new NotFoundException(`Historia Clínica #${id} not found`);
        }
        return historia;
    }

    async update(id: number, updateDto: UpdateHistoriaClinicaDto): Promise<HistoriaClinica> {
        const historia = await this.historiaClinicaRepository.findOne({ where: { id } });
        if (!historia) {
            throw new NotFoundException(`Historia Clínica #${id} not found`);
        }

        if (updateDto.firmaPaciente && updateDto.firmaPaciente.startsWith('data:image')) {
            if (historia.firmaPaciente && historia.firmaPaciente.startsWith('http')) {
                try {
                    await this.storageService.deleteFile('clinica-media', historia.firmaPaciente);
                } catch (e) {
                    console.warn('[HistoriaClinicaService] Could not delete old file from Supabase');
                }
            }
            try {
                updateDto.firmaPaciente = await this.storageService.uploadBase64('clinica-media', `signature-hc-${historia.pacienteId}-${id}`, updateDto.firmaPaciente);
            } catch (error) {
                console.warn('[HistoriaClinicaService] Supabase upload failed, saving as Base64 in database:', error.message);
            }
        }

        this.historiaClinicaRepository.merge(historia, updateDto);
        const saved = await this.historiaClinicaRepository.save(historia);

        // Si se cambió el estado del presupuesto, sincronizar a TODA la proforma
        if (updateDto.estadoPresupuesto && saved.proformaId) {
            await this.historiaClinicaRepository.update(
                { proformaId: saved.proformaId },
                { estadoPresupuesto: updateDto.estadoPresupuesto }
            );
        }

        return saved;
    }

    async remove(id: number): Promise<void> {
        const historia = await this.findOne(id);
        await this.historiaClinicaRepository.remove(historia);
    }

    async findRecientesByPaciente(pacienteId: number, proformaId?: number): Promise<HistoriaClinica[]> {
        const now = new Date();
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 2);
        dateLimit.setHours(0, 0, 0, 0);

        const where: any = {
            pacienteId,
            fecha: Between(dateLimit, now),
            precio: MoreThan(0)
        };

        if (proformaId) {
            where.proformaId = proformaId;
        }

        return await this.historiaClinicaRepository.find({
            where,
            relations: ['proforma'],
            order: { fecha: 'DESC', id: 'DESC' }
        });
    }

    async findByProforma(proformaId: number): Promise<HistoriaClinica[]> {
        return await this.historiaClinicaRepository.find({
            where: { proformaId },
            relations: ['proforma', 'proformaDetalle'],
            order: { fecha: 'DESC', id: 'DESC' }
        });
    }

    async syncTreatmentStatus(id: number): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PAGOS_SYNC][${timestamp}] Iniciando sincronización ROBUSTA para HC #${id}`);
        
        try {
            const hc = await this.historiaClinicaRepository.findOne({ where: { id } });
            if (!hc) return;

            // Si el tratamiento pertenece a una proforma, rebalanceamos TODA la proforma
            // Esto asegura que adelantos generales se tomen en cuenta.
            if (hc.proformaId) {
                await this.rebalanceProformaStatus(hc.proformaId);
            } else {
                // Sincronización individual (para tratamientos sin presupuesto)
                const rawResults = await this.dataSource.query(
                    `SELECT 
                        SUM(CAST(monto AS NUMERIC)) as "totalPagado", 
                        SUM(CAST(descuento AS NUMERIC)) as "totalDescontado" 
                     FROM pagos 
                     WHERE "historiaClinicaId" = $1`,
                    [id]
                );

                const aggregation = rawResults[0] || { totalPagado: 0, totalDescontado: 0 };
                const totalPagado = Number(aggregation.totalPagado || 0);
                const totalDescontado = Number(aggregation.totalDescontado || 0);
                const targetPrice = Number(hc.precio || 0);
                const cancelado = (totalPagado + totalDescontado) >= (targetPrice - 0.1);

                await this.dataSource.query(
                    `UPDATE historia_clinica 
                     SET cancelado = $1, 
                         descuento = $2, 
                         "precioConDescuento" = $3 
                     WHERE id = $4`,
                    [cancelado, totalDescontado, targetPrice - totalDescontado, id]
                );
            }
            console.log(`[PAGOS_SYNC][${timestamp}] Sincronización finalizada para HC #${id}`);
        } catch (error) {
            console.error(`[PAGOS_SYNC][${timestamp}] Error sincronizando HC #${id}:`, error);
        }
    }

    async rebalanceProformaStatus(proformaId: number): Promise<void> {
        const timestamp = new Date().toISOString();
        console.log(`[PAGOS_REBALANCE][${timestamp}] >>> INICIO REBALANCEO SMART FIFO <<< Proforma #${proformaId}`);
        
        try {
            // 1. Obtener los recursos (Efectivo Global y Descuentos Vinculados)
            const pagosDeProforma = await this.pagoRepository.find({
                where: { proformaId }
            });

            let globalCashPool = 0;
            const directDiscounts: Map<number | string, number> = new Map();

            pagosDeProforma.forEach(p => {
                globalCashPool += Number(p.monto || 0);
                if (Number(p.descuento || 0) > 0) {
                    const key = p.historiaClinicaId || 'global';
                    directDiscounts.set(key, (directDiscounts.get(key) || 0) + Number(p.descuento));
                }
            });

            let globalDiscountPool = directDiscounts.get('global') || 0;

            // 2. Obtener y Agrupar Tratamientos (para no cobrar doble por seguimientos)
            const todasLasHcs = await this.historiaClinicaRepository.find({
                where: { proformaId },
                relations: ['proformaDetalle'],
                order: { fecha: 'ASC', id: 'ASC' }
            });

            const grupos: Map<number | string, HistoriaClinica[]> = new Map();
            todasLasHcs.forEach(hc => {
                const key = hc.proformaDetalleId || hc.tratamiento || 'unlinked';
                if (!grupos.has(key)) grupos.set(key, []);
                grupos.get(key)!.push(hc);
            });

            // 3. Procesar cada grupo de tratamiento
            for (const [key, items] of grupos.entries()) {
                const finishedItem = items.find(i => i.estadoTratamiento === 'terminado');
                const referenceItem = finishedItem || items[0];
                const basePrice = Number(referenceItem.precio);
                
                // A. SUMAR DESCUENTOS DIRECTOS DE ESTE GRUPO
                let groupDiscount = 0;
                items.forEach(t => {
                    groupDiscount += (directDiscounts.get(t.id) || 0);
                });

                // B. APLICAR DESCUENTO GLOBAL (si sobra pool y falta cubrir precio)
                if ((basePrice - groupDiscount) > 0 && globalDiscountPool > 0) {
                    const extra = Math.min(basePrice - groupDiscount, globalDiscountPool);
                    groupDiscount += extra;
                    globalDiscountPool -= extra;
                }

                // C. APLICAR EFECTIVO GLOBAL
                let costRemaining = basePrice - groupDiscount;
                let appliedCash = 0;
                if (costRemaining > 0 && globalCashPool > 0) {
                    appliedCash = Math.min(costRemaining, globalCashPool);
                    globalCashPool -= appliedCash;
                    costRemaining -= appliedCash;
                }

                const isCancelado = costRemaining <= 0.05;
                const netPrice = basePrice - groupDiscount;

                // D. ACTUALIZAR TODOS LOS SEGUIMIENTOS DEL GRUPO
                for (const t of items) {
                    await this.historiaClinicaRepository.update(t.id, { 
                        cancelado: isCancelado,
                        descuento: groupDiscount,
                        precioConDescuento: netPrice
                    });
                }
                
                console.log(`[PAGOS_REBALANCE] Grupo ${key}: Base ${basePrice}, Desc ${groupDiscount}, Pagado ${appliedCash}, Cancelado: ${isCancelado}`);
            }
            console.log(`[PAGOS_REBALANCE][${timestamp}] >>> FIN REBALANCEO EXITOSO <<<`);
        } catch (error) {
            console.error(`[PAGOS_REBALANCE][${timestamp}] !!! ERROR CRÍTICO !!!`, error);
        }
    }
}
