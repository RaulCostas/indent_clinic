import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';
import { useClinica } from '../context/ClinicaContext';
import { Printer, FileText, Lock, Tablet } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';


// Interfaces
interface Ingreso {
    id: number;
    fecha: string;
    monto: number;
    moneda: string;
    observaciones: string;
    paciente: { nombre: string; paterno: string; materno?: string };
    proforma?: { 
        numero: number;
        historiaClinica?: Array<{ tratamiento: string; pieza?: string; cancelado: number }>;
    };
    formaPagoRel?: { forma_pago: string };
    comisionTarjeta?: { redBanco: string; monto: number }; // Updated interface
    tc?: number; // Added TC
}

interface Egreso {
    id: number;
    fecha: string;

    detalle: string;
    monto: number;
    moneda: string;
    formaPago?: { forma_pago: string };
}

interface PagoDoctor {
    id: number;
    fecha: string;
    total: number;
    moneda: string;
    doctor: { nombre: string; paterno: string; materno?: string };
    formaPago: { forma_pago: string };
}

interface PagoLaboratorio {
    id: number;
    fecha: string;
    moneda: string;
    monto: number;
    trabajoLaboratorio: {
        laboratorio: { laboratorio: string };
        precioLaboratorio: { detalle: string; precio: number };
        paciente: { nombre: string; paterno: string; materno?: string };
        total: number;
    };
    formaPago: { forma_pago: string };
}

interface PagoPedido {
    id: number;
    fecha: string;
    monto: number;
    moneda: string;
    pedido: {
        proveedor: { nombre: string; proveedor: string };
        descripcion: string;
        Observaciones: string;
    };
    forma_pago?: string;
    factura?: string;
    recibo?: string;
}

interface PagoGastoFijo {
    id: number;
    fecha: string;
    monto: number;
    moneda: string;
    gastoFijo: { gasto_fijo: string };
    formaPago: { forma_pago: string };
    observaciones?: string;
}

const HojaDiaria: React.FC = () => {
    // State
    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
    const [calendarValue, setCalendarValue] = useState<any>(new Date());
    const [showManual, setShowManual] = useState(false);
    const { clinicaSeleccionada, clinicaActual, recargarClinicas } = useClinica();
    const [userPermisos, setUserPermisos] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const canCerrarCaja = !userPermisos.includes('cerrar-caja');
    const canCrucePagos = !userPermisos.includes('cruce-pagos');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (e) {}
        }
    }, []);


    const manualSections: ManualSection[] = [
        {
            title: 'Hoja Diaria',
            content: 'Resumen de movimientos financieros del día o rango de fechas seleccionado.'
        },
        {
            title: 'Pestañas',
            content: 'Navegue entre Ingresos, Egresos Diarios, Pagos a Doctores, Laboratorios y Gastos Fijos.'
        },
        {
            title: 'Búsqueda',
            content: 'Puede ver los datos de una fecha específica seleccionándola en el calendario, o buscar un rango de fechas usando el formulario de la derecha.'
        },
        {
            title: 'Impresión',
            content: 'Utilice el botón "Imprimir" para generar un reporte físico de la vista actual.'
        }];

    // Range Search State
    const [rangeStart, setRangeStart] = useState<string>('');
    const [rangeEnd, setRangeEnd] = useState<string>('');
    const [searchMode, setSearchMode] = useState<'single' | 'range'>('single');

    const [activeTab, setActiveTab] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    // Data States
    const [ingresos, setIngresos] = useState<Ingreso[]>([]);
    const [egresos, setEgresos] = useState<Egreso[]>([]);
    const [otrosIngresos, setOtrosIngresos] = useState<Egreso[]>([]); // Use Egreso interface as it has compatible structure
    const [pagosDoctores, setPagosDoctores] = useState<PagoDoctor[]>([]);
    const [pagosLaboratorios, setPagosLaboratorios] = useState<PagoLaboratorio[]>([]);
    const [pagosPedidos, setPagosPedidos] = useState<PagoPedido[]>([]);
    const [pagosGastosFijos, setPagosGastosFijos] = useState<PagoGastoFijo[]>([]);

    // Comparison State
    const [prevTotals, setPrevTotals] = useState<{
        ingresos: { bs: number; sus: number };
        egresos: { bs: number; sus: number };
        utilidad: { bs: number; sus: number };
    } | null>(null);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, selectedDate, rangeStart, rangeEnd, searchMode, clinicaSeleccionada]);



    const tabs = [
        {
            label: "Ingresos",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
            )
        },
        {
            label: "Otros Ingresos",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
            )
        },
        {
            label: "Egresos Diarios",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
            )
        },
        {
            label: "Pagos a Doctores",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            )
        },
        {
            label: "Pagos a Laboratorios",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v7.31"></path>
                    <path d="M14 2v7.31"></path>
                    <path d="M8.5 2h7"></path>
                    <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                </svg>
            )
        },
        {
            label: "Pagos de Pedidos",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
            )
        },
        {
            label: "Pagos Gastos Fijos",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <line x1="9" y1="22" x2="9" y2="22"></line>
                    <line x1="15" y1="22" x2="15" y2="22"></line>
                    <line x1="12" y1="18" x2="12" y2="18"></line>
                    <line x1="12" y1="14" x2="12" y2="14"></line>
                    <line x1="8" y1="10" x2="8" y2="10"></line>
                    <line x1="8" y1="6" x2="8" y2="6"></line>
                    <line x1="16" y1="10" x2="16" y2="10"></line>
                    <line x1="16" y1="6" x2="16" y2="6"></line>
                </svg>
            )
        }
    ];

    const calculateAllTotals = (
        ings: Ingreso[],
        egs: Egreso[],
        docs: PagoDoctor[],
        labs: PagoLaboratorio[],
        peds: PagoPedido[],
        gastos: PagoGastoFijo[],
        otrosIn: Egreso[]
    ) => {
        let ingresosBs = 0; let ingresosSus = 0;
        let egresosBs = 0; let egresosSus = 0;

        // Incomes from Patient Payments
        ings.forEach(item => {
            const paymentMethod = item.formaPagoRel?.forma_pago || '';
            let amount = Number(item.monto) || 0;
            if (paymentMethod.toLowerCase() === 'tarjeta' && item.comisionTarjeta?.monto) {
                const discountPercent = Number(item.comisionTarjeta.monto);
                if (!isNaN(discountPercent)) amount = amount - (amount * (discountPercent / 100));
            }
            const currency = item.moneda || 'Bolivianos';
            if (currency.toUpperCase().includes('BOLIVIANO') || currency.toUpperCase() === 'BS') { ingresosBs += amount; } else { ingresosSus += amount; }
        });

        // Other Incomes (New)
        otrosIn.forEach(item => {
            let amount = Number(item.monto) || 0;
            const currency = item.moneda || 'Bolivianos';
            if (currency.toUpperCase().includes('BOLIVIANO') || currency.toUpperCase() === 'BS') { ingresosBs += amount; } else { ingresosSus += amount; }
        });

        const addEgreso = (items: any[], type: string) => {
            items.forEach(item => {
                const amount = Number(type === 'doctor' ? item.total : item.monto) || 0;
                const currency = item.moneda || 'Bolivianos';
                if (currency.toUpperCase().includes('BOLIVIANO') || currency.toUpperCase() === 'BS') { egresosBs += amount; } else { egresosSus += amount; }
            });
        };

        addEgreso(egs, 'egreso');
        addEgreso(docs, 'doctor');
        addEgreso(labs, 'laboratorio');
        addEgreso(peds, 'pedido');
        addEgreso(gastos, 'gasto');

        return {
            ingresos: { bs: ingresosBs, sus: ingresosSus },
            egresos: { bs: egresosBs, sus: egresosSus },
            utilidad: { bs: ingresosBs - egresosBs, sus: ingresosSus - egresosSus }
        };
    };

    const fetchPreviousData = async (modeOverride?: 'single' | 'range') => {
        try {
            const currentMode = modeOverride || searchMode;
            let prevParams: any = {};
            if (currentMode === 'single') {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const d = new Date(year, month - 1, day);
                d.setDate(d.getDate() - 1);
                prevParams.fecha = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            } else {
                if (!rangeStart || !rangeEnd) return;
                const start = new Date(rangeStart); const end = new Date(rangeEnd);
                const diffTime = Math.abs(end.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - diffDays);
                const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
                prevParams.startDate = prevStart.toISOString().split('T')[0];
                prevParams.endDate = prevEnd.toISOString().split('T')[0];
            }
            if (clinicaSeleccionada !== null) { prevParams.clinicaId = clinicaSeleccionada; }
            const [resIngresos, resEgresos, resDoctores, resLaboratorios, resPedidos, resGastosFijos, resOtrosIngresos] = await Promise.all([
                api.get('/pagos', { params: prevParams }),
                api.get('/egresos', { params: { ...prevParams, limit: 1000 } }),
                api.get('/pagos-doctores', { params: prevParams }),
                api.get('/pagos-laboratorios', { params: prevParams }),
                api.get('/pagos-pedidos', { params: prevParams }),
                api.get('/pagos-gastos-fijos', { params: prevParams }),
                api.get('/otros-ingresos', { params: { ...prevParams, limit: 1000 } })
            ]);
            const totals = calculateAllTotals(
                resIngresos.data, resEgresos.data.data || [], resDoctores.data,
                resLaboratorios.data, resPedidos.data, resGastosFijos.data, resOtrosIngresos.data.data || []
            );
            setPrevTotals(totals);
        } catch (error) { console.error("Error fetching previous data:", error); }
    };

    const fetchAllData = async (modeOverride?: 'single' | 'range') => {
        setLoading(true);
        try {
            const currentMode = modeOverride || searchMode;
            const params: any = {};
            if (currentMode === 'single') {
                params.fecha = selectedDate;
            } else {
                if (!rangeStart || !rangeEnd) {
                    Swal.fire('Atención', 'Seleccione ambas fechas para el rango', 'warning');
                    setLoading(false);
                    return;
                }
                params.startDate = rangeStart;
                params.endDate = rangeEnd;
            }

            if (clinicaSeleccionada !== null) {
                params.clinicaId = clinicaSeleccionada;
            }

            const [
                resIngresos,
                resEgresos,
                resDoctores,
                resLaboratorios,
                resPedidos,
                resGastosFijos,
                resOtrosIngresos
            ] = await Promise.all([
                api.get('/pagos', { params }),
                api.get('/egresos', { params: { ...params, limit: 1000 } }),
                api.get('/pagos-doctores', { params }),
                api.get('/pagos-laboratorios', { params }),
                api.get('/pagos-pedidos', { params }),
                api.get('/pagos-gastos-fijos', { params }),
                api.get('/otros-ingresos', { params: { ...params, limit: 1000 } })
            ]);

            setIngresos(resIngresos.data);
            setEgresos(resEgresos.data.data || []);
            setOtrosIngresos(resOtrosIngresos.data.data || []);
            setPagosDoctores(resDoctores.data);
            setPagosLaboratorios(resLaboratorios.data);
            setPagosPedidos(resPedidos.data);
            setPagosGastosFijos(resGastosFijos.data);

        } catch (error) {
            console.error("Error fetching Hoja Diaria:", error);
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Effect for single date change
    useEffect(() => {
        if (searchMode === 'single') {
            fetchAllData();
            fetchPreviousData('single');
        } else if (searchMode === 'range' && rangeStart && rangeEnd) {
            fetchAllData('range');
            fetchPreviousData('range');
        }
    }, [selectedDate, searchMode, clinicaSeleccionada]);

    const handleCalendarChange = (value: any) => {
        setCalendarValue(value);
        if (value instanceof Date) {
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            setSelectedDate(`${year}-${month}-${day}`);
            setSearchMode('single'); // Switch to single mode
        }
    };

    const handleRangeSearch = () => {
        if (!rangeStart || !rangeEnd) {
            Swal.fire('Campos requeridos', 'Por favor seleccione fecha inicio y fecha fin', 'warning');
            return;
        }
        setSearchMode('range');
        fetchAllData('range');
    };

    const handleClearRange = () => {
        setRangeStart('');
        setRangeEnd('');
        setSearchMode('single');
        const today = getLocalDateString();
        setSelectedDate(today);
        setCalendarValue(new Date());
    };

    const handleCerrarCaja = async () => {
        if (!clinicaSeleccionada) {
            Swal.fire('Atención', 'Seleccione una clínica para cerrar caja', 'warning');
            return;
        }
        const result = await Swal.fire({
            title: '¿Cerrar Caja?',
            text: `Se bloquearán los registros de la fecha ${formatDate(selectedDate)} hacia atrás.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cerrar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.post(`/clinicas/${clinicaSeleccionada}/cerrar-caja`, { fecha: selectedDate });
                Swal.fire('Éxito', 'Caja cerrada correctamente', 'success');
                recargarClinicas();
            } catch (error) {
                console.error('Error cerrando caja:', error);
                Swal.fire('Error', 'No se pudo cerrar la caja', 'error');
            }
        }
    };

    const handleCrucePagos = async () => {
        if (!clinicaSeleccionada) {
            Swal.fire('Atención', 'Seleccione una clínica para el cruce de pagos', 'warning');
            return;
        }

        try {
            Swal.fire({
                title: 'Realizando cruce...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const res = await api.get('/pagos-tablet/cruce', { params: { clinicaId: clinicaSeleccionada, fecha: selectedDate } });
            const data = res.data;

            if (data.match_completo) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Cuadre Perfecto!',
                    text: 'Los pagos registrados en la tablet coinciden exactamente con la caja en todas las formas de pago.',
                });
            } else {
                let htmlDiff = `
                    <div style="text-align: left; font-size: 13px;">
                        <h4 style="margin: 10px 0; color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; font-size: 15px;">Resumen por Forma de Pago</h4>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 8px; border: 1px solid #e2e8f0;">Forma Pago</th>
                                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Caja (Rec.)</th>
                                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Tablet (Pac.)</th>
                                    <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Dif.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.detalles.map((d: any) => `
                                    <tr style="${!d.cuadra ? 'background: #fff1f2;' : ''}">
                                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${d.forma_pago}</td>
                                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${Number(d.recepcion).toFixed(2)}</td>
                                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${Number(d.tablet).toFixed(2)}</td>
                                        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${d.diferencia > 0 ? '#d33' : (d.diferencia < 0 ? '#e67e22' : '#059669')};">
                                            ${Number(d.diferencia).toFixed(2)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <h4 style="margin: 10px 0; color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; font-size: 15px;">Listado de Pacientes (Tablet)</h4>
                        <div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10;">
                                    <tr>
                                        <th style="padding: 10px 8px; border-bottom: 2px solid #e2e8f0; text-align: left;">Paciente</th>
                                        <th style="padding: 10px 8px; border-bottom: 2px solid #e2e8f0; text-align: center;">F. Pago</th>
                                        <th style="padding: 10px 8px; border-bottom: 2px solid #e2e8f0; text-align: right;">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.lista_tablet.length === 0 ? '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic;">Sin registros declarados por pacientes</td></tr>' : data.lista_tablet.map((pt: any) => `
                                        <tr style="border-bottom: 1px solid #f1f5f9; hover: background: #fdfdfd;">
                                            <td style="padding: 8px;">${pt.paciente}</td>
                                            <td style="padding: 8px; text-align: center;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${pt.forma_pago}</span></td>
                                            <td style="padding: 8px; text-align: right; font-weight: 700; color: #334155;">${Number(pt.monto).toFixed(2)} Bs.</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <p style="margin-top: 10px; font-size: 11px; color: #64748b; font-style: italic;">* Los datos de la tablet corresponden a lo que los pacientes declararon al momento de su atención.</p>
                    </div>
                `;

                Swal.fire({
                    icon: 'warning',
                    title: '<span style="color: #e11d48;">Descuadre en Pagos</span>',
                    html: htmlDiff,
                    width: '650px',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#3b82f6',
                    customClass: {
                        container: 'my-swal-container'
                    }
                });
            }
        } catch (error) {
            console.error('Error al realizar cruce:', error);
            Swal.fire('Error', 'No se pudo generar el cruce de pagos. Verifica la conexión.', 'error');
        }
    };

    // Helper function to generate filter info text
    const getFilterInfoText = (): string => {
        if (searchMode === 'single') {
            return `Fecha: ${formatDate(selectedDate)}`;
        } else {
            return `Rango: ${formatDate(rangeStart)} al ${formatDate(rangeEnd)}`;
        }
    };

    // Helper function to generate summary HTML
    const generateSummaryHTML = (summary: Summary): string => {
        const entries = Object.entries(summary);
        if (entries.length === 0) return '<p style="color: #666; font-style: italic;">No hay datos.</p>';

        const totalBs = entries.reduce((acc, [, totals]) => acc + totals.Bs, 0);
        const totalSus = entries.reduce((acc, [, totals]) => acc + totals.Sus, 0);

        return `
            <div style="background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <h3 style="font-size: 14px; font-weight: bold; color: #2c3e50; margin: 0 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Resumen por Forma de Pago</h3>
                ${entries.map(([method, totals]) => `
                    <div style="background-color: white; padding: 10px; margin-bottom: 8px; border-radius: 4px; border: 1px solid #e0e0e0;">
                        <div style="font-weight: bold; color: #333; margin-bottom: 5px;">${method}</div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <span>Bs: <strong style="color: #2563eb;">${totals.Bs.toFixed(2)}</strong></span>
                            <span>$us: <strong style="color: #16a34a;">${totals.Sus.toFixed(2)}</strong></span>
                        </div>
                    </div>
                `).join('')}
                <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid #333; font-weight: bold;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span>Total Bs: ${totalBs.toFixed(2)}</span>
                        <span>Total $us: ${totalSus.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const handlePrintIngresos = () => {
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

        const getCoveredTreatmentsForPaymentLocal = (r: any) => {
            if (!r.proforma || !r.proforma.historiaClinica || r.proforma.historiaClinica.length === 0) return [];
            
            if (r.historiaClinicaId || (r.tratamientosIds && r.tratamientosIds.length > 0)) {
                let ids: string[] = [];
                if (r.historiaClinicaId) ids.push(String(r.historiaClinicaId));
                
                if (Array.isArray(r.tratamientosIds)) {
                    ids = [...ids, ...r.tratamientosIds.map(String)];
                } else if (typeof r.tratamientosIds === 'string') {
                    ids = [...ids, ...r.tratamientosIds.split(',')];
                }

                if (ids.length > 0) {
                    return r.proforma.historiaClinica.filter((h: any) => ids.includes(String(h.id)));
                }
            }

            const tratamientosPlan = r.proforma.historiaClinica;
            const allPagos = r.proforma.pagos || [r];

            let discountFactor = 1;
            if (Number(r.proforma.sub_total) > 0) {
                discountFactor = Number(r.proforma.total) / Number(r.proforma.sub_total);
            }

            const sortedPagos = [...allPagos].sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id);
            const sortedTreatments = [...tratamientosPlan].sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id);

            // Capacidad de cada tratamiento basada en precio (heuristic for legacy payments)
            const capacities = sortedTreatments.map((t: any) => Number(t.precio) * discountFactor);

            let tratIndex = 0;

            for (const p of sortedPagos) {
                let pAmount = Number(p.monto);
                const thisPaymentCovers: any[] = [];

                while (pAmount > 0.01 && tratIndex < sortedTreatments.length) {
                    if (capacities[tratIndex] > 0.01) {
                        const filled = Math.min(pAmount, capacities[tratIndex]);
                        capacities[tratIndex] -= filled;
                        pAmount -= filled;
                        thisPaymentCovers.push(sortedTreatments[tratIndex]);
                    }
                    
                    if (capacities[tratIndex] <= 0.01) {
                        tratIndex++;
                    }
                }

                if (p.id === r.id) {
                    return Array.from(new Set(thisPaymentCovers));
                }
            }
            return r.proforma.historiaClinica.filter((h: any) => Number(h.cancelado) > 0);
        };

        const summary = calculateSummary(ingresos, 'ingreso');
        const filterInfo = getFilterInfoText();

        const logoUrl = clinicaActual?.logo || '/logo-curare.png';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ingresos - Hoja Diaria</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    @page { size: A4 landscape; margin: 1.5cm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                    
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                    .header img { height: 50px; object-fit: contain; }
                    
                    .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                    
                    .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                    .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                    
                    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                    th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    tr:last-child td { border-bottom: none; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    
                    .amount { font-weight: 700; color: #16a34a; text-align: right; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th { background-color: #3b82f6 !important; color: white !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title-container">
                        <img src="${logoUrl}" alt="Logo">
                        <h1>Ingresos - Hoja Diaria</h1>
                    </div>
                </div>
                
                <div class="report-info">
                    <div>Filtro: <span class="filter-badge">${filterInfo}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${searchMode === 'range' ? '<th style="width: 80px;">Fecha</th>' : ''}
                            <th>Paciente</th>
                            <th style="width: 80px;">Plan de Trat.</th>
                            <th>Tratamientos</th>
                            <th style="text-align: right; width: 100px;">Monto</th>
                            <th style="width: 100px;">Forma Pago</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${ingresos.length === 0 ? `
                            <tr><td colspan="${searchMode === 'range' ? 7 : 6}" style="text-align: center; font-style: italic; color: #64748b;">No hay registros</td></tr>
                        ` : ingresos.map(r => `
                            <tr>
                                ${searchMode === 'range' ? `<td>${formatDate(r.fecha.split('T')[0])}</td>` : ''}
                                <td style="font-weight: 600;">${[r.paciente?.nombre, r.paciente?.paterno, r.paciente?.materno].filter(Boolean).join(' ')}</td>
                                <td>${r.proforma?.numero || '<span style="color: #94a3b8; font-style: italic;">Generales</span>'}</td>
                                <td style="font-size: 9px; line-height: 1.1;">
                                    ${r.observaciones?.includes('Venta de productos') ? '<span style="color: #2563eb; font-weight: bold;">PRODUCTOS COMERCIALES</span>' :
                                        (getCoveredTreatmentsForPaymentLocal(r).length > 0
                                         ? getCoveredTreatmentsForPaymentLocal(r).map((h: any) => `<div>• ${h.tratamiento}${h.pieza ? ` (Pz. ${h.pieza})` : ''}</div>`).join('')
                                         : '-')}
                                </td>
                                <td class="amount">${formatMoney(Number(r.monto), r.moneda)}${r.moneda === 'Dólares' && r.tc ? ` (TC ${Number(r.tc).toFixed(2)})` : ''}</td>
                                <td>${r.formaPagoRel?.forma_pago || 'N/A'}${r.formaPagoRel?.forma_pago?.toLowerCase() === 'tarjeta' && r.comisionTarjeta?.redBanco ? ` (${r.comisionTarjeta.redBanco})` : ''}</td>
                                <td style="font-size: 10px;">${r.observaciones || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${generateSummaryHTML(summary)}
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        const logo = doc.querySelector('img');
        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

        if (logo) {
            if (logo.complete) {
                doPrint();
            } else {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            }
        } else {
            doPrint();
        }
    };

    const handlePrintEgresos = () => {
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

        const summary = calculateSummary(egresos, 'egreso');
        const filterInfo = getFilterInfoText();

        const logoUrl = clinicaActual?.logo || '/logo-curare.png';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Egresos Diarios - Hoja Diaria</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    @page { size: A4; margin: 1.5cm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                    
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                    .header img { height: 50px; object-fit: contain; }
                    
                    .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                    
                    .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                    .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                    
                    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                    th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    tr:last-child td { border-bottom: none; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    
                    .amount { font-weight: 700; color: #dc2626; text-align: right; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th { background-color: #3b82f6 !important; color: white !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title-container">
                        <img src="${logoUrl}" alt="Logo">
                        <h1>Egresos Diarios - Hoja Diaria</h1>
                    </div>
                </div>
                
                <div class="report-info">
                    <div>Filtro: <span class="filter-badge">${filterInfo}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${searchMode === 'range' ? '<th style="width: 100px;">Fecha</th>' : ''}
                            <th>Detalle</th>
                            <th style="text-align: right; width: 120px;">Monto</th>
                            <th style="width: 120px;">Forma Pago</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${egresos.length === 0 ? `
                            <tr><td colspan="${searchMode === 'range' ? 4 : 3}" style="text-align: center; font-style: italic; color: #64748b;">No hay registros</td></tr>
                        ` : egresos.map(r => `
                            <tr>
                                ${searchMode === 'range' ? `<td>${formatDate(r.fecha.split('T')[0])}</td>` : ''}
                                <td style="font-weight: 600;">${r.detalle}</td>
                                <td class="amount">${formatMoney(Number(r.monto), r.moneda)}</td>
                                <td>${r.formaPago?.forma_pago || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${generateSummaryHTML(summary)}
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        const logo = doc.querySelector('img');
        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

        if (logo) {
            if (logo.complete) {
                doPrint();
            } else {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            }
        } else {
            doPrint();
        }
    };

    const handlePrintDoctores = () => {
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

        const summary = calculateSummary(pagosDoctores, 'doctor');
        const filterInfo = getFilterInfoText();

        const logoUrl = clinicaActual?.logo || '/logo-curare.png';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pagos a Doctores - Hoja Diaria</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    @page { size: A4; margin: 1.5cm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                    
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                    .header img { height: 50px; object-fit: contain; }
                    
                    .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                    
                    .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                    .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                    
                    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                    th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    tr:last-child td { border-bottom: none; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    
                    .amount { font-weight: 700; color: #dc2626; text-align: right; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th { background-color: #3b82f6 !important; color: white !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title-container">
                        <img src="${logoUrl}" alt="Logo">
                        <h1>Pagos a Doctores - Hoja Diaria</h1>
                    </div>
                </div>
                
                <div class="report-info">
                    <div>Filtro: <span class="filter-badge">${filterInfo}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${searchMode === 'range' ? '<th style="width: 100px;">Fecha</th>' : ''}
                            <th>Doctor</th>
                            <th style="text-align: right; width: 120px;">Monto Total</th>
                            <th style="width: 120px;">Forma Pago</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagosDoctores.length === 0 ? `
                            <tr><td colspan="${searchMode === 'range' ? 4 : 3}" style="text-align: center; font-style: italic; color: #64748b;">No hay registros</td></tr>
                        ` : pagosDoctores.map(r => `
                            <tr>
                                ${searchMode === 'range' ? `<td>${formatDate(r.fecha.split('T')[0])}</td>` : ''}
                                <td style="font-weight: 600;">Dr. ${[r.doctor?.nombre, r.doctor?.paterno, r.doctor?.materno].filter(Boolean).join(' ')}</td>
                                <td class="amount">${formatMoney(Number(r.total), r.moneda)}</td>
                                <td>${r.formaPago?.forma_pago || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${generateSummaryHTML(summary)}
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        const logo = doc.querySelector('img');
        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

        if (logo) {
            if (logo.complete) {
                doPrint();
            } else {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            }
        } else {
            doPrint();
        }
    };

    const handlePrintLaboratorios = () => {
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

        const summary = calculateSummary(pagosLaboratorios, 'laboratorio');
        const filterInfo = getFilterInfoText();

        const logoUrl = clinicaActual?.logo || '/logo-curare.png';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pagos a Laboratorios - Hoja Diaria</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    @page { size: A4 landscape; margin: 1.5cm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                    
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                    .header img { height: 50px; object-fit: contain; }
                    
                    .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                    
                    .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                    .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                    
                    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                    th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    tr:last-child td { border-bottom: none; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    
                    .amount { font-weight: 700; color: #dc2626; text-align: right; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th { background-color: #3b82f6 !important; color: white !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title-container">
                        <img src="${logoUrl}" alt="Logo">
                        <h1>Pagos a Laboratorios - Hoja Diaria</h1>
                    </div>
                </div>
                
                <div class="report-info">
                    <div>Filtro: <span class="filter-badge">${filterInfo}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${searchMode === 'range' ? '<th style="width: 85px;">Fecha</th>' : ''}
                            <th>Laboratorio</th>
                            <th>Trabajo</th>
                            <th>Paciente</th>
                            <th style="text-align: right; width: 110px;">Monto</th>
                            <th style="width: 110px;">Forma Pago</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagosLaboratorios.length === 0 ? `
                            <tr><td colspan="${searchMode === 'range' ? 6 : 5}" style="text-align: center; font-style: italic; color: #64748b;">No hay registros</td></tr>
                        ` : pagosLaboratorios.map(r => `
                            <tr>
                                ${searchMode === 'range' ? `<td>${formatDate(r.fecha.split('T')[0])}</td>` : ''}
                                <td style="font-weight: 600;">${r.trabajoLaboratorio?.laboratorio?.laboratorio || '-'}</td>
                                <td>${r.trabajoLaboratorio?.precioLaboratorio?.detalle || '-'}</td>
                                <td>${[r.trabajoLaboratorio?.paciente?.nombre, r.trabajoLaboratorio?.paciente?.paterno, r.trabajoLaboratorio?.paciente?.materno].filter(Boolean).join(' ') || '-'}</td>
                                <td class="amount">${formatMoney(Number(r.monto), r.moneda)}</td>
                                <td>${r.formaPago?.forma_pago || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${generateSummaryHTML(summary)}
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        const logo = doc.querySelector('img');
        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

        if (logo) {
            if (logo.complete) {
                doPrint();
            } else {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            }
        } else {
            doPrint();
        }
    };

    const handlePrintPedidos = () => {
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

        const summary = calculateSummary(pagosPedidos, 'pedido');
        const filterInfo = getFilterInfoText();

        const logoUrl = clinicaActual?.logo || '/logo-curare.png';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pagos de Pedidos - Hoja Diaria</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    @page { size: A4 landscape; margin: 1.5cm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                    
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                    .header img { height: 50px; object-fit: contain; }
                    
                    .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                    
                    .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                    .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                    
                    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                    th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    tr:last-child td { border-bottom: none; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    
                    .amount { font-weight: 700; color: #dc2626; text-align: right; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th { background-color: #3b82f6 !important; color: white !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title-container">
                        <img src="${logoUrl}" alt="Logo">
                        <h1>Pagos de Pedidos - Hoja Diaria</h1>
                    </div>
                </div>
                
                <div class="report-info">
                    <div>Filtro: <span class="filter-badge">${filterInfo}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${searchMode === 'range' ? '<th style="width: 85px;">Fecha</th>' : ''}
                            <th>Proveedor</th>
                            <th style="width: 100px;">Factura</th>
                            <th style="width: 100px;">Recibo</th>
                            <th style="text-align: right; width: 110px;">Monto</th>
                            <th style="width: 110px;">Forma Pago</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagosPedidos.length === 0 ? `
                            <tr><td colspan="${searchMode === 'range' ? 6 : 5}" style="text-align: center; font-style: italic; color: #64748b;">No hay registros</td></tr>
                        ` : pagosPedidos.map(r => `
                            <tr>
                                ${searchMode === 'range' ? `<td>${formatDate(r.fecha.split('T')[0])}</td>` : ''}
                                <td style="font-weight: 600;">${r.pedido?.proveedor?.proveedor || '-'}</td>
                                <td>${r.factura || '-'}</td>
                                <td>${r.recibo || '-'}</td>
                                <td class="amount">${formatMoney(Number(r.monto), 'Bolivianos')}</td>
                                <td>${r.forma_pago || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${generateSummaryHTML(summary)}
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        const logo = doc.querySelector('img');
        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

        if (logo) {
            if (logo.complete) {
                doPrint();
            } else {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            }
        } else {
            doPrint();
        }
    };

    const handlePrintGastosFijos = () => {
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

        const summary = calculateSummary(pagosGastosFijos, 'gasto');
        const filterInfo = getFilterInfoText();

        const logoUrl = clinicaActual?.logo || '/logo-curare.png';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pagos Gastos Fijos - Hoja Diaria</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    @page { size: A4 landscape; margin: 1.5cm; }
                    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                    
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                    .header img { height: 50px; object-fit: contain; }
                    
                    .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                    
                    .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                    .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                    
                    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                    th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                    tr:last-child td { border-bottom: none; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    
                    .amount { font-weight: 700; color: #dc2626; text-align: right; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th { background-color: #3b82f6 !important; color: white !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="title-container">
                        <img src="${logoUrl}" alt="Logo">
                        <h1>Pagos Gastos Fijos - Hoja Diaria</h1>
                    </div>
                </div>
                
                <div class="report-info">
                    <div>Filtro: <span class="filter-badge">${filterInfo}</span></div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${searchMode === 'range' ? '<th style="width: 85px;">Fecha</th>' : ''}
                            <th>Gasto</th>
                            <th style="text-align: right; width: 110px;">Monto</th>
                            <th style="width: 110px;">Forma Pago</th>
                            <th>Observaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pagosGastosFijos.length === 0 ? `
                            <tr><td colspan="${searchMode === 'range' ? 5 : 4}" style="text-align: center; font-style: italic; color: #64748b;">No hay registros</td></tr>
                        ` : pagosGastosFijos.map(r => `
                            <tr>
                                ${searchMode === 'range' ? `<td>${formatDate(r.fecha.split('T')[0])}</td>` : ''}
                                <td style="font-weight: 600;">${r.gastoFijo?.gasto_fijo || '-'}</td>
                                <td class="amount">${formatMoney(Number(r.monto), r.moneda)}</td>
                                <td>${r.formaPago?.forma_pago || '-'}</td>
                                <td style="font-size: 10px;">${r.observaciones || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${generateSummaryHTML(summary)}
            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        const logo = doc.querySelector('img');
        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

        if (logo) {
            if (logo.complete) {
                doPrint();
            } else {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            }
        } else {
            doPrint();
        }
    };

    const handlePrint = () => {
        switch (activeTab) {
            case 0:
                handlePrintIngresos();
                break;
            case 1:
                handlePrintEgresos();
                break;
            case 2:
                handlePrintDoctores();
                break;
            case 3:
                handlePrintLaboratorios();
                break;
            case 4:
                handlePrintPedidos();
                break;
            case 5:
                handlePrintGastosFijos();
                break;
            default:
                window.print();
        }
    };

    const formatMoney = (amount: number, currency: string = 'Bolivianos') => {
        return amount.toLocaleString('es-BO', {
            style: 'currency',
            currency: currency === 'Bolivianos' ? 'BOB' : 'USD'
        });
    };

    // Summary Engine
    type Summary = Record<string, { Bs: number; Sus: number }>;

    const calculateSummary = (data: any[], type: 'ingreso' | 'egreso' | 'doctor' | 'laboratorio' | 'pedido' | 'gasto'): Summary => {
        const summary: Summary = {};

        data.forEach(item => {
            let paymentMethod = 'Desconocido';
            let amount = 0;
            let currency = 'Bolivianos';

            switch (type) {
                case 'ingreso':
                    paymentMethod = item.formaPagoRel?.forma_pago || 'N/A';
                    amount = Number(item.monto) || 0;

                    // APPLY DISCOUNT FOR TARJETA
                    if (paymentMethod.toLowerCase() === 'tarjeta' && item.comisionTarjeta?.monto) {
                        const discountPercent = Number(item.comisionTarjeta.monto);
                        if (!isNaN(discountPercent)) {
                            // Subtract discount (e.g., 3%). Amount = Amount - (Amount * 0.03)
                            amount = amount - (amount * (discountPercent / 100));
                        }
                    }

                    currency = item.moneda || 'Bolivianos';
                    break;
                case 'egreso':
                    paymentMethod = item.formaPago?.forma_pago || 'N/A';
                    amount = Number(item.monto) || 0;
                    currency = item.moneda || 'Bolivianos';
                    break;
                case 'doctor':
                    paymentMethod = item.formaPago?.forma_pago || 'N/A';
                    amount = Number(item.total) || 0;
                    currency = item.moneda || 'Bolivianos';
                    break;
                case 'laboratorio':
                    paymentMethod = item.formaPago?.forma_pago || 'N/A';
                    amount = Number(item.monto) || 0;
                    currency = item.moneda || 'Bolivianos';
                    break;
                case 'pedido':
                    paymentMethod = item.forma_pago || 'N/A';
                    amount = Number(item.monto) || 0;
                    currency = item.moneda || 'Bolivianos';
                    break;
                case 'gasto':
                    paymentMethod = item.formaPago?.forma_pago || 'N/A';
                    amount = Number(item.monto) || 0;
                    currency = item.moneda || 'Bolivianos';
                    break;
            }

            if (!summary[paymentMethod]) {
                summary[paymentMethod] = { Bs: 0, Sus: 0 };
            }

            const currUpper = currency.toUpperCase();
            if (currUpper.includes('BOLIVIANO') || currUpper === 'BS') {
                summary[paymentMethod].Bs += amount;
            } else {
                summary[paymentMethod].Sus += amount;
            }
        });

        return summary;
    };

    const renderSummary = (summary: Summary) => (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm w-full md:w-80 flex-shrink-0 text-gray-800 dark:text-gray-200">
            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 border-b dark:border-gray-700 pb-2">Resumen</h3>
            {Object.keys(summary).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No hay datos.</p>
            ) : (
                <ul className="space-y-3">
                    {Object.entries(summary).map(([method, totals], idx) => (
                        <li key={idx} className="flex flex-col bg-white dark:bg-gray-700 p-3 rounded border border-gray-100 dark:border-gray-600 shadow-sm">
                            <span className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{method}</span>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Bs: <span className="font-bold text-blue-600 dark:text-blue-400">{totals.Bs.toFixed(2)}</span></span>
                                <span className="text-gray-600 dark:text-gray-300">Sus: <span className="font-bold text-green-600 dark:text-green-400">{totals.Sus.toFixed(2)}</span></span>
                            </div>
                        </li>
                    ))}
                    <li className="pt-2 mt-2 border-t dark:border-gray-600 flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">Total General</span>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-800 dark:text-gray-300">Bs: {Object.values(summary).reduce((acc, v) => acc + v.Bs, 0).toFixed(2)}</span>
                            <span className="text-gray-800 dark:text-gray-300">Sus: {Object.values(summary).reduce((acc, v) => acc + v.Sus, 0).toFixed(2)}</span>
                        </div>
                    </li>
                </ul>
            )}
        </div>
    );

    const renderTableWithSummary = (
        columns: { header: string, accessor: (row: any) => React.ReactNode }[],
        data: any[],
        type: 'ingreso' | 'egreso' | 'doctor' | 'laboratorio' | 'pedido' | 'gasto'
    ) => {
        const summary = calculateSummary(data, type);
        const total = data.length;
        const totalPages = Math.ceil(total / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

        return (
            <div className="flex flex-col gap-4">
                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {total === 0 ? 0 : startIndex + 1} - {Math.min(currentPage * itemsPerPage, total)} de {total} registros
                </div>
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-grow overflow-x-auto">
                        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg">
                            <thead>
                                <tr className="bg-blue-600 dark:bg-blue-900/50 text-white uppercase text-sm leading-normal">
                                    {columns.map((col, idx) => (
                                        <th key={idx} className="p-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{col.header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-gray-600 dark:text-gray-300 text-sm font-light">
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length} className="py-3 px-6 text-center italic text-gray-400 dark:text-gray-500">No hay registros para esta {searchMode === 'single' ? 'fecha' : 'rango'}.</td>
                                    </tr>
                                ) : (
                                    paginatedData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            {columns.map((col, colIdx) => (
                                                <td key={colIdx} className="p-3 text-gray-800 dark:text-gray-300 font-medium whitespace-nowrap">
                                                    {col.accessor(row)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        
                        <div className="no-print">
                            <Pagination 
                                currentPage={currentPage} 
                                totalPages={totalPages} 
                                onPageChange={(page) => setCurrentPage(page)} 
                            />
                        </div>
                    </div>
                    {renderSummary(summary)}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        const getDateColumn = () => searchMode === 'range'
            ? [{
                header: 'Fecha',
                accessor: (r: any) => formatDate(r.fecha)
            }]
            : [];

        switch (activeTab) {
            case 0: // Ingresos
                return renderTableWithSummary([
                    ...getDateColumn(),
                    { header: 'Paciente', accessor: r => [r.paciente?.nombre, r.paciente?.paterno, r.paciente?.materno].filter(Boolean).join(' ') || '-' },
                    { header: 'Plan de Trat.', accessor: r => r.proforma?.numero || (r.observaciones?.includes('Venta de productos') ? 'VENTA COMERCIAL' : 'Generales') },
                    { 
                        header: 'Tratamientos', 
                        accessor: r => {
                            if (r.observaciones?.includes('Venta de productos')) {
                                return <span className="text-blue-600 font-bold text-[10px]">PRODUCTOS COMERCIALES</span>;
                            }
                            if (!r.proforma?.historiaClinica) return '-';
                            
                            const getCoveredTreatmentsForPaymentLocal = (r: any) => {
                                if (!r.proforma || !r.proforma.historiaClinica || r.proforma.historiaClinica.length === 0) return [];
                                
            if (r.historiaClinicaId || (r.tratamientosIds && r.tratamientosIds.length > 0)) {
                let ids: string[] = [];
                if (r.historiaClinicaId) ids.push(String(r.historiaClinicaId));

                if (Array.isArray(r.tratamientosIds)) {
                    ids = [...ids, ...r.tratamientosIds.map(String)];
                } else if (typeof r.tratamientosIds === 'string') {
                    ids = [...ids, ...r.tratamientosIds.split(',')];
                }

                if (ids.length > 0) {
                    return r.proforma.historiaClinica.filter((h: any) => ids.includes(String(h.id)));
                }
            }

                                const tratamientosPlan = r.proforma.historiaClinica;
                                const allPagos = r.proforma.pagos || [r];

                                let discountFactor = 1;
                                if (Number(r.proforma.sub_total) > 0) {
                                    discountFactor = Number(r.proforma.total) / Number(r.proforma.sub_total);
                                }

                                const sortedPagos = [...allPagos].sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id);
                                const sortedTreatments = [...tratamientosPlan].sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id);

                                // Capacity heuristic based on price for legacy payments
                                const capacities = sortedTreatments.map((t: any) => Number(t.precio) * discountFactor);

                                let tratIndex = 0;

                                for (const p of sortedPagos) {
                                    let pAmount = Number(p.monto);
                                    const thisPaymentCovers: any[] = [];

                                    while (pAmount > 0.01 && tratIndex < sortedTreatments.length) {
                                        if (capacities[tratIndex] > 0.01) {
                                            const filled = Math.min(pAmount, capacities[tratIndex]);
                                            capacities[tratIndex] -= filled;
                                            pAmount -= filled;
                                            thisPaymentCovers.push(sortedTreatments[tratIndex]);
                                        }
                                        
                                        if (capacities[tratIndex] <= 0.01) {
                                            tratIndex++;
                                        }
                                    }

                                    if (p.id === r.id) {
                                        return Array.from(new Set(thisPaymentCovers));
                                    }
                                }
                                return r.proforma.historiaClinica.filter((h: any) => Number(h.cancelado) > 0);
                            };

                            const coveredItems = getCoveredTreatmentsForPaymentLocal(r);
                            if (coveredItems.length === 0) return '-';
                            return (
                                <div className="flex flex-col gap-0.5 text-[9px] leading-tight py-1">
                                    {coveredItems.map((h: any, i: number) => (
                                        <div key={i} className="whitespace-nowrap">
                                            • {h.tratamiento}{h.pieza ? ` (Pz. ${h.pieza})` : ''}
                                        </div>
                                    ))}
                                </div>
                            );
                        }
                    },
                    {
                        header: 'Monto',
                        accessor: r => {
                            const isDollar = r.moneda === 'Dólares';
                            return (
                                <span className="font-bold text-green-600 dark:text-green-400">
                                    {formatMoney(Number(r.monto), r.moneda)}
                                    {isDollar && r.tc && ` (TC. ${Number(r.tc).toFixed(2)})`}
                                </span>
                            );
                        }
                    },
                    {
                        header: 'Forma Pago',
                        accessor: r => {
                            const method = r.formaPagoRel?.forma_pago || 'N/A';
                            // Show Bank for Tarjeta
                            if (method.toLowerCase() === 'tarjeta' && r.comisionTarjeta?.redBanco) {
                                return `${method} (${r.comisionTarjeta.redBanco})`;
                            }
                            return method;
                        }
                    },
                    { header: 'Observaciones', accessor: r => r.observaciones || '-' },
                ], ingresos, 'ingreso');
            case 1: // Otros Ingresos
                return renderTableWithSummary([
                    ...getDateColumn(),
                    { header: 'Detalle', accessor: r => r.detalle },
                    { header: 'Monto', accessor: r => <span className="font-bold text-green-600 dark:text-green-400">{formatMoney(Number(r.monto), r.moneda)}</span> },
                    { header: 'Forma Pago', accessor: r => r.formaPago?.forma_pago || 'N/A' },
                ], otrosIngresos, 'egreso');
            case 2: // Egresos Diarios
                return renderTableWithSummary([
                    ...getDateColumn(),
                    { header: 'Detalle', accessor: r => r.detalle },
                    { header: 'Monto', accessor: r => <span className="font-bold text-red-600 dark:text-red-400">{formatMoney(Number(r.monto), r.moneda)}</span> },
                    { header: 'Forma Pago', accessor: r => r.formaPago?.forma_pago || 'N/A' },
                ], egresos, 'egreso');
            case 3: // Pagos Doctores
                return renderTableWithSummary([
                    ...getDateColumn(),
                    { header: 'Doctor', accessor: r => `Dr. ${[r.doctor?.nombre, r.doctor?.paterno, r.doctor?.materno].filter(Boolean).join(' ')}` },
                    { header: 'Monto Total', accessor: r => <span className="font-bold text-red-600 dark:text-red-400">{formatMoney(Number(r.total), r.moneda)}</span> },
                    { header: 'Forma Pago', accessor: r => r.formaPago?.forma_pago || 'N/A' },
                ], pagosDoctores, 'doctor');
            case 4: // Pagos Laboratorios
                return renderTableWithSummary([
                    ...getDateColumn(),
                    { header: 'Laboratorio', accessor: r => r.trabajoLaboratorio?.laboratorio?.laboratorio || '-' },
                    { header: 'Trabajo', accessor: r => r.trabajoLaboratorio?.precioLaboratorio?.detalle || '-' },
                    { header: 'Paciente', accessor: r => [r.trabajoLaboratorio?.paciente?.nombre, r.trabajoLaboratorio?.paciente?.paterno, r.trabajoLaboratorio?.paciente?.materno].filter(Boolean).join(' ') || '-' },
                    { header: 'Monto', accessor: r => <span className="font-bold text-red-600 dark:text-red-400">{formatMoney(Number(r.monto), r.moneda)}</span> },
                    { header: 'Forma Pago', accessor: r => r.formaPago?.forma_pago || '-' },
                ], pagosLaboratorios, 'laboratorio');
            case 5: // Pagos Pedidos
                return renderTableWithSummary([
                    ...getDateColumn(),
                    { header: 'Proveedor', accessor: r => r.pedido?.proveedor?.proveedor || '-' },
                    { header: 'Factura', accessor: r => r.factura || '-' },
                    { header: 'Recibo', accessor: r => r.recibo || '-' },
                    { header: 'Monto', accessor: r => <span className="font-bold text-red-600 dark:text-red-400">{formatMoney(Number(r.monto), 'Bolivianos')}</span> },
                    { header: 'Forma Pago', accessor: r => r.forma_pago || '-' },
                ], pagosPedidos, 'pedido');
            case 6: // Gastos Fijos
                return renderTableWithSummary([
                    ...getDateColumn(),
                    { header: 'Gasto', accessor: r => r.gastoFijo?.gasto_fijo || '-' },
                    { header: 'Monto', accessor: r => <span className="font-bold text-red-600 dark:text-red-400">{formatMoney(Number(r.monto), r.moneda)}</span> },
                    { header: 'Forma Pago', accessor: r => r.formaPago?.forma_pago || '-' },
                    { header: 'Observaciones', accessor: r => r.observaciones || '-' },
                ], pagosGastosFijos, 'gasto');
            default:
                return null;
        }
    };


    const currentTotals = calculateAllTotals(ingresos, egresos, pagosDoctores, pagosLaboratorios, pagosPedidos, pagosGastosFijos, otrosIngresos);

    return (
        <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col text-gray-800 dark:text-white">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <FileText className="text-blue-600" size={32} />
                        Hoja Diaria
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen diario de movimientos financieros</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors self-center mr-2"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                        title="Imprimir"
                    >
                        <Printer size={18} />
                        <span className="text-sm">Imprimir</span>
                    </button>
                    {canCrucePagos && searchMode === 'single' && (
                        <button
                            onClick={handleCrucePagos}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Cruce Pagos Tablet"
                        >
                            <Tablet size={18} />
                            <span className="text-sm hidden sm:inline">Cruce Pagos</span>
                        </button>
                    )}
                    {canCerrarCaja && searchMode === 'single' && (
                        <button
                            onClick={handleCerrarCaja}
                            disabled={!!(clinicaActual?.fecha_cierre_caja && selectedDate <= clinicaActual.fecha_cierre_caja)}
                            className={`font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 ${clinicaActual?.fecha_cierre_caja && selectedDate <= clinicaActual.fecha_cierre_caja ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-75' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                            title={clinicaActual?.fecha_cierre_caja && selectedDate <= clinicaActual.fecha_cierre_caja ? "Caja Cerrada" : "Cerrar Caja"}
                        >
                            <Lock size={18} />
                            {clinicaActual?.fecha_cierre_caja && selectedDate <= clinicaActual.fecha_cierre_caja ? 'Caja Cerrada' : 'Cerrar Caja'}
                        </button>
                    )}
                    <div className="text-xl font-semibold text-gray-600 dark:text-gray-300">
                        {searchMode === 'single' ? (
                            <>Fecha: <span className="text-blue-600 dark:text-blue-400">{formatDate(selectedDate)}</span></>
                        ) : (
                            <>Rango: <span className="text-blue-600 dark:text-blue-400">{formatDate(rangeStart)}</span> al <span className="text-blue-600 dark:text-blue-400">{formatDate(rangeEnd)}</span></>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                {/* Tabs Navigation */}
                <div className="no-print flex flex-wrap border-b border-gray-200 dark:border-gray-600 mb-5 bg-white dark:bg-gray-800 rounded-t-lg pt-2 px-2">
                    {tabs.map((tab, idx) => (
                        <div
                            key={idx}
                            onClick={() => setActiveTab(idx)}
                            className={`px-5 py-2.5 cursor-pointer border-b-4 flex items-center gap-2 transition-all duration-200 text-base ${activeTab === idx
                                ? 'border-blue-500 text-blue-500 font-bold dark:border-blue-400 dark:text-blue-400'
                                : 'border-transparent text-gray-600 dark:text-gray-400 font-normal hover:text-blue-500 dark:hover:text-blue-300'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8 flex-grow overflow-hidden" id="printable-section">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
                    </div>
                ) : (
                    renderContent()
                )}
            </div>

            {/* Bottom Section: Calendar + Range Search */}
            <div className="flex flex-col md:flex-row items-stretch justify-center mt-auto gap-6">

                {/* 1. Calendar (Single Date) */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md w-full md:w-[350px]">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-4 text-center">Seleccionar Fecha</h3>
                    <div className="flex justify-center calendar-container">
                        <Calendar
                            onChange={handleCalendarChange}
                            value={calendarValue}
                            locale="es-ES"
                        />
                    </div>
                </div>

                {/* 2. Range Search (Right Side) */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col justify-center w-full md:w-[350px]">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">Búsqueda por Rango</h3>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    type="date"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    type="date"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleRangeSearch}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Buscar por Rango
                        </button>

                        {(searchMode === 'range' || rangeStart || rangeEnd) && (
                            <button
                                onClick={handleClearRange}
                                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 mt-1 flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Limpiar / Cancelar
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Utilidad Card & Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col w-full md:w-[400px]">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-4 border-b dark:border-gray-700 pb-2">Resumen de Utilidad</h3>
                    <div className="flex flex-col gap-2 flex-grow">
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Ingresos:</span>
                            <div className="flex flex-col text-right">
                                <span className="font-bold text-green-600 dark:text-green-400">{currentTotals.ingresos.bs.toFixed(2)} Bs</span>
                                <span className="text-xs text-green-500">{currentTotals.ingresos.sus.toFixed(2)} $us</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Egresos:</span>
                            <div className="flex flex-col text-right">
                                <span className="font-bold text-red-600 dark:text-red-400">{currentTotals.egresos.bs.toFixed(2)} Bs</span>
                                <span className="text-xs text-red-500">{currentTotals.egresos.sus.toFixed(2)} $us</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-t-2 dark:border-gray-600 pt-2 font-bold">
                            <span className="text-sm text-gray-800 dark:text-gray-200">Utilidad Neta:</span>
                            <div className="flex flex-col text-right">
                                <span className={currentTotals.utilidad.bs >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}>{currentTotals.utilidad.bs.toFixed(2)} Bs</span>
                                <span className={`text-xs ${currentTotals.utilidad.sus >= 0 ? "text-blue-500" : "text-red-400"}`}>{currentTotals.utilidad.sus.toFixed(2)} $us</span>
                            </div>
                        </div>

                        {/* Chart */}
                        {prevTotals && (
                            <div className="mt-4 pt-4 border-t dark:border-gray-700 flex-grow" style={{ height: 120 }}>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center">Comparación con {searchMode === 'single' ? 'Día Anterior' : 'Período Anterior'} (Bs)</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Anterior', Utilidad: prevTotals.utilidad.bs },
                                        { name: 'Actual', Utilidad: currentTotals.utilidad.bs }
                                    ]}>
                                        <XAxis dataKey="name" fontSize={10} tick={{ fill: '#888' }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, padding: 4, fontSize: 10 }}
                                            formatter={(value: any) => [`${Number(value).toFixed(2)} Bs`, 'Utilidad']}
                                        />
                                        <Bar dataKey="Utilidad" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                            {
                                                [0, 1].map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 1 ? (currentTotals.utilidad.bs >= 0 ? '#10b981' : '#ef4444') : '#9ca3af'} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <style>{`
                .react-calendar { 
                    border: none; 
                    font-family: inherit;
                    width: 100%;
                    color: inherit;
                    background-color: transparent;
                }
                .react-calendar__navigation button {
                    min-width: 44px;
                    background: none;
                }
                .react-calendar__navigation__label {
                    font-weight: bold;
                }
                
                /* Dark Mode Styles for Calendar */
                .dark .calendar-container .react-calendar {
                    background-color: #1f2937; /* gray-800 */
                    color: white;
                }
                .dark .calendar-container .react-calendar__navigation button {
                    color: white;
                }
                .dark .calendar-container .react-calendar__navigation button:enabled:hover,
                .dark .calendar-container .react-calendar__navigation button:enabled:focus {
                    background-color: #374151; /* gray-700 */
                }
                .dark .calendar-container .react-calendar__month-view__days__day {
                    color: #d1d5db; /* gray-300 */
                }
                .dark .calendar-container .react-calendar__month-view__days__day--weekend {
                    color: #f87171; /* red-400 */
                }
                .dark .calendar-container .react-calendar__month-view__days__day--neighboringMonth {
                    color: #6b7280; /* gray-500 */
                }
                .dark .calendar-container .react-calendar__tile:enabled:hover,
                .dark .calendar-container .react-calendar__tile:enabled:focus {
                    background-color: #374151; /* gray-700 */
                }
                .dark .calendar-container .react-calendar__tile--now {
                    background: #eab308; /* yellow-500 */
                    color: black;
                }
                .dark .calendar-container .react-calendar__tile--now:enabled:hover,
                .dark .calendar-container .react-calendar__tile--now:enabled:focus {
                    background: #ca8a04; /* yellow-600 */
                }
                .dark .calendar-container .react-calendar__tile--active {
                    background: #2563eb; /* blue-600 */
                    color: white;
                }
                .dark .calendar-container .react-calendar__tile--active:enabled:hover,
                .dark .calendar-container .react-calendar__tile--active:enabled:focus {
                    background: #1d4ed8; /* blue-700 */
                }
                
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body {
                        background-color: white !important;
                        color: black !important;
                    }
                    #printable-section {
                        box-shadow: none !important;
                        position: static !important;
                        width: 100% !important;
                        overflow: visible !important;
                    }
                     table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border: 1px solid #ddd !important;
                        padding: 8px !important;
                        color: black !important;
                    }
                    .bg-blue-100 { /* Tailwind classes might not print background colors by default in browsers without settings */
                        background-color: #dbeafe !important;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Hoja Diaria"
                sections={manualSections}
            />
        </div>
    );
};

export default HojaDiaria;
