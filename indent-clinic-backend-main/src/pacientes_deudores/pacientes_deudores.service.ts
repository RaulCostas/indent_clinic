import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Proforma } from '../proformas/entities/proforma.entity';

@Injectable()
export class PacientesDeudoresService {
    constructor(
        @InjectRepository(Proforma)
        private readonly proformaRepository: Repository<Proforma>,
        private dataSource: DataSource,
    ) { }

    async findAll(estado: 'terminado' | 'no terminado', clinicaId?: number) {
        // Step 1: Get all proformas, optionally filtered by clinic
        let proformasQuery = `SELECT * FROM proformas`;
        const params: any[] = [];
        if (clinicaId) {
            proformasQuery += ` WHERE "clinicaId" = $1`;
            params.push(clinicaId);
        }
        const proformas = await this.proformaRepository.query(proformasQuery, params);

        if (proformas.length === 0) return [];

        const proformaIds = proformas.map(p => p.id);

        // Step 2: Detect patientId key name (handles camelCase and snake_case)
        const sampleProforma = proformas[0];
        const patientIdKey = Object.keys(sampleProforma).find(k =>
            k.toLowerCase() === 'pacienteid' || k.toLowerCase() === 'paciente_id'
        ) || 'pacienteId';

        const patientIds = [...new Set(proformas.map(p => p[patientIdKey]))].filter(id => id);

        // Step 3: Fetch all payments for these patients (includes advances with no proformaId)
        let pagos: any[] = [];
        if (patientIds.length > 0) {
            pagos = await this.dataSource.query(
                `SELECT * FROM pagos WHERE "pacienteId" IN (${patientIds.join(',')})`
            );
        }

        // Step 4: Fetch all historia_clinica entries for these proformas
        let history: any[] = [];
        if (proformaIds.length > 0) {
            history = await this.dataSource.query(
                `SELECT * FROM historia_clinica WHERE "proformaId" IN (${proformaIds.join(',')})`
            );
        }

        // Step 5: Fetch patients for display info
        let patients: any[] = [];
        if (patientIds.length > 0) {
            patients = await this.dataSource.query(
                `SELECT * FROM pacientes WHERE id IN (${patientIds.join(',')})`
            );
        }

        // Step 6: Fetch specialties for display info
        const espIds = [...new Set(history.map(h => h.especialidadId))].filter(id => id);
        let specialties: any[] = [];
        if (espIds.length > 0) {
            specialties = await this.dataSource.query(
                `SELECT * FROM especialidad WHERE id IN (${espIds.join(',')})`
            );
        }

        // --- Build lookup maps ---
        const espMap = new Map(specialties.map(e => [e.id, e.especialidad]));
        const patientMap = new Map(patients.map(p => [p.id, p]));

        // Helper to safely get value from object by key (case-insensitive)
        const getVal = (obj: any, keySub: string) => {
            if (!obj) return null;
            const keys = Object.keys(obj);
            const exactKey = keys.find(k => k.toLowerCase() === keySub.toLowerCase());
            if (exactKey) return obj[exactKey];
            const partialKey = keys.find(key => key.toLowerCase().includes(keySub.toLowerCase()));
            return partialKey ? obj[partialKey] : null;
        };

        // --- Build payment pools ---
        // pagosProformaMap: sum of payments linked to a specific proforma
        // pagosGeneralesMap: sum of advance payments NOT linked to any proforma (per patient)
        const pagosProformaMap = new Map<number, number>();
        const pagosGeneralesMap = new Map<number, number>();

        pagos.forEach(pg => {
            const monto = parseFloat(pg.monto) || 0;
            const pgProformaId = pg.proformaId ? Number(pg.proformaId) : null;
            const pgPacienteId = Number(pg.pacienteId);

            if (pgProformaId && proformaIds.includes(pgProformaId)) {
                const current = pagosProformaMap.get(pgProformaId) || 0;
                pagosProformaMap.set(pgProformaId, current + monto);
            } else if (!pgProformaId || pgProformaId === 0) {
                const current = pagosGeneralesMap.get(pgPacienteId) || 0;
                pagosGeneralesMap.set(pgPacienteId, current + monto);
            }
        });

        // --- Process each proforma ---
        const results = proformas.map(p => {
            const pid = p[patientIdKey];
            const pac = patientMap.get(pid);

            const pacName = pac ? (getVal(pac, 'nombre') || '') : '';
            const pacPaterno = pac ? (getVal(pac, 'paterno') || '') : '';
            const pacMaterno = pac ? (getVal(pac, 'materno') || '') : '';

            // Get all history entries for this proforma
            const pHistory = history.filter(h => Number(h.proformaId) === Number(p.id));

            if (pHistory.length === 0) return null; // Skip proformas with no treatments

            // --- DEBT CALCULATION ---
            // Sort chronologically (oldest first) to apply FIFO payment allocation
            const chronologicalHistory = [...pHistory].sort((a, b) => {
                // Prioridad 1: Terminados primero (Deuda Real)
                if (a.estadoTratamiento === 'terminado' && b.estadoTratamiento !== 'terminado') return -1;
                if (a.estadoTratamiento !== 'terminado' && b.estadoTratamiento === 'terminado') return 1;
                // Prioridad 2: Orden cronológico (FIFO)
                return new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id;
            });

            let pool = pagosProformaMap.get(Number(p.id)) || 0;
            let priceTotal = 0;
            let paidOnTreatments = 0;

            chronologicalHistory.forEach(t => {
                const price = parseFloat(t.precio) || 0;
                const discount = parseFloat(t.descuento) || 0;
                const netPrice = price - discount;

                if (t.estadoTratamiento === 'terminado') {
                    // Treatment is clinically DONE → its cost is billable debt
                    const applied = pool > 0 ? Math.min(pool, netPrice) : 0;
                    pool -= applied;
                    priceTotal += netPrice;
                    paidOnTreatments += applied;
                } else {
                    // Treatment still ongoing → not billable yet, but consume pool in order
                    const applied = pool > 0 ? Math.min(pool, netPrice) : 0;
                    pool -= applied;
                }
            });

            // No finished treatments = no reportable debt
            if (priceTotal <= 0) return null;

            const saldo = Math.max(0, priceTotal - paidOnTreatments);

            // Fully paid = not a debtor
            if (saldo <= 0.01) return null;

            // --- TAB CLASSIFICATION uses estadoPresupuesto ---
            // Activos:  estadoPresupuesto != 'terminado' (plan still open administratively)
            // Pasivos:  estadoPresupuesto == 'terminado' (plan closed administratively)
            const anyTerminado = pHistory.some(t => t.estadoPresupuesto === 'terminado');
            const proformaStatus = anyTerminado ? 'terminado' : 'no terminado';

            // --- UI Display Fields (show latest treatment for context) ---
            const sortedHistory = [...pHistory].sort((a, b) => {
                const dateDiff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
                if (dateDiff !== 0) return dateDiff;
                return b.id - a.id;
            });

            const latest = sortedHistory[0] || {};

            return {
                proformaId: Number(p.id),
                numeroPresupuesto: p.numero,
                pacienteId: Number(pid),
                totalPresupuesto: priceTotal,
                totalPagado: paidOnTreatments,
                saldo: saldo,
                ultimaCita: latest.fecha || null,
                especialidad: latest.especialidadId ? (espMap.get(latest.especialidadId) || '') : '',
                tratamiento: latest.tratamiento || '',
                paciente: `${pacName} ${pacPaterno} ${pacMaterno}`.trim().replace(/\s+/g, ' '),
                pacienteEstado: pac ? getVal(pac, 'estado') : 'activo',
                status: proformaStatus,
                fechaProforma: p.fecha || p.createdAt,
            };
        }).filter(r => r !== null);

        // --- Apply general advances (saldo a favor) ---
        // Group results by patient and apply unlinked advances 
        const patientResultsMap = new Map<number, any[]>();
        results.forEach(r => {
            const list = patientResultsMap.get(r.pacienteId) || [];
            list.push(r);
            patientResultsMap.set(r.pacienteId, list);
        });

        patientResultsMap.forEach((pResults, patientId) => {
            let advancePool = pagosGeneralesMap.get(Number(patientId)) || 0;
            if (advancePool <= 0) return;

            // Apply advances to oldest proformas first
            pResults.sort((a, b) => new Date(a.fechaProforma).getTime() - new Date(b.fechaProforma).getTime());

            pResults.forEach(r => {
                if (advancePool <= 0 || r.saldo <= 0.01) return;
                const canReduce = Math.min(advancePool, r.saldo);
                r.saldo -= canReduce;
                r.totalPagado += canReduce;
                advancePool -= canReduce;
            });
        });

        // --- Final Filter: only show records matching the requested status AND with remaining debt ---
        return results.filter(r => {
            const hasBalance = r.saldo > 0.01;
            const matchesStatus = estado === 'terminado'
                ? r.status === 'terminado'
                : r.status !== 'terminado';
            return hasBalance && matchesStatus;
        });
    }
}
