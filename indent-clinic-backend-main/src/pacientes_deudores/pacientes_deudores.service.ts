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
        try {
            // Reformulated logic: Group by patient, proforma item, and piece to consolidate debt rows.
            let q = `
                SELECT 
                    MIN(hc.id) as id,
                    hc."proformaId",
                    hc."pacienteId",
                    SUM(hc.precio) as "totalPresupuestoBruto",
                    SUM(hc."montoPagado") as "totalPagado",
                    SUM(hc.saldo) as saldo,
                    SUM(hc.cantidad) as cantidad,
                    hc.tratamiento,
                    MAX(hc.fecha) as "ultimaCita",
                    hc."estadoPresupuesto",
                    p.numero as "numeroPresupuesto",
                    pac.nombre, pac.paterno, pac.materno, pac.estado as "pacienteEstado", pac.celular as telefono,
                    e.especialidad
                FROM historia_clinica hc
                LEFT JOIN proformas p ON hc."proformaId" = p.id
                LEFT JOIN pacientes pac ON hc."pacienteId" = pac.id
                LEFT JOIN especialidad e ON hc."especialidadId" = e.id
                WHERE hc.cancelado = false
            `;

            if (estado === 'terminado') {
                q += ` AND hc."estadoPresupuesto" = 'terminado'`;
            } else {
                q += ` AND hc."estadoPresupuesto" = 'no terminado'`;
            }

            if (clinicaId) {
                q += ` AND hc."clinicaId" = ${Number(clinicaId)}`;
            }

            q += ` 
                GROUP BY 
                    hc."pacienteId", 
                    hc."proformaId", 
                    hc."proformaDetalleId", 
                    COALESCE(hc.pieza, ''), 
                    hc.tratamiento, 
                    hc."estadoPresupuesto", 
                    p.numero, 
                    pac.nombre, pac.paterno, pac.materno, pac.estado, pac.celular, 
                    e.especialidad
                HAVING SUM(hc.saldo) > 0.05
                ORDER BY "ultimaCita" DESC
            `;

            const rows = await this.dataSource.query(q);

            return rows.map(row => ({
                id: row.id,
                proformaId: row.proformaId,
                pacienteId: row.pacienteId,
                numeroPresupuesto: row.numeroPresupuesto || 0,
                paciente: `${row.nombre || ''} ${row.paterno || ''} ${row.materno || ''}`.trim(),
                totalPresupuesto: Number(row.totalPresupuestoBruto),
                totalPagado: Number(row.totalPagado),
                saldo: Number(row.saldo),
                cantidadPendiente: Number(row.cantidad || 1),
                ultimaCita: row.ultimaCita,
                especialidad: row.especialidad || 'General',
                tratamiento: row.tratamiento || 'Tratamiento',
                pacienteEstado: row.pacienteEstado || 'activo',
                telefono: row.telefono
            }));
        } catch (e) { 
            console.error('Error in PacientesDeudoresService.findAll:', e);
            return []; 
        }
    }

    async findPlanned(clinicaId?: number) {
        try {
            // Reformulated logic: Show treatments from "proforma_detalle" that have NO records in "historia_clinica" (No Iniciado).
            let q = `
                SELECT 
                    pd.id, pd."proformaId", pd."precioUnitario", pd.piezas, pd.cantidad, 
                    a.detalle as tratamiento, 
                    e.especialidad,
                    p.numero as "numeroPresupuesto",
                    p.fecha as "ultimaCita",
                    p."pacienteId",
                    pac.nombre, pac.paterno, pac.materno, pac.estado as "pacienteEstado"
                FROM proforma_detalle pd
                LEFT JOIN proformas p ON pd."proformaId" = p.id
                LEFT JOIN pacientes pac ON p."pacienteId" = pac.id
                LEFT JOIN arancel a ON pd."arancelId" = a.id
                LEFT JOIN especialidad e ON a."idEspecialidad" = e.id
                LEFT JOIN historia_clinica hc ON pd.id = hc."proformaDetalleId"
                WHERE hc.id IS NULL AND pd.posible = false
            `;

            if (clinicaId) {
                q += ` AND p."clinicaId" = ${Number(clinicaId)}`;
            }

            q += ` ORDER BY p.fecha DESC`;

            const details = await this.dataSource.query(q);

            return details.map(det => {
                const piezasArr = (det.piezas || '')
                    .split(/[-,.]/)
                    .map(p => p.trim())
                    .filter(p => p !== '');

                return {
                    id: det.id,
                    proformaId: det.proformaId,
                    numeroPresupuesto: det.numeroPresupuesto,
                    pacienteId: det.pacienteId,
                    paciente: `${det.nombre || ''} ${det.paterno || ''} ${det.materno || ''}`.trim(),
                    pacienteEstado: det.pacienteEstado || 'activo',
                    especialidad: det.especialidad || 'General',
                    tratamiento: det.tratamiento || 'Tratamiento',
                    piezas: piezasArr.join('-') || det.piezas || '-',
                    cantidadPendiente: Number(det.cantidad || 1),
                    precioUnitario: Number(det.precioUnitario || 0),
                    saldo: 0,
                    saldoPlanificado: Number(det.cantidad || 1) * Number(det.precioUnitario || 0),
                    ultimaCita: det.ultimaCita
                };
            });
        } catch (e) { 
            console.error('Error in PacientesDeudoresService.findPlanned:', e);
            return []; 
        }
    }
}
