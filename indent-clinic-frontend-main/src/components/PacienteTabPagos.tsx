import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Paciente, Pago, Proforma, HistoriaClinica } from '../types';
import { formatDate } from '../utils/dateUtils';
import { FileText, Plus, Printer, AlertCircle, DollarSign, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useClinica } from '../context/ClinicaContext';
import PagosForm from './PagosForm';
import ManualModal, { type ManualSection } from './ManualModal';

const PacienteTabPagos: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { clinicaActual } = useClinica();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [historias, setHistorias] = useState<HistoriaClinica[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
    const [selectedProformaId, setSelectedProformaId] = useState<number | null>(null);
    const [selectedMonto, setSelectedMonto] = useState<number | null>(null);
    const [selectedTratamientoId, setSelectedTratamientoId] = useState<number | null>(null);
    const [editingPagoId, setEditingPagoId] = useState<number | null>(null);
    const [isRefundMode, setIsRefundMode] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Historial de Pagos',
            content: 'En esta sección se listan todos los abonos realizados por el paciente. Puede ver el detalle de cada pago, imprimir recibos individuales o editar/eliminar registros si tiene los permisos necesarios.'
        },
        {
            title: 'Deudas Pendientes',
            content: 'Muestra los tratamientos que han sido concluidos pero que aún tienen un saldo por pagar. Puede realizar pagos directos a estos tratamientos usando el botón azul de dólar ($).'
        },
        {
            title: 'Adelantos y Pagos en Curso',
            content: 'Aquí se visualizan los abonos realizados a tratamientos que aún están en proceso (no terminados). Estos pagos se consideran adelantos hasta que el tratamiento se marque como finalizado.'
        },
        {
            title: 'Anticipos / Saldo a Favor',
            content: 'Si el monto total pagado por el paciente supera el costo de todos sus tratamientos iniciados, la diferencia aparecerá como un "Saldo a Favor" resaltado en azul, el cual puede ser devuelto si es necesario.'
        },
        {
            title: 'Impresión de Historial',
            content: 'El botón "Imprimir Historial" genera un estado de cuenta detallado agrupado por tratamientos, ideal para entregar al paciente como resumen de su inversión.'
        }
    ];

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userPermisos = user && Array.isArray(user.permisos) ? user.permisos : [];

    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [pacRes, pagosRes, pfRes, hcRes] = await Promise.allSettled([
                api.get<Paciente>(`/pacientes/${id}`),
                api.get(`/pagos/paciente/${id}`),
                api.get(`/proformas/paciente/${id}`),
                api.get(`/historia-clinica/paciente/${id}`)
            ]);
            if (pacRes.status === 'fulfilled') setPaciente(pacRes.value.data);
            if (pagosRes.status === 'fulfilled') setPagos(Array.isArray(pagosRes.value.data) ? pagosRes.value.data : []);
            if (pfRes.status === 'fulfilled') setProformas(Array.isArray(pfRes.value.data) ? pfRes.value.data : []);
            if (hcRes.status === 'fulfilled') setHistorias(Array.isArray(hcRes.value.data) ? hcRes.value.data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const sorted = [...pagos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);

    // NUEVO REQUERIMIENTO CRÍTICO: 
    // Los médicos a menudo crean MÚLTIPLES TIEMPOS (seguimientos) del mismo tratamiento por cada cita.
    // Si no consolidamos estas historias, el sistema facturará X veces el mismo precio de la misma corona.
    const historiasConsolidadas = useMemo(() => {
        const map = new Map<string, any>();
        historias.forEach(h => {
            const key = h.proformaDetalleId 
                ? `det_${h.proformaDetalleId}` 
                : `prof_${h.proformaId || 'gen'}_trat_${h.tratamiento}_pz_${h.pieza || ''}`;
                
            if (!map.has(key)) {
                map.set(key, { ...h, allIds: [h.id] });
            } else {
                const master = map.get(key);
                master.allIds.push(h.id);
                if (h.estadoTratamiento === 'terminado') {
                    master.estadoTratamiento = 'terminado';
                    if (new Date(h.fecha) > new Date(master.fecha)) master.fecha = h.fecha;
                }
                master.precio = Math.max(Number(master.precio || 0), Number(h.precio || 0));
                master.descuento = Math.max(Number(master.descuento || 0), Number(h.descuento || 0));
            }
        });
        return Array.from(map.values());
    }, [historias]);

    // Deuda por plan
    const { deudas, totalAdeudadoProformas } = useMemo(() => {
        const deudasCalculadas = proformas.map(pf => {
            const pagadoPlan = pagos.filter(p => {
                const pId = p.proformaId || p.proforma?.id;
                return pId && Number(pId) === Number(pf.id);
            }).reduce((s, p) => s + Number(p.monto), 0);
            const tratamientosPlan = historiasConsolidadas.filter(h => h.proformaId && Number(h.proformaId) === Number(pf.id));
            const finalTotal = tratamientosPlan.reduce((acc, t) => acc + (Number(t.precio) - (Number(t.descuento) || 0)), 0);
            const saldo = finalTotal - pagadoPlan;
            
            return { pf, pagadoPlan, saldo, finalTotal };
        }).filter(d => d.saldo > 0.01);
        
        return { 
            deudas: deudasCalculadas, 
            totalAdeudadoProformas: deudasCalculadas.reduce((s, d) => s + d.saldo, 0)
        };
    }, [proformas, pagos, historiasConsolidadas]);

    // 1. Pool global de todos los pagos del paciente
    const totalPagadoGlobal = pagos.reduce((s, p) => s + Number(p.monto), 0);

    // 2. Todos los tratamientos del paciente ordenados por prioridad (Terminados > Fecha)
    const allSortedTreatments = [...historiasConsolidadas]
        .sort((a, b) => {
            // Prioridad 1: Terminados primero
            if (a.estadoTratamiento === 'terminado' && b.estadoTratamiento !== 'terminado') return -1;
            if (a.estadoTratamiento !== 'terminado' && b.estadoTratamiento === 'terminado') return 1;
            
            // Prioridad 2: Orden cronológico
            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id;
        });

    const deudasTratamientos = useMemo(() => {
        // 1. Pool global de todos los pagos del paciente
        const explicitPaidMap: Record<number, number> = {};
        let currentGenericPool = 0;

        pagos.forEach(p => {
            const monto = Number(p.monto);
            // 1. Prioridad: Pagos vinculados específicamente a un ID de historia clínica
            if (p.historiaClinicaId) {
                const numId = Number(p.historiaClinicaId);
                explicitPaidMap[numId] = (explicitPaidMap[numId] || 0) + monto;
                return;
            }

            if ((p as any).historiaClinicaIds && (p as any).historiaClinicaIds.length > 0) {
                let ids: string[] = [];
                if (Array.isArray((p as any).historiaClinicaIds)) ids = (p as any).historiaClinicaIds.map(String);
                else if (typeof (p as any).historiaClinicaIds === 'string') ids = (p as any).historiaClinicaIds.split(',');

                if (ids.length > 0) {
                    const fraction = monto / ids.length;
                    ids.forEach(id => {
                        const numId = Number(id);
                        explicitPaidMap[numId] = (explicitPaidMap[numId] || 0) + fraction;
                    });
                    return;
                }
            }
            
            if ((p as any).tratamientosIds && (p as any).tratamientosIds.length > 0) {
                 let ids: string[] = [];
                 if (Array.isArray((p as any).tratamientosIds)) ids = (p as any).tratamientosIds.map(String);
                 else if (typeof (p as any).tratamientosIds === 'string') ids = (p as any).tratamientosIds.split(',');
     
                 if (ids.length > 0) {
                     const fraction = monto / ids.length;
                     ids.forEach(id => {
                         const numId = Number(id);
                         explicitPaidMap[numId] = (explicitPaidMap[numId] || 0) + fraction;
                     });
                     return;
                 }
            }

            currentGenericPool += monto;
        });

        // 2. Todos los tratamientos del paciente ordenados
        const sortedTreatments = [...historiasConsolidadas]
            .sort((a, b) => {
                if (a.estadoTratamiento === 'terminado' && b.estadoTratamiento !== 'terminado') return -1;
                if (a.estadoTratamiento !== 'terminado' && b.estadoTratamiento === 'terminado') return 1;
                return new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id;
            });

        return sortedTreatments.map(t => {
            const pf = proformas.find(p => p.id === t.proformaId || (t.proforma && p.id === t.proforma.id));
            const netPrice = Math.max(0, Number(t.precio) - (Number(t.descuento) || 0));
            
            let paid = 0;
            if (t.allIds && t.allIds.length > 0) {
                t.allIds.forEach((id: number) => {
                    paid += explicitPaidMap[id] || 0;
                });
            } else {
                paid = explicitPaidMap[t.id] || 0;
            }
            
            const remainingToPay = Math.max(0, netPrice - paid);
            if (remainingToPay > 0 && currentGenericPool > 0) {
                const genericPaid = Math.min(currentGenericPool, remainingToPay);
                currentGenericPool -= genericPaid;
                paid += genericPaid;
            }
            
            return {
                tratamiento: t,
                proforma: pf,
                netPrice,
                paid,
                saldo: Math.max(0, netPrice - paid)
            };
        });
    }, [pagos, historiasConsolidadas, proformas]);

    // Filtro para mostrar solo tratamientos TERMINADOS con saldo pendiente
    const deudasTratamientosFiltradas = deudasTratamientos.filter(d => 
        d.saldo > 0.01 && d.tratamiento.estadoTratamiento === 'terminado'
    );

    // Filtro para mostrar tratamientos EN CURSO / OTROS ESTADOS con saldo pendiente
    const deudasTratamientosEnCurso = deudasTratamientos.filter(d => 
        d.saldo > 0.01 && d.tratamiento.estadoTratamiento !== 'terminado'
    );

    // Deuda de todos los tratamientos iniciados (lo que realmente debe el paciente)
    const totalDebt = deudasTratamientos
        .reduce((s, d) => s + d.saldo, 0);

    // Anticipo / Saldo a Favor = dinero que el paciente pagó de MÁS respecto al costo total de TODOS sus tratamientos.
    // Si el paciente aún debe $, su saldo a favor es 0 aunque haya ciertos tratamientos terminados y pagados.
    const costoTotalTodos = (historiasConsolidadas || []).reduce((acc, h) => {
        const p = parseFloat(String(h.precio)) || 0;
        const d = parseFloat(String(h.descuento)) || 0;
        return acc + (p - d);
    }, 0);

    const anticipoDisponible = Math.max(0, totalPagadoGlobal - costoTotalTodos);

    const loadImage = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });

    const isPagoBloqueado = (fecha: string) => {
        // En este sistema, 'permisos' es una lista de RESTRICCIONES.
        // Si 'cerrar-caja' NO está en la lista, el usuario NO tiene restricción (es Admin/Manager).
        if (!userPermisos.includes('cerrar-caja')) return false;

        if (!clinicaActual?.fecha_cierre_caja) return false;
        return fecha <= clinicaActual.fecha_cierre_caja;
    };

    const generateReciboPDF = async (pago: Pago) => {
        const doc = new jsPDF();
        try {
            const logoSrc = clinicaActual?.logo || '';
            if (logoSrc) {
                const logo = await loadImage(logoSrc);
                doc.addImage(logo, 'PNG', 14, 10, 35, 14);
            }
        } catch { /* no logo */ }

        const pageWidth = doc.internal.pageSize.width;
        doc.setDrawColor(52, 152, 219);
        doc.setLineWidth(1);
        doc.line(15, 35, pageWidth - 15, 35);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('RECIBO DE PAGO', 105, 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        doc.setFillColor(248, 249, 250);
        doc.rect(15, 45, pageWidth - 30, 90, 'F');
        doc.setDrawColor(52, 152, 219);
        doc.rect(15, 45, pageWidth - 30, 90, 'S');

        doc.setFontSize(11);
        let y = 60;
        const xL = 25, xV = 75;

        const row = (label: string, value: string) => {
            doc.setFont('helvetica', 'bold'); doc.text(label, xL, y);
            doc.setFont('helvetica', 'normal'); doc.text(value, xV, y);
            y += 12;
        };

        row('Nº Recibo:', pago.recibo || String(pago.id));
        row('Fecha:', formatDate(pago.fecha));
        row('Recibí de:', paciente ? `${paciente.paterno} ${paciente.materno} ${paciente.nombre}`.toUpperCase() : 'N/A');
        row('La suma de:', pago.moneda === 'Dólares' ? `USD ${Number(pago.monto).toFixed(2)}` : `Bs ${Number(pago.monto).toFixed(2)}`);
        row('Por concepto de:', pago.proforma ? `Plan de Tratamiento #${pago.proforma.numero}` : 'Tratamiento Odontológico');
        row('Forma de Pago:', pago.formaPagoRel ? pago.formaPagoRel.forma_pago : pago.formaPago);
        if (pago.observaciones) row('Observaciones:', pago.observaciones);

        const ph = doc.internal.pageSize.height;
        doc.setDrawColor(0);
        doc.line(30, ph - 50, 90, ph - 50);
        doc.setFontSize(9);
        doc.text('Entregué Conforme', 60, ph - 45, { align: 'center' });
        doc.line(120, ph - 50, 180, ph - 50);
        doc.text('Recibí Conforme', 150, ph - 45, { align: 'center' });
        doc.text(clinicaActual?.nombre || 'CLÍNICA', 150, ph - 40, { align: 'center' });

        const blobUrl = URL.createObjectURL(doc.output('blob'));
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
            printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
        } else {
            window.open(blobUrl, '_blank');
        }
    };

    const handleDelete = async (idPago: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "¿Realmente desea eliminar este pago? Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos/${idPago}${user ? `?idUsuario=${user.id}` : ''}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El pago ha sido eliminado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchData();
            } catch (error) {
                console.error('Error al eliminar pago:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Hubo un problema al intentar eliminar el pago.'
                });
            }
        }
    };


    const flatTableRows = useMemo(() => {
        // 0. Si no hay datos suficientes, retornar vacío
        if (!pagos || pagos.length === 0 || !historias) return [];

        const sorted = [...pagos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        
        // 1. Agrupar pagos e historias por proforma para procesar FIFO una sola vez por plan
        const proformasData: Record<number, { 
            payments: Pago[], 
            treatments: any[], 
            capacities: number[] 
        }> = {};

        // Organizar datos base
        pagos.forEach(p => {
            const pid = p.proformaId || p.proforma?.id;
            if (!pid) return;
            const numId = Number(pid);
            if (!proformasData[numId]) {
                const trats = historias.filter(h => h.proformaId && Number(h.proformaId) === numId);
                const sortedTrats = [...trats].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id);
                
                proformasData[numId] = {
                    payments: pagos.filter(pago => {
                        const pgId = pago.proformaId || pago.proforma?.id;
                        return pgId && Number(pgId) === numId;
                    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id),
                    treatments: sortedTrats,
                    capacities: sortedTrats.map(t => Math.max(0, Number(t.precio) - (Number(t.descuento) || 0)))
                };
            }
        });

        // 2. Pre-calcular TODAS las asignaciones de una sola pasada por cada proforma (O(N))
        const allocationMap = new Map<number, { treatment: any, allocated: number, isFull?: boolean }[]>();
        
        Object.values(proformasData).forEach(data => {
            let tratIndex = 0;
            data.payments.forEach(pago => {
                let pAmount = Number(pago.monto);
                const covered: { treatment: any, allocated: number, isFull?: boolean }[] = [];


                // 1. Fase de Prioridad (Pagos Directos)
                const rawIds = (pago as any).tratamientosIds || (pago as any).historiaClinicaIds || [];
                const priorityIds: number[] = Array.isArray(rawIds) 
                    ? rawIds.map((id: any) => Number(id)) 
                    : String(rawIds).split(',').map((id: string) => Number(id.trim())).filter((id: number) => !isNaN(id));

                if (pago.historiaClinicaId) {
                    priorityIds.unshift(Number(pago.historiaClinicaId));
                }

                if (priorityIds.length > 0) {
                    priorityIds.forEach((targetId: number) => {
                        if (pAmount <= 0.001) return;
                        const tIdx = data.treatments.findIndex(t => t.id === targetId);
                        if (tIdx !== -1) {
                            const available = data.capacities[tIdx];
                            // Obligamos a aplicarlo si fue vinculado directamente, aunque la capacidad sea 0 por el rebalanceo
                            const take = Math.min(pAmount, Math.max(pAmount, available));
                            data.capacities[tIdx] -= Math.min(take, available);
                            pAmount -= take;
                            covered.push({ 
                                treatment: data.treatments[tIdx], 
                                allocated: take,
                                isFull: data.capacities[tIdx] <= 0.001
                            });
                        }
                    });
                }

                // 2. Fase de Fondo Común (FIFO)
                let safetyExit = 0;
                while (pAmount > 0.001 && tratIndex < data.treatments.length && safetyExit < 1000) {
                    safetyExit++;
                    const available = data.capacities[tratIndex];
                    if (available > 0.001) {
                        const take = Math.min(pAmount, available);
                        data.capacities[tratIndex] -= take;
                        pAmount -= take;
                        
                        const existing = covered.find(c => c.treatment.id === data.treatments[tratIndex].id);
                        if (existing) {
                            existing.allocated += take;
                            existing.isFull = data.capacities[tratIndex] <= 0.001;
                        } else {
                            covered.push({ 
                                treatment: data.treatments[tratIndex], 
                                allocated: take,
                                isFull: data.capacities[tratIndex] <= 0.001
                            });
                        }
                    }
                    if (data.capacities[tratIndex] <= 0.001) {
                        tratIndex++;
                    }
                }
                allocationMap.set(pago.id, covered);
            });
        });

        // 3. Aplanar las filas finales basadas en la pre-asignación
        const result: any[] = [];
        sorted.forEach(pago => {
            const covered = allocationMap.get(pago.id) || [];
            if (covered.length > 0) {
                covered.forEach(cov => {
                    const hc = cov.treatment;
                    result.push({
                        ...pago,
                        rowId: `${pago.id}-${hc.id}`,
                        tratamientoNombre: `${(hc.estadoTratamiento !== 'terminado' && !cov.isFull) ? '[ADELANTO] ' : ''}${hc.tratamiento}${hc.pieza ? ` (Pz. ${hc.pieza})` : ''}`,
                        tratamientoPrecio: hc.precio,
                        tratamientoDescuento: pago.descuento || hc.descuento || 0,
                        pagoMonto: cov.allocated,
                        tratamientoId: hc.id
                    });
                });
            } else {
                result.push({
                    ...pago,
                    rowId: `${pago.id}-gen`,
                    tratamientoNombre: Number(pago.monto) < 0 
                        ? 'Devolución a Paciente' 
                        : (pago.proforma ? `Plan de Tratamiento #${pago.proforma.numero}` : (pago as any).observaciones?.includes('TRANS') ? 'Transferencia de Saldo' : 'Pago General / Cuenta'),
                    tratamientoPrecio: '-',
                    tratamientoDescuento: pago.descuento || 0,
                    pagoMonto: pago.monto
                });
            }
        });

        return result;
    }, [pagos, historias]);

    const totalPages = Math.ceil(flatTableRows.length / itemsPerPage);
    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return flatTableRows.slice(start, start + itemsPerPage);
    }, [flatTableRows, currentPage, itemsPerPage]);

    // Reset to page 1 if data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [flatTableRows.length]);

    const handlePrintSummary = () => {
        try {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                document.body.removeChild(iframe);
                return;
            }

            // Group payments by treatment, initializing with ALL treatments from clinical history
            const treatmentGroups: Record<string, { 
                nombre: string, 
                costo: number | string, 
                pagos: any[] 
            }> = {};
            
            historiasConsolidadas.forEach(hc => {
                const key = `t_${hc.id}`;
                treatmentGroups[key] = {
                    nombre: `${hc.tratamiento}${hc.pieza ? ` (Pz. ${hc.pieza})` : ''}`,
                    costo: Number(hc.precio || 0) - Number(hc.descuento || 0),
                    pagos: []
                };
            });

            const generalPayments: any[] = [];

            flatTableRows.forEach(row => {
                if (row.tratamientoId) {
                    const key = `t_${row.tratamientoId}`;
                    if (treatmentGroups[key]) {
                        treatmentGroups[key].pagos.push(row);
                    } else {
                        // fallback if for some reason the ID wasn't in consolidated
                        generalPayments.push(row);
                    }
                } else {
                    generalPayments.push(row);
                }
            });

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Estado de Cuenta - ${paciente ? `${paciente.paterno} ${paciente.nombre}` : 'Paciente'}</title>
                    <style>
                        @page { size: A4; margin: 1.5cm; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; margin: 0; padding: 0; font-size: 10px; line-height: 1.4; }
                        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #7e22ce; padding-bottom: 10px; }
                        .header img { height: 50px; object-fit: contain; }
                        .header-info { text-align: right; }
                        .patient-box { background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px; }
                        .patient-box h2 { margin: 0 0 5px 0; color: #7e22ce; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                        
                        .treatment-section { margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
                        .treatment-header { background: #f3f4f6; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; }
                        .treatment-header h3 { margin: 0; color: #1f2937; font-size: 11px; font-weight: 800; }
                        .treatment-header .cost { color: #7e22ce; font-weight: 900; }
                        
                        table { width: 100%; border-collapse: collapse; }
                        th { background-color: #f9fafb; color: #6b7280; padding: 6px 10px; text-align: left; font-weight: bold; border-bottom: 1px solid #e5e7eb; font-size: 9px; text-transform: uppercase; }
                        td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
                        .text-right { text-align: right; }
                        
                        .totals-section { margin-top: 30px; margin-left: auto; width: 250px; padding: 12px; background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; }
                        .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; color: #4b5563; }
                        .total-final { font-weight: 900; font-size: 13px; border-top: 2px solid #7e22ce; margin-top: 8px; padding-top: 8px; color: ${totalDebt > 0 ? '#dc2626' : '#16a34a'}; }
                        
                        .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 8px; }
                        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(126, 34, 206, 0.05); font-weight: bold; pointer-events: none; z-index: -1; }
                    </style>
                </head>
                <body>
                    <div class="watermark">${clinicaActual?.nombre?.substring(0, 10).toUpperCase() || 'LENS'}</div>
                    <div class="header">
                        <img src="${clinicaActual?.logo || '/logo-curare.png'}" alt="Logo">
                        <div class="header-info">
                            <h1 style="margin:0; color:#7e22ce; font-size:20px;">ESTADO DE CUENTA</h1>
                            <p style="margin:2px 0 0 0;">Fecha: ${formatDate(new Date().toISOString())}</p>
                        </div>
                    </div>
                    
                    <div class="patient-box">
                        <h2>Datos del Paciente</h2>
                        <p style="margin:0; font-size:12px;"><strong>${paciente ? `${paciente.paterno} ${paciente.materno} ${paciente.nombre}`.toUpperCase() : 'N/A'}</strong></p>
                        ${paciente?.seguro_medico ? `<p style="margin:3px 0 0 0; color:#6b7280;">Seguro: ${paciente.seguro_medico}</p>` : ''}
                    </div>

                    ${Object.values(treatmentGroups).map(group => `
                        <div class="treatment-section">
                            <div class="treatment-header">
                                <h3>TRATAMIENTO: ${group.nombre.toUpperCase()}</h3>
                                <span class="cost">Costo: Bs. ${Number(group.costo).toFixed(2)}</span>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 15%">Fecha</th>
                                        <th style="width: 35%">Forma de Pago</th>
                                        <th style="width: 25%">Factura/Recibo</th>
                                        <th class="text-right" style="width: 25%">Monto Abonado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${group.pagos.length > 0 ? group.pagos.map(p => `
                                        <tr>
                                            <td>${formatDate(p.fecha)}</td>
                                            <td>${p.formaPagoRel ? p.formaPagoRel.forma_pago : p.formaPago || '-'}</td>
                                            <td>${p.factura ? `F:${p.factura}` : (p.recibo ? `R:${p.recibo}` : '-')}</td>
                                            <td class="text-right font-bold">Bs. ${Number(p.pagoMonto).toFixed(2)}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="4" style="text-align:center; color:#9ca3af; padding: 15px;">Sin abonos registrados</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    `).join('')}

                    ${generalPayments.length > 0 ? `
                        <div class="treatment-section">
                            <div class="treatment-header">
                                <h3>PAGOS GENERALES / ANTICIPOS</h3>
                                <span class="cost">-</span>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 15%">Fecha</th>
                                        <th style="width: 35%">Concepto</th>
                                        <th style="width: 25%">Factura/Recibo</th>
                                        <th class="text-right" style="width: 25%">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${generalPayments.map(p => `
                                        <tr>
                                            <td>${formatDate(p.fecha)}</td>
                                            <td>${p.tratamientoNombre}</td>
                                            <td>${p.factura ? `F:${p.factura}` : (p.recibo ? `R:${p.recibo}` : '-')}</td>
                                            <td class="text-right font-bold">Bs. ${Number(p.pagoMonto).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : ''}

                    <div class="totals-section">
                        <div class="total-row">
                            <span>Total Abonado:</span>
                            <strong>Bs. ${(totalPagadoGlobal || 0).toFixed(2)}</strong>
                        </div>
                        <div class="total-row">
                            <span>Total Tratamientos:</span>
                            <strong>Bs. ${(costoTotalTodos || 0).toFixed(2)}</strong>
                        </div>
                        <div class="total-row total-final">
                            <span>SALDO PENDIENTE:</span>
                            <span>Bs. ${(totalDebt || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Sistema de Gestión Clínicas Lens - Reporte Oficial</p>
                        <p>${clinicaActual?.nombre || 'CLÍNICA ODONTOLÓGICA'} ${clinicaActual?.direccion ? ` - ${clinicaActual.direccion}` : ''}</p>
                    </div>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            const doPrint = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(iframe)) document.body.removeChild(iframe);
                    }, 1000);
                }
            };

            const logo = doc.querySelector('img');
            if (logo && !logo.complete) {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            } else {
                doPrint();
            }
        } catch (error) {
            console.error('Error al imprimir:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Impresión',
                text: 'No se pudo generar el documento para impresión.'
            });
        }
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FileText size={22} className="text-emerald-500" />
                        Historial de Pagos
                    </h2>
                    {paciente && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {paciente.paterno} {paciente.materno} {paciente.nombre} — {pagos.length} pago(s)
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors self-center mr-2 flex-shrink-0"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    {pagos.length > 0 && (
                        <button
                            onClick={handlePrintSummary}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir Resumen de Pagos"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir Historial</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Summary bar */}
            {pagos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                        <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Total Pagado</div>
                        <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">Bs. {totalPagado.toFixed(2)}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 mb-1">Nº de Pagos</div>
                        <div className="text-xl font-black text-blue-700 dark:text-blue-300">{pagos.length}</div>
                    </div>
                    <div className={`rounded-xl p-4 border ${totalDebt > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'}`}>
                        <div className="text-xs font-bold uppercase text-red-600 dark:text-red-400 mb-1">Saldo Total Deuda Pendiente</div>
                        <div className="text-xl font-black text-red-700 dark:text-red-300">Bs. {totalDebt.toFixed(2)}</div>
                    </div>
                    {anticipoDisponible > 0.01 && (
                        <div className="bg-blue-600 dark:bg-blue-900 rounded-xl p-4 border border-blue-500 shadow-lg shadow-blue-500/20 flex justify-between items-center group overflow-hidden relative">
                            <div className="relative z-10">
                                <div className="text-xs font-bold uppercase text-blue-100 mb-1">Anticipo / Saldo a Favor</div>
                                <div className="text-2xl font-black text-white">Bs. {anticipoDisponible.toFixed(2)}</div>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingPagoId(null);
                                    setSelectedProformaId(null);
                                    setSelectedMonto(anticipoDisponible);
                                    setSelectedTratamientoId(null);
                                    setIsRefundMode(true);
                                    setIsModalPagoOpen(true);
                                }}
                                className="relative z-10 bg-white text-blue-600 hover:bg-blue-50 font-bold py-2 px-4 rounded-xl shadow-md transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <DollarSign size={16} />
                                Devolver
                            </button>
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all pointer-events-none"></div>
                        </div>
                    )}
                </div>
            )}

            {/* Deudas por tratamiento específico */}
            {deudasTratamientosFiltradas.length > 0 && (
                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
                    <h3 className="font-bold text-orange-700 dark:text-orange-400 mb-3 flex items-center gap-2">
                        <AlertCircle size={16} /> Deudas Pendientes por Tratamientos Terminados
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-orange-200 dark:border-orange-700/50 bg-white dark:bg-gray-800">
                        <table className="min-w-full divide-y divide-orange-200 dark:divide-orange-700/50">
                            <thead className="bg-orange-100 dark:bg-orange-900/30">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-orange-800 dark:text-orange-300">Plan</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-orange-800 dark:text-orange-300">Tratamiento</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-orange-800 dark:text-orange-300">Precio Neto</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-orange-800 dark:text-orange-300">Abonado</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-orange-800 dark:text-orange-300">Saldo</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-orange-800 dark:text-orange-300">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100 dark:divide-orange-800/20">
                                {deudasTratamientosFiltradas.map((deuda) => (
                                    <tr key={deuda.tratamiento.id} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/20">
                                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                            #{deuda.proforma?.numero}
                                            <div className="text-[10px] text-gray-500">{formatDate(deuda.tratamiento.fecha)}</div>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white max-w-[200px] truncate" title={deuda.tratamiento.tratamiento}>
                                            <div className="font-semibold">{deuda.tratamiento.tratamiento}</div>
                                            <div className="text-[10px] text-gray-500">{formatDate(deuda.tratamiento.fecha)}</div>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">Bs. {deuda.netPrice.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-emerald-600 dark:text-emerald-400">Bs. {deuda.paid.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm font-black text-right text-orange-600 dark:text-orange-400">Bs. {deuda.saldo.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <button 
                                                onClick={() => {
                                                    setEditingPagoId(null);
                                                    setSelectedProformaId(deuda.proforma?.id ?? null);
                                                    setSelectedMonto(deuda.saldo);
                                                    setSelectedTratamientoId(deuda.tratamiento.id);
                                                    setIsModalPagoOpen(true);
                                                }}
                                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Pagar"
                                            >
                                                <DollarSign size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Adelantos por tratamiento en curso */}
            {deudasTratamientosEnCurso.length > 0 && (
                <div className="mb-6 p-4 bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800 rounded-xl">
                    <h3 className="font-bold text-sky-700 dark:text-sky-400 mb-3 flex items-center gap-2">
                        <AlertCircle size={16} /> Adelantos / Pagos en Curso
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-sky-200 dark:border-sky-700/50 bg-white dark:bg-gray-800">
                        <table className="min-w-full divide-y divide-sky-200 dark:divide-sky-700/50">
                            <thead className="bg-sky-100 dark:bg-sky-900/30">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-sky-800 dark:text-sky-300">Plan</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-sky-800 dark:text-sky-300">Tratamiento</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-sky-800 dark:text-sky-300">Precio Neto</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-sky-800 dark:text-sky-300">Abonado (Adelantos)</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-sky-800 dark:text-sky-300">Saldo</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-sky-800 dark:text-sky-300">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-sky-100 dark:divide-sky-800/20">
                                {deudasTratamientosEnCurso.map((deuda) => (
                                    <tr key={deuda.tratamiento.id} className="hover:bg-sky-50/50 dark:hover:bg-sky-900/20">
                                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                            #{deuda.proforma?.numero}
                                            <div className="text-[10px] text-gray-500">{formatDate(deuda.tratamiento.fecha)}</div>
                                        </td>
                                        <td className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white max-w-[200px] truncate" title={deuda.tratamiento.tratamiento}>
                                            <div className="flex items-center gap-2">
                                                <span>{deuda.tratamiento.tratamiento}</span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-200 uppercase">
                                                    {deuda.tratamiento.estadoTratamiento.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-500">{formatDate(deuda.tratamiento.fecha)}</div>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300">Bs. {deuda.netPrice.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm text-right text-emerald-600 dark:text-emerald-400">Bs. {deuda.paid.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-sm font-black text-right text-sky-600 dark:text-sky-400">Bs. {deuda.saldo.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <button 
                                                onClick={() => {
                                                    setEditingPagoId(null);
                                                    setSelectedProformaId(deuda.proforma?.id ?? null);
                                                    setSelectedMonto(deuda.saldo);
                                                    setSelectedTratamientoId(deuda.tratamiento.id);
                                                    setIsModalPagoOpen(true);
                                                }}
                                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Adelantar Pago"
                                            >
                                                <DollarSign size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <FileText size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Sin pagos registrados para este paciente</p>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Mostrando {Math.min(flatTableRows.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(flatTableRows.length, currentPage * itemsPerPage)} de {flatTableRows.length} registros
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Fecha', 'Plan', 'Tratamiento', 'Precio', 'Descuento', 'Total (Abono)', 'Forma Pago', 'Recibo', 'Factura', 'Acciones'].map(h => (
                                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider ${['Precio', 'Descuento', 'Total (Abono)'].includes(h) ? 'text-right' : ''}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedRows.map((row) => (
                                <tr key={row.rowId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDate(row.fecha)}</td>
                                    <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400">{row.proforma ? `#${row.proforma.numero}` : '—'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[180px]">
                                        {row.tratamientoNombre}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                                        {row.tratamientoPrecio !== '-' ? `Bs. ${Number(row.tratamientoPrecio).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                                        {row.tratamientoDescuento !== '-' ? `Bs. ${Number(row.tratamientoDescuento).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">Bs. {Number(row.pagoMonto).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {row.formaPagoRel ? row.formaPagoRel.forma_pago : row.formaPago}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{row.recibo || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{row.factura || '—'}</td>
                                    <td className="px-4 py-3 flex gap-2">
                                        <button
                                            onClick={() => generateReciboPDF(row)}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center"
                                            title="Imprimir Recibo"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        
                                        <button
                                            onClick={() => {
                                                if (isPagoBloqueado(row.fecha)) return;
                                                setEditingPagoId(row.id);
                                                setSelectedTratamientoId(row.tratamientoId || null);
                                                setSelectedProformaId(row.proformaId || (row.proforma ? row.proforma.id : null));
                                                setIsModalPagoOpen(true);
                                            }}
                                            disabled={isPagoBloqueado(row.fecha)}
                                            className={`p-2 rounded-lg shadow-md transition-all duration-200 flex items-center justify-center ${
                                                isPagoBloqueado(row.fecha) 
                                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60' 
                                                : 'bg-amber-400 hover:bg-amber-500 text-white transform hover:-translate-y-0.5'
                                            }`}
                                            title={isPagoBloqueado(row.fecha) ? `Registro bloqueado por Cierre de Caja (${formatDate(clinicaActual?.fecha_cierre_caja || '')})` : "Editar Pago"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (isPagoBloqueado(row.fecha)) return;
                                                handleDelete(row.id);
                                            }}
                                            disabled={isPagoBloqueado(row.fecha)}
                                            className={`p-2 rounded-lg shadow-md transition-all duration-200 flex items-center justify-center ${
                                                isPagoBloqueado(row.fecha) 
                                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60' 
                                                : 'bg-red-500 hover:bg-red-600 text-white transform hover:-translate-y-0.5'
                                            }`}
                                            title={isPagoBloqueado(row.fecha) ? `Registro bloqueado por Cierre de Caja (${formatDate(clinicaActual?.fecha_cierre_caja || '')})` : "Eliminar Pago"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                        
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                // Simple logic to show current, first, last and neighbors
                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-lg font-bold transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'}`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="px-1">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg border ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>
                    </div>
                )}
                </>
            )}

            <PagosForm 
                isModal={true} 
                isOpen={isModalPagoOpen} 
                pacienteIdProp={Number(id)}
                pagoIdProp={editingPagoId}
                proformaIdProp={selectedProformaId}
                montoProp={selectedMonto}
                tratamientoIdProp={selectedTratamientoId}
                isRefund={isRefundMode}
                pacienteNombreProp={paciente ? `${paciente.paterno} ${paciente.materno} ${paciente.nombre}`.trim() : ''}
                onClose={() => {
                    setIsModalPagoOpen(false);
                    setIsRefundMode(false);
                    setEditingPagoId(null);
                    setSelectedProformaId(null);
                    setSelectedMonto(null);
                    setSelectedTratamientoId(null);
                }} 
                onSuccess={() => {
                    fetchData();
                    setIsModalPagoOpen(false);
                    setEditingPagoId(null);
                    setSelectedProformaId(null);
                    setSelectedMonto(null);
                    setSelectedTratamientoId(null);
                }}
            />
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Historial de Pagos"
                sections={manualSections}
            />
        </div>
    );
};

export default PacienteTabPagos;
