import React, { useState } from 'react';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import { TrendingUp } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface DetailItem {
    id: number;
    fecha: string;
    descripcion: string;
    monto: number;
    moneda: string;
    paciente?: string;
    presupuesto?: string | number;
    factura?: string;
    recibo?: string;
    formaPago?: string;

    laboratorio?: string;
    trabajo?: string;
    proveedor?: string;
    doctor?: string;
    gasto?: string;
    tratamiento?: string;
}

interface StatCategory {
    label: string;
    bs: number;
    sus: number;
    itemsBs: DetailItem[];
    itemsSus: DetailItem[];
}

const Utilidades: React.FC = () => {
    const [filterType, setFilterType] = useState<'date' | 'month' | 'year' | ''>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    const months = [
        { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' }, { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());
    const [loading, setLoading] = useState(false);
    const { clinicaSeleccionada } = useClinica();

    // DETAIL MODAL STATE
    const [selectedDetail, setSelectedDetail] = useState<{
        title: string;
        currency: 'Bolivianos' | 'Dólares';
        items: DetailItem[];
    } | null>(null);



    const [stats, setStats] = useState<{
        ingresos: StatCategory;
        otrosIngresos: StatCategory;
        egresosDiarios: StatCategory;
        pagosLaboratorios: StatCategory;
        pagosPedidos: StatCategory;
        pagosDoctores: StatCategory;
        gastosFijos: StatCategory;
        totalIngresos: { bs: number; sus: number };
        totalEgresos: { bs: number; sus: number };
        totalUtilidades: { bs: number; sus: number };
    } | null>(null);

    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Utilidades',
            content: 'Vista general de las finanzas. Permite ver Ingresos VS Egresos y calcular la utilidad neta.'
        },
        {
            title: 'Filtros',
            content: 'Utilice los filtros por Fecha, Mes o Año para acotar los resultados mostrados en el reporte.'
        },
        {
            title: 'Detalles',
            content: 'Haga clic en los botones de "lupa" en cada fila para ver el desglose detallado de cada categoría.'
        }];

    const handleSearch = async () => {
        let finalStartDate = '';
        let finalEndDate = '';

        if (filterType === 'date') {
            if (!startDate || !endDate) return Swal.fire('Error', 'Seleccione fecha inicio y fin', 'warning');
            finalStartDate = startDate;
            finalEndDate = endDate;
        } else if (filterType === 'month') {
            if (!selectedMonth) return Swal.fire('Error', 'Seleccione un mes', 'warning');
            const [year, month] = selectedMonth.split('-');
            const lastDay = new Date(Number(year), Number(month), 0).getDate();
            finalStartDate = `${selectedMonth}-01`;
            finalEndDate = `${selectedMonth}-${lastDay}`;
        } else if (filterType === 'year') {
            if (!selectedYear) return Swal.fire('Error', 'Seleccione un año', 'warning');
            finalStartDate = `${selectedYear}-01-01`;
            finalEndDate = `${selectedYear}-12-31`;
        } else {
            return Swal.fire('Error', 'Seleccione un tipo de filtro', 'warning');
        }

        setLoading(true);
        try {
            const params: any = { startDate: finalStartDate, endDate: finalEndDate, limit: 10000 };

            if (clinicaSeleccionada !== null) {
                params.clinicaId = clinicaSeleccionada;
            }

            // Import api here or ensure it's imported at top
            const apiImport = await import('../services/api');
            const api = apiImport.default;

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
                api.get('/egresos', { params }),
                api.get('/pagos-doctores', { params }),
                api.get('/pagos-laboratorios', { params }),
                api.get('/pagos-pedidos', { params }),
                api.get('/pagos-gastos-fijos', { params }),
                api.get('/otros-ingresos', { params })
            ]);

            // Helper to sum amounts and collect items
            const sum = (items: any[], type: 'ingreso' | 'otros-ingresos' | 'egreso' | 'doctor' | 'laboratorio' | 'pedido' | 'gasto') => {
                let bs = 0;
                let sus = 0;
                const itemsBs: DetailItem[] = [];
                const itemsSus: DetailItem[] = [];

                items.forEach(item => {
                    let amount = 0;
                    let currency = item.moneda || 'Bolivianos';
                    let desc = '';
                    let date = formatDate(item.fecha);
                    let id = item.id || Math.random();

                    // Specific fields
                    let paciente = '';
                    let presupuesto: string | number | undefined = undefined;
                    let factura = '';
                    let recibo = '';
                    let formaPago = '';

                    let laboratorio = '';
                    let trabajo = '';
                    let proveedor = '';
                    let doctor = '';
                    let gasto = '';
                    let tratamiento = '';

                    switch (type) {
                        case 'ingreso':
                            amount = Number(item.monto) || 0;
                            const paymentMethod = item.formaPagoRel?.forma_pago || '';
                            formaPago = paymentMethod;

                            if (paymentMethod.toLowerCase() === 'tarjeta' && item.comisionTarjeta) {
                                const discountPercent = Number(item.comisionTarjeta.monto);
                                if (!isNaN(discountPercent)) {
                                    amount = amount - (amount * (discountPercent / 100));
                                }
                                if (item.comisionTarjeta.redBanco) {
                                    formaPago += ` (${item.comisionTarjeta.redBanco})`;
                                }
                            }

                            paciente = `${item.paciente?.nombre || ''} ${item.paciente?.paterno || ''} ${item.paciente?.materno || ''}`.trim();
                            presupuesto = item.proformaId || '-';
                            factura = item.factura || '-';
                            recibo = item.recibo || '-';

                            // Resolver tratamientos (Lógica sincronizada con Hoja Diaria/Pacientes)
                            const getTrats = (r: any) => {
                                if (!r.proforma?.historiaClinica) return '-';
                                
                                let ids: string[] = [];
                                if (r.historiaClinicaId) ids.push(String(r.historiaClinicaId));
                                if (r.tratamientosIds) {
                                    if (Array.isArray(r.tratamientosIds)) ids = [...ids, ...r.tratamientosIds.map(String)];
                                    else if (typeof r.tratamientosIds === 'string') ids = [...ids, ...r.tratamientosIds.split(',')];
                                }

                                if (ids.length > 0) {
                                    const match = r.proforma.historiaClinica.filter((h: any) => ids.includes(String(h.id)));
                                    if (match.length > 0) return match.map((h: any) => h.tratamiento).join(', ');
                                }

                                // Fallback a cancelados
                                const cancelados = r.proforma.historiaClinica.filter((h: any) => Number(h.cancelado) > 0);
                                if (cancelados.length > 0) return cancelados.map((h: any) => h.tratamiento).join(', ');
                                
                                return '-';
                            };
                            tratamiento = getTrats(item);

                            desc = `Pago de Paciente: ${paciente}`;
                            break;
                        case 'egreso':
                            amount = Number(item.monto) || 0;
                            desc = item.detalle || 'Egreso Diario';

                            formaPago = item.formaPago?.forma_pago || '-';
                            break;
                        case 'doctor':
                            amount = Number(item.total) || 0;
                            doctor = `${item.doctor?.nombre || 'Desconocido'} ${item.doctor?.paterno || ''}`.trim();
                            if (doctor.includes('Desconocido') && item.idDoctor) doctor = `Doctor ID: ${item.idDoctor}`;
                            formaPago = item.formaPago?.forma_pago || '-';
                            desc = `Pago a Doctor: ${doctor}`;
                            break;
                        case 'laboratorio':
                            amount = Number(item.monto) || 0;
                            laboratorio = item.trabajoLaboratorio?.laboratorio?.laboratorio || '-';
                            trabajo = item.trabajoLaboratorio?.precioLaboratorio?.detalle || '-';
                            paciente = `${item.trabajoLaboratorio?.paciente?.nombre || ''} ${item.trabajoLaboratorio?.paciente?.paterno || ''}`.trim();
                            formaPago = item.formaPago?.forma_pago || '-';
                            desc = `Lab: ${laboratorio} - ${trabajo}`;
                            break;
                        case 'pedido':
                            amount = Number(item.monto) || 0;
                            proveedor = item.pedido?.proveedor?.proveedor || '-';
                            factura = item.factura || '-';
                            recibo = item.recibo || '-';
                            formaPago = item.forma_pago || '-';
                            desc = `Pedido: ${proveedor}`;
                            break;
                        case 'gasto':
                            amount = Number(item.monto) || 0;
                            gasto = item.gastoFijo?.gasto_fijo || 'Gasto Fijo';

                            formaPago = item.formaPago?.forma_pago || '-';
                            desc = `${gasto}`;
                            break;
                        case 'otros-ingresos':
                            amount = Number(item.monto) || 0;
                            desc = item.detalle || 'Otro Ingreso';
                            formaPago = item.formaPago?.forma_pago || '-';
                            break;
                    }

                    const currUpper = currency.toUpperCase();
                    const detailItem: DetailItem = {
                        id,
                        fecha: date,
                        descripcion: desc,
                        monto: amount,
                        moneda: currency,
                        paciente,
                        presupuesto,
                        factura,
                        recibo,
                        formaPago,
                        laboratorio,
                        trabajo,
                        proveedor,
                        doctor,
                        gasto,
                        tratamiento
                    };

                    if (currUpper.includes('BOLIVIANO') || currUpper === 'BS') {
                        bs += amount;
                        itemsBs.push(detailItem);
                    } else {
                        sus += amount;
                        itemsSus.push(detailItem);
                    }
                });
                return { bs, sus, itemsBs, itemsSus };
            };

            const ingresos = sum(resIngresos.data, 'ingreso');
            const egresosDiarios = sum(resEgresos.data.data || [], 'egreso');
            const pagosDoctores = sum(resDoctores.data, 'doctor'); // backend might return array directly
            const pagosLaboratorios = sum(resLaboratorios.data, 'laboratorio');
            const pagosPedidos = sum(resPedidos.data, 'pedido');
            const otrosIngresos = sum(resOtrosIngresos.data.data || [], 'otros-ingresos');

            const allGastos = resGastosFijos.data as any[];
            // Combine all Expenses into one sum, they will be filtered by tabs in the modal
            const sumGastosTotal = sum(allGastos, 'gasto');

            const totalIngresos = { 
                bs: ingresos.bs + otrosIngresos.bs, 
                sus: ingresos.sus + otrosIngresos.sus 
            };
            const totalEgresos = {
                bs: egresosDiarios.bs + pagosDoctores.bs + pagosLaboratorios.bs + pagosPedidos.bs + sumGastosTotal.bs,
                sus: egresosDiarios.sus + pagosDoctores.sus + pagosLaboratorios.sus + pagosPedidos.sus + sumGastosTotal.sus
            };

            setStats({
                ingresos: { label: 'Ingresos por Pagos de Pacientes', ...ingresos },
                otrosIngresos: { label: 'Otros Ingresos', ...otrosIngresos },
                egresosDiarios: { label: 'Egresos Diarios', ...egresosDiarios },
                pagosLaboratorios: { label: 'Pagos a Laboratorios', ...pagosLaboratorios },
                pagosPedidos: { label: 'Pagos de Pedidos', ...pagosPedidos },
                pagosDoctores: { label: 'Pagos a Doctores', ...pagosDoctores },
                gastosFijos: { label: 'Pagos de Gastos Fijos', ...sumGastosTotal },
                totalIngresos,
                totalEgresos,
                totalUtilidades: {
                    bs: totalIngresos.bs - totalEgresos.bs,
                    sus: totalIngresos.sus - totalEgresos.sus
                }
            });

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error al calcular utilidades', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh when clinic changes if a filter is already active
    React.useEffect(() => {
        if (filterType) {
            handleSearch();
        }
    }, [clinicaSeleccionada]);

    const formatMoney = (amount: number, currency: 'Bs' | 'Sus') => {
        return amount.toLocaleString('es-BO', {
            style: 'currency',
            currency: currency === 'Bs' ? 'BOB' : 'USD'
        });
    };

    const handleOpenDetail = (category: StatCategory | undefined, currency: 'Bolivianos' | 'Dólares') => {
        if (!category) return;
        const items = currency === 'Bolivianos' ? category.itemsBs : category.itemsSus;
        setSelectedDetail({
            title: category.label,
            currency,
            items
        });

    };

    const closeModal = () => setSelectedDetail(null);

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 min-h-screen relative text-gray-800 dark:text-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingUp className="text-blue-600" size={32} />
                        Utilidades
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis de utilidades, ingresos y egresos</p>
                </div>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm no-print"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 transition-colors duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">

                    {/* Select Option */}
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seleccione una Opción</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                            </div>
                            <select
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                            >
                                <option value="">-- Seleccionar --</option>
                                <option value="date">Por fecha</option>
                                <option value="month">Mensual</option>
                                <option value="year">Anual</option>
                            </select>
                        </div>
                    </div>

                    {/* Conditional Filters */}
                    {filterType === 'date' && (
                        <>
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Final</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {filterType === 'month' && (
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seleccionar Mes</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <select
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                                        value={selectedMonth.split('-')[1]}
                                        onChange={(e) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
                                    >
                                        {months.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative w-32">
                                    <select
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none text-center"
                                        value={selectedMonth.split('-')[0]}
                                        onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                                    >
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {filterType === 'year' && (
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seleccionar Año</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <select
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-10 pr-3 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(e.target.value)}
                                >
                                    <option value="" disabled>-- Seleccione --</option>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {filterType && (
                        <div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 dark:hover:bg-blue-500 disabled:opacity-50 disabled:transform-none"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Buscar
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {stats ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                    {/* Header */}
                    <div className="grid grid-cols-12 bg-gray-800 dark:bg-gray-700 text-white font-semibold text-sm uppercase py-3 px-4">
                        <div className="col-span-4">Concepto</div>
                        <div className="col-span-3 text-right">Bolivianos</div>
                        <div className="col-span-1 text-center">Detalle</div>
                        <div className="col-span-3 text-right">Dólares</div>
                        <div className="col-span-1 text-center">Detalle</div>
                    </div>

                    {/* Body */}
                    <div className="text-gray-700 dark:text-gray-300">
                        {/* INGRESOS */}
                        <div className="grid grid-cols-12 py-3 px-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 items-center transition-colors">
                            <div className="col-span-4 font-medium">{stats.ingresos.label}</div>
                            <div className="col-span-3 text-right">{formatMoney(stats.ingresos.bs, 'Bs')}</div>
                            <div className="col-span-1 text-center">
                                <button
                                    onClick={() => handleOpenDetail(stats.ingresos, 'Bolivianos')}
                                    className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                            <div className="col-span-3 text-right">{formatMoney(stats.ingresos.sus, 'Sus')}</div>
                            <div className="col-span-1 text-center">
                                <button
                                    onClick={() => handleOpenDetail(stats.ingresos, 'Dólares')}
                                    className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-12 py-3 px-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 items-center transition-colors">
                            <div className="col-span-4 font-medium">{stats.otrosIngresos.label}</div>
                            <div className="col-span-3 text-right">{formatMoney(stats.otrosIngresos.bs, 'Bs')}</div>
                            <div className="col-span-1 text-center">
                                <button
                                    onClick={() => handleOpenDetail(stats.otrosIngresos, 'Bolivianos')}
                                    className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                            <div className="col-span-3 text-right">{formatMoney(stats.otrosIngresos.sus, 'Sus')}</div>
                            <div className="col-span-1 text-center">
                                <button
                                    onClick={() => handleOpenDetail(stats.otrosIngresos, 'Dólares')}
                                    className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* TOTAL INGRESOS */}
                        <div className="grid grid-cols-12 py-3 px-4 bg-green-50 dark:bg-green-900/20 border-y border-green-100 dark:border-green-900/30 font-bold text-green-900 dark:text-green-300 items-center">
                            <div className="col-span-4">TOTAL INGRESOS</div>
                            <div className="col-span-3 text-right">{formatMoney(stats.totalIngresos.bs, 'Bs')}</div>
                            <div className="col-span-1"></div>
                            <div className="col-span-3 text-right">$us {stats.totalIngresos.sus.toFixed(2)}</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* SPACING */}
                        <div className="h-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700"></div>

                        {/* EGRESOS ITEMS */}
                        {[
                            stats.egresosDiarios,
                            stats.pagosLaboratorios,
                            stats.pagosPedidos,
                            stats.pagosDoctores,
                            stats.gastosFijos
                        ].map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 py-3 px-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 items-center transition-colors">
                                <div className="col-span-4 font-medium">{item.label}</div>
                                <div className="col-span-3 text-right">{formatMoney(item.bs, 'Bs')}</div>
                                <div className="col-span-1 text-center">
                                    <button
                                        onClick={() => handleOpenDetail(item, 'Bolivianos')}
                                        className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="col-span-3 text-right">{formatMoney(item.sus, 'Sus')}</div>
                                <div className="col-span-1 text-center">
                                    <button
                                        onClick={() => handleOpenDetail(item, 'Dólares')}
                                        className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* TOTAL EGRESOS */}
                        <div className="grid grid-cols-12 py-3 px-4 bg-red-50 dark:bg-red-900/20 border-y border-red-100 dark:border-red-900/30 font-bold text-red-900 dark:text-red-300 items-center">
                            <div className="col-span-4">TOTAL EGRESOS</div>
                            <div className="col-span-3 text-right">{formatMoney(stats.totalEgresos.bs, 'Bs')}</div>
                            <div className="col-span-1"></div>
                            <div className="col-span-3 text-right">$us {stats.totalEgresos.sus.toFixed(2)}</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* TOTAL UTILIDADES */}
                        <div className="grid grid-cols-12 py-6 px-4 bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-200 dark:border-blue-700/50 items-center">
                            <div className="col-span-4 text-xl font-bold text-gray-800 dark:text-gray-200">TOTAL UTILIDADES</div>

                            {/* Bolivianos */}
                            <div className={`col-span-3 flex items-center justify-end text-xl font-bold ${stats.totalUtilidades.bs >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {stats.totalUtilidades.bs >= 0 ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                                    </svg>
                                )}
                                {formatMoney(stats.totalUtilidades.bs, 'Bs')}
                            </div>

                            <div className="col-span-1"></div>

                            {/* Dólares */}
                            <div className={`col-span-3 flex items-center justify-end text-xl font-bold ${stats.totalUtilidades.sus >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {stats.totalUtilidades.sus >= 0 ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                                    </svg>
                                )}
                                $us {stats.totalUtilidades.sus.toFixed(2)}
                            </div>

                            <div className="col-span-1"></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 min-h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500 italic transition-colors">
                    Seleccione los filtros para ver las utilidades.
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedDetail && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" onClick={closeModal} aria-hidden="true"></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className={`inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full ${selectedDetail.title.includes('Ingresos') || selectedDetail.title.includes('Otros Ingresos') || selectedDetail.title.includes('Egresos Diarios') || selectedDetail.title.includes('Pagos a Laboratorios') || selectedDetail.title.includes('Pagos de Pedidos') || selectedDetail.title.includes('Pagos a Doctores') || selectedDetail.title.includes('Pagos de Gastos Fijos') ? 'sm:max-w-5xl' : 'sm:max-w-2xl'}`}>
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 transition-colors">
                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                            Detalle: {selectedDetail.title} ({selectedDetail.currency})
                                        </h3>
                                        <div className="mt-4">


                                            <div className="max-h-96 overflow-y-auto">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                                        {selectedDetail.title === 'Otros Ingresos' ? (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detalle</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moneda</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        ) : selectedDetail.title.includes('Ingresos') ? (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Presup.</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamiento</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fact/Rec</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        ) : selectedDetail.title.includes('Egresos Diarios') ? (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        ) : selectedDetail.title.includes('Pagos a Laboratorios') ? (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Laboratorio</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trabajo</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        ) : selectedDetail.title.includes('Pagos de Pedidos') ? (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proveedor</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fact/Rec</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        ) : selectedDetail.title.includes('Pagos a Doctores') ? (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        ) : selectedDetail.title.includes('Pagos de Gastos') ? (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gasto Fijo</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        ) : (
                                                            <tr>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                                            </tr>
                                                        )}
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                        {selectedDetail.items.length > 0 ? selectedDetail.items.map((item) => (
                                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                                {selectedDetail.title === 'Otros Ingresos' ? (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{item.descripcion}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.moneda}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.formaPago}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-bold">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                ) : selectedDetail.title.includes('Ingresos') ? (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">{item.paciente}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.presupuesto}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 italic text-xs">{item.tratamiento}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                            {item.factura && item.factura !== '-' ? `F: ${item.factura}` : ''}
                                                                            {item.factura && item.recibo && item.factura !== '-' && item.recibo !== '-' ? ' / ' : ''}
                                                                            {item.recibo && item.recibo !== '-' ? `R: ${item.recibo}` : ''}
                                                                            {(!item.factura || item.factura === '-') && (!item.recibo || item.recibo === '-') ? '-' : ''}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.formaPago}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-bold">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                ) : selectedDetail.title.includes('Egresos Diarios') ? (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{item.descripcion}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.formaPago}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                ) : selectedDetail.title.includes('Pagos a Laboratorios') ? (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">{item.laboratorio}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.trabajo}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.paciente}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.formaPago}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-bold">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                ) : selectedDetail.title.includes('Pagos de Pedidos') ? (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">{item.proveedor}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                            {item.factura && item.factura !== '-' ? `F: ${item.factura}` : ''}
                                                                            {item.factura && item.recibo && item.factura !== '-' && item.recibo !== '-' ? ' / ' : ''}
                                                                            {item.recibo && item.recibo !== '-' ? `R: ${item.recibo}` : ''}
                                                                            {(!item.factura || item.factura === '-') && (!item.recibo || item.recibo === '-') ? '-' : ''}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.formaPago}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-bold">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                ) : selectedDetail.title.includes('Pagos a Doctores') ? (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">{item.doctor}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.formaPago}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-bold">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                ) : selectedDetail.title.includes('Pagos de Gastos') ? (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium">{item.gasto}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.formaPago}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right font-bold">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.fecha}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{item.descripcion}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right">
                                                                            {item.monto.toLocaleString('es-BO', { style: 'currency', currency: selectedDetail.currency === 'Bolivianos' ? 'BOB' : 'USD' })}
                                                                        </td>
                                                                    </>
                                                                )}
                                                            </tr>
                                                        )) : (
                                                            <tr>
                                                                <td colSpan={selectedDetail.title.includes('Ingresos') ? 6 : selectedDetail.title.includes('Otros Ingresos') ? 5 : selectedDetail.title.includes('Egresos Diarios') ? 4 : selectedDetail.title.includes('Pagos a Laboratorios') ? 6 : selectedDetail.title.includes('Pagos de Pedidos') ? 5 : selectedDetail.title.includes('Pagos a Doctores') ? 4 : selectedDetail.title.includes('Pagos de Gastos') ? 4 : 3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400 font-light italic">No hay registros</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-500 shadow-md px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 transition-all transform hover:-translate-y-0.5 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={closeModal}
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Utilidades"
                sections={manualSections}
            />
        </div>
    );
};

export default Utilidades;
