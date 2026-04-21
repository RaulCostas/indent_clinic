import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Pago } from '../pagos/entities/pago.entity';
import { Egreso } from '../egresos/entities/egreso.entity';
import { PagosDoctores } from '../pagos_doctores/entities/pagos_doctores.entity';
import { PagosPedidos } from '../pagos_pedidos/entities/pagos_pedidos.entity';
import { PagoLaboratorio } from '../pagos_laboratorios/entities/pago-laboratorio.entity';
import { PagosGastosFijos } from '../pagos_gastos_fijos/entities/pagos_gastos_fijos.entity';
import { OtrosIngresos } from '../otros-ingresos/entities/otros-ingresos.entity';

@Injectable()
export class UtilidadesService {
    constructor(
        @InjectRepository(Pago) private pagoRepo: Repository<Pago>,
        @InjectRepository(Egreso) private egresoRepo: Repository<Egreso>,
        @InjectRepository(PagosDoctores) private pagosDoctoresRepo: Repository<PagosDoctores>,
        @InjectRepository(PagosPedidos) private pagosPedidosRepo: Repository<PagosPedidos>,
        @InjectRepository(PagoLaboratorio) private pagosLaboratoriosRepo: Repository<PagoLaboratorio>,
        @InjectRepository(PagosGastosFijos) private pagosGastosFijosRepo: Repository<PagosGastosFijos>,
        @InjectRepository(OtrosIngresos) private otrosIngresosRepo: Repository<OtrosIngresos>,
    ) { }

    async getStatistics(year: number, clinicaIdStr?: string) {
        // Initialize 12 months structure
        const stats = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            bolivianos: { ingresos: 0, egresos: 0, utilidad: 0 },
            dolares: { ingresos: 0, egresos: 0, utilidad: 0 },
        }));

        const getMonth = (dateVal: any) => {
            if (!dateVal) return -1;
            if (dateVal instanceof Date) return dateVal.getMonth() + 1;

            // Try parsing string 'YYYY-MM-DD'
            const parts = dateVal.toString().split('-');
            if (parts.length >= 2) return parseInt(parts[1]);

            // Fallback
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) return d.getMonth() + 1;

            return -1;
        };

        const updateStat = (month: number, currency: string, type: 'ingresos' | 'egresos', amount: number) => {
            const index = month - 1;
            if (index >= 0 && index < 12) {
                const currKey = (currency === 'Dólares' || currency === 'USD') ? 'dolares' : 'bolivianos';
                // Handle null/undef amount
                const val = amount ? parseFloat(amount.toString()) : 0;
                stats[index][currKey][type] += val;
            }
        };

        try {
            const clinicaId = clinicaIdStr ? parseInt(clinicaIdStr, 10) : 0;

            // 1. INGRESOS (Pagos)
            const pagosQuery = this.pagoRepo.createQueryBuilder('pago')
                .leftJoinAndSelect('pago.comisionTarjeta', 'comision')
                .leftJoin('pago.proforma', 'proforma')
                .where('EXTRACT(YEAR FROM pago.fecha::date) = :year', { year });

            if (clinicaId > 0) {
                pagosQuery.andWhere('proforma.clinicaId = :clinicaId', { clinicaId });
            }

            const pagos = await pagosQuery.getMany();
            console.log(`Utilidades PAGOS SQL:`, pagosQuery.getSql());
            console.log(`Utilidades: Found ${pagos.length} pagos for clinicaId ${clinicaId} year ${year}`);

            pagos.forEach(p => {
                let monto = Number(p.monto);

                // Apply Credit Card deduction if applicable
                if (p.comisionTarjeta) {
                    const comisionPorcentaje = Number(p.comisionTarjeta.monto); // Assuming this is %
                    const descuento = monto * (comisionPorcentaje / 100);
                    monto = monto - descuento;
                }

                updateStat(getMonth(p.fecha), p.moneda, 'ingresos', monto);
            });

            // 2. EGRESOS (General)
            const egresosQuery = this.egresoRepo.createQueryBuilder('e')
                .where('EXTRACT(YEAR FROM e.fecha) = :year', { year });

            if (clinicaId > 0) {
                egresosQuery.andWhere('e.clinicaId = :clinicaId', { clinicaId });
            }

            const egresos = await egresosQuery.getMany();
            console.log(`Utilidades EGRESOS SQL:`, egresosQuery.getSql());
            console.log(`Utilidades: Found ${egresos.length} egresos for clinicaId ${clinicaId} year ${year}`);

            egresos.forEach(e => {
                updateStat(getMonth(e.fecha), e.moneda, 'egresos', Number(e.monto));
            });

            // 3. EGRESOS (Pagos Doctores)
            const pagosDoctoresQuery = this.pagosDoctoresRepo.createQueryBuilder('pd')
                .where('EXTRACT(YEAR FROM pd.fecha) = :year', { year });

            if (clinicaId > 0) {
                pagosDoctoresQuery.andWhere('pd.clinicaId = :clinicaId', { clinicaId });
            }

            const pagosDoctores = await pagosDoctoresQuery.getMany();

            pagosDoctores.forEach(pd => {
                updateStat(getMonth(pd.fecha), pd.moneda, 'egresos', Number(pd.total));
            });

            // 4. EGRESOS (Pagos Pedidos) - Assume Bolivianos
            const pagosPedidosQuery = this.pagosPedidosRepo.createQueryBuilder('pp')
                .where('EXTRACT(YEAR FROM pp.fecha::date) = :year', { year });

            if (clinicaId > 0) {
                pagosPedidosQuery.andWhere('pp.clinicaId = :clinicaId', { clinicaId });
            }

            const pagosPedidos = await pagosPedidosQuery.getMany();

            pagosPedidos.forEach(pp => {
                updateStat(getMonth(pp.fecha), 'Bolivianos', 'egresos', Number(pp.monto));
            });

            // 5. EGRESOS (Pagos Laboratorios)
            const pagosLaboratoriosQuery = this.pagosLaboratoriosRepo.createQueryBuilder('pl')
                .leftJoinAndSelect('pl.trabajoLaboratorio', 'tl')
                .where('EXTRACT(YEAR FROM pl.fecha::date) = :year', { year });

            if (clinicaId > 0) {
                pagosLaboratoriosQuery.andWhere('tl.clinicaId = :clinicaId', { clinicaId });
            }

            const pagosLaboratorios = await pagosLaboratoriosQuery.getMany();

            pagosLaboratorios.forEach(pl => {
                if (pl.trabajoLaboratorio) {
                    updateStat(getMonth(pl.fecha), pl.moneda, 'egresos', Number(pl.trabajoLaboratorio.total));
                }
            });

            // 6. EGRESOS (Pagos Gastos Fijos)
            const pagosGastosFijosQuery = this.pagosGastosFijosRepo.createQueryBuilder('pgf')
                .where('EXTRACT(YEAR FROM pgf.fecha::date) = :year', { year });

            if (clinicaId > 0) {
                pagosGastosFijosQuery.andWhere('pgf.clinicaId = :clinicaId', { clinicaId });
            }

            const pagosGastosFijos = await pagosGastosFijosQuery.getMany();

            pagosGastosFijos.forEach(pgf => {
                updateStat(getMonth(pgf.fecha), pgf.moneda, 'egresos', Number(pgf.monto));
            });

            // 7. OTROS INGRESOS
            const otrosIngresosQuery = this.otrosIngresosRepo.createQueryBuilder('oi')
                .where('EXTRACT(YEAR FROM oi.fecha::date) = :year', { year });

            if (clinicaId > 0) {
                otrosIngresosQuery.andWhere('oi.clinicaId = :clinicaId', { clinicaId });
            }

            const otrosIngresos = await otrosIngresosQuery.getMany();

            otrosIngresos.forEach(oi => {
                updateStat(getMonth(oi.fecha), oi.moneda, 'ingresos', Number(oi.monto));
            });

            // Calculate Utilidad
            stats.forEach(s => {
                s.bolivianos.utilidad = s.bolivianos.ingresos - s.bolivianos.egresos;
                s.dolares.utilidad = s.dolares.ingresos - s.dolares.egresos;
            });

        } catch (error) {
            console.error("Error calculating statistics:", error);
            // Return existing stats (likely zeros) instead of crashing
        }

        // Keep fallback return just in case, though it shouldn't be reached
        return stats;
    }
}
