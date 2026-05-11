import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
        const saved = await this.historiaClinicaRepository.save(historia);
        
        // Sincronizar estados financieros inmediatamente
        await this.syncTreatmentStatus(saved.id);
        
        return saved;
    }

    async findAll(): Promise<HistoriaClinica[]> {
        return await this.historiaClinicaRepository.find({
            relations: ['paciente', 'doctor', 'especialidad', 'proforma', 'proformaDetalle', 'proformaDetalle.arancel'],
            order: { fecha: 'DESC' }
        });
    }

    async findAllByPaciente(pacienteId: number): Promise<any[]> {
        const hcs = await this.historiaClinicaRepository.find({
            where: { pacienteId },
            relations: ['paciente', 'doctor', 'especialidad', 'proforma', 'proformaDetalle'],
            order: { fecha: 'DESC', id: 'DESC' }
        });

        // Add payment status flag using persistent fields
        return await Promise.all(hcs.map(async (hc) => {
            const hasDoctorPayment = await this.pagosDetalleDoctoresRepository.findOne({ where: { idhistoria_clinica: hc.id } });
            
            return {
                ...hc,
                tienePagos: Number(hc.montoPagado) > 0 || !!hasDoctorPayment
            };
        }));
    }

    async findPendientesPago(doctorId: number, clinicaId?: number): Promise<any[]> {
        const timestamp = new Date().toISOString();
        console.log(`[PAGOS_DOCTORES][${timestamp}] Buscando pendientes para Doctor #${doctorId} (Clinica: ${clinicaId})`);
        
        const qb = this.historiaClinicaRepository.createQueryBuilder('hc')
            .leftJoinAndSelect('hc.paciente', 'paciente')
            .leftJoinAndSelect('hc.doctor', 'doctor')
            .leftJoinAndSelect('hc.especialidad', 'especialidad')
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

            // 2. Determinar si está totalmente pagado por el paciente usando el campo persistente 'saldo'
            const isFullyPaidByPatient = Boolean(hc.cancelado) || Number(hc.saldo) <= 0.05;

            if (!isFullyPaidByPatient) {
                console.log(`[PAGOS_DOCTORES][${timestamp}] HC #${hc.id} EXCLUIDO: Saldo insuficiente. (Saldo:${hc.saldo})`);
                return null;
            }

            // 3. Buscar los pagos específicos de este tratamiento (incluyendo sesiones hermanas si es consolidado)
            let pagosPaciente: Pago[] = [];
            const detId = hc.proformaDetalleId;
            const pieza = hc.pieza;
            const pId = hc.pacienteId;

            let idsParaPagos = [hc.id];
            if (detId) {
                const siblings = await this.dataSource.query(
                    `SELECT id FROM historia_clinica 
                     WHERE "pacienteId" = $1 AND "proformaDetalleId" = $2 AND COALESCE(pieza, '') = COALESCE($3, '')`,
                    [pId, detId, pieza]
                );
                idsParaPagos = siblings.map(s => s.id);
            }

            pagosPaciente = await this.pagoRepository.find({
                where: { historiaClinicaId: In(idsParaPagos) },
                relations: ['formaPagoRel']
            });

            // Si no hay pagos directos a HC, pero tiene proforma, podríamos buscar pagos generales a proforma?
            // Pero según el requerimiento, los pagos se vinculan al seguimiento.
            
            const pagoConFactura = (pagosPaciente || []).find(p => p.factura && p.factura.trim() !== '');
            const latestPayment = (pagosPaciente || []).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

            const labWorks = await this.trabajoLaboratorioRepository.find({
                where: { idHistoriaClinica: hc.id }
            });
            const costoLaboratorioAuto = labWorks.reduce((acc, work) => acc + (Number(work.total) || 0), 0);

            return {
                ...hc,
                precio: Number(hc.precio || 0), // El precio ya contempla cantidad en el seguimiento
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
            relations: ['paciente', 'doctor', 'especialidad', 'proforma', 'proformaDetalle']
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

        // Sincronizar estados financieros después de la actualización
        await this.syncTreatmentStatus(saved.id);

        return saved;
    }

    async remove(id: number): Promise<void> {
        const historia = await this.findOne(id);

        // Verify if it has associated payments (Safety net)
        const hasPatientPayment = await this.pagoRepository.findOne({ where: { historiaClinicaId: id } });
        const hasDoctorPayment = await this.pagosDetalleDoctoresRepository.findOne({ where: { idhistoria_clinica: id } });

        if (hasPatientPayment || hasDoctorPayment) {
            throw new ForbiddenException('No se puede eliminar este registro porque tiene pagos asociados. Elimine primero los pagos vinculados a este tratamiento.');
        }

        const proformaId = historia.proformaId;
        await this.historiaClinicaRepository.remove(historia);

        // Rebalance if it was part of a proforma
        if (proformaId) {
            // await this.rebalanceProformaStatus(proformaId);
        }
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
        try {
            const hc = await this.historiaClinicaRepository.findOne({ where: { id } });
            if (!hc) return;

            const pId = hc.pacienteId;
            const detId = hc.proformaDetalleId;
            const pieza = hc.pieza;

            let siblingsIds = [id];
            let targetPrice = Number(hc.precio || 0);

            // 1. Si está vinculado a un detalle de proforma, buscamos todos los registros "hermanos" (misma pieza y detalle)
            if (detId) {
                const siblings = await this.dataSource.query(
                    `SELECT id, precio FROM historia_clinica 
                     WHERE "pacienteId" = $1 AND "proformaDetalleId" = $2 AND COALESCE(pieza, '') = COALESCE($3, '')`,
                    [pId, detId, pieza]
                );
                siblingsIds = siblings.map(s => s.id);
                // El precio objetivo es la suma de los precios registrados para estas piezas específicas
                targetPrice = siblings.reduce((acc, s) => acc + Number(s.precio || 0), 0);
            }

            // 2. Sumar todos los pagos vinculados a cualquiera de estos registros
            const payments = await this.dataSource.query(
                `SELECT SUM(CAST(monto AS NUMERIC)) as total FROM pagos WHERE "historiaClinicaId" = ANY($1)`,
                [siblingsIds]
            );
            const totalPagadoGrupo = Number(payments[0]?.total || 0);

            // 3. Determinar estado
            // El estado de cancelación se aplica a TODO el grupo si el total pagado cubre el precio objetivo
            const isCancelado = totalPagadoGrupo >= (targetPrice - 0.05);
            
            // Distribuir el monto pagado equitativamente entre los hermanos para reportes coherentes
            const montoPorHermano = totalPagadoGrupo / siblingsIds.length;
            const saldoPorHermano = Math.max(0, (targetPrice / siblingsIds.length) - montoPorHermano);

            // 4. Actualizar todos los registros del grupo
            await this.dataSource.query(
                `UPDATE historia_clinica 
                 SET cancelado = $1, 
                     "montoPagado" = $2,
                     saldo = $3,
                     "precioConDescuento" = precio 
                 WHERE id = ANY($4)`,
                [isCancelado, montoPorHermano, saldoPorHermano, siblingsIds]
            );

            console.log(`[PAGOS_SYNC][${timestamp}] Grupo HC ${siblingsIds.join(',')} sincronizado. Total: ${totalPagadoGrupo}/${targetPrice}. Cancelado: ${isCancelado}`);
        } catch (error) {
            console.error(`[PAGOS_SYNC][${timestamp}] Error sincronizando HC #${id}:`, error);
        }
    }
}
