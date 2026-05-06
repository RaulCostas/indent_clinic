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

        const proformaIdKey = Object.keys(sampleProforma).find(k =>
            k.toLowerCase() === 'id'
        ) || 'id';

        const patientIds = [...new Set(proformas.map(p => p[patientIdKey]))].filter(id => id);

        // Step 3: Fetch all payments for these patients (includes advances with no proformaId)
        let pagos: any[] = [];
        if (patientIds.length > 0) {
            // Detect the correct patientId column in the 'pagos' table specifically
            const pagosSample = await this.dataSource.query(`SELECT * FROM pagos LIMIT 1`);
            let pPacIdKey = 'pacienteId';
            if (pagosSample.length > 0) {
                pPacIdKey = Object.keys(pagosSample[0]).find(k =>
                    k.toLowerCase() === 'pacienteid' || k.toLowerCase() === 'paciente_id'
                ) || 'pacienteId';
            }

            pagos = await this.dataSource.query(
                `SELECT * FROM pagos WHERE "${pPacIdKey}" IN (${patientIds.join(',')})`
            );
        }

        // Step 4: Fetch all historia_clinica entries for these proformas
        let history: any[] = [];
        if (proformaIds.length > 0) {
            // We need to know the proformaId column in 'historia_clinica' table.
            const historySample = await this.dataSource.query(`SELECT * FROM historia_clinica LIMIT 1`);
            let hProfIdKey = 'proformaId';
            if (historySample.length > 0) {
                hProfIdKey = Object.keys(historySample[0]).find(k =>
                    k.toLowerCase() === 'proformaid' || k.toLowerCase() === 'proforma_id'
                ) || 'proformaId';
            }

            history = await this.dataSource.query(
                `SELECT * FROM historia_clinica WHERE "${hProfIdKey}" IN (${proformaIds.join(',')})`
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
        const pagosHCMap = new Map<number, number>();
        const pagosGeneralesMap = new Map<number, number>();

        pagos.forEach(pg => {
            const monto = parseFloat(pg.monto) || 0;
            const hcId = getVal(pg, 'historiaClinicaId') || getVal(pg, 'historia_clinica_id');
            const pgPacienteId = Number(getVal(pg, 'pacienteId') || getVal(pg, 'paciente_id'));

            if (hcId) {
                const current = pagosHCMap.get(Number(hcId)) || 0;
                pagosHCMap.set(Number(hcId), current + monto);
            } else {
                const current = pagosGeneralesMap.get(pgPacienteId) || 0;
                pagosGeneralesMap.set(pgPacienteId, current + monto);
            }
        });

        // --- Process each treatment (HistoriaClinica record) ---
        const results: any[] = [];

        history.forEach(h => {
            const pid = Number(getVal(h, 'pacienteId'));
            const pac = patientMap.get(pid);
            if (!pac) return;

            const pacName = getVal(pac, 'nombre') || '';
            const pacPaterno = getVal(pac, 'paterno') || '';
            const pacMaterno = getVal(pac, 'materno') || '';

            const price = parseFloat(h.precio) || 0;
            const discount = parseFloat(h.descuento) || 0;
            const netPrice = price - discount;

            const paidDirectly = pagosHCMap.get(Number(h.id)) || 0;
            const saldo = Math.max(0, netPrice - paidDirectly);

            // Skip if no price or fully paid directly
            if (netPrice <= 0 || saldo <= 0.01) return;

            const hProfId = Number(getVal(h, 'proformaId'));
            const prof = proformas.find(p => Number(p.id) === hProfId);

            results.push({
                id: h.id, // HC ID
                proformaId: h.proformaId,
                numeroPresupuesto: prof?.numero || 'Gen',
                pacienteId: pid,
                totalPresupuesto: netPrice,
                totalPagado: paidDirectly,
                saldo: saldo,
                ultimaCita: h.fecha || null,
                especialidad: h.especialidadId ? (espMap.get(h.especialidadId) || '') : '',
                tratamiento: h.tratamiento || '',
                paciente: `${pacName} ${pacPaterno} ${pacMaterno}`.trim().replace(/\s+/g, ' '),
                pacienteEstado: getVal(pac, 'estado') || 'activo',
                status: h.estadoPresupuesto === 'terminado' ? 'terminado' : 'no terminado',
                fechaProforma: prof?.fecha || prof?.createdAt || h.createdAt,
            });
        });

        // --- Apply general advances (saldo a favor) ---
        // Sort results by date to apply advances FIFO
        results.sort((a, b) => new Date(a.ultimaCita).getTime() - new Date(b.ultimaCita).getTime());

        const patientAdvances = new Map<number, number>(pagosGeneralesMap);

        results.forEach(r => {
            let advancePool = patientAdvances.get(r.pacienteId) || 0;
            if (advancePool <= 0 || r.saldo <= 0.01) return;

            const canReduce = Math.min(advancePool, r.saldo);
            r.saldo -= canReduce;
            r.totalPagado += canReduce;
            patientAdvances.set(r.pacienteId, advancePool - canReduce);
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
