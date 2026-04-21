import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import FormaPagoForm from './FormaPagoForm';
import SearchableSelect from './SearchableSelect';


interface Doctor {
    id: number;
    paterno: string;
    materno: string;
    nombre: string;
}

interface FormaPago {
    id: number;
    forma_pago: string;
}

interface HistoriaClinica {
    id: number;
    fecha: string;
    paciente: {
        paterno: string;
        materno: string;
        nombre: string;
    };
    tratamiento: string;
    precio: number;
    pagado: string;
    pieza?: string;
    cantidad?: number;
    proformaId?: number;
    descuento?: number; // Added inline flat discount
    proformaDetalle?: {
        descuento: number;
    };
    // Loaded from backend
    ultimoPagoPaciente?: {
        fecha: string; // payment date
        forma_pago: string;
        monto: number;
        moneda: string;
        factura?: string; // payment with invoice?
    } | null;
    comisionDefault?: number;
    costoLaboratorioAuto?: number;
}

interface RowDetail {
    costoLaboratorio: string | number;
    descuento: number; // Percentage
    comision: string | number; // Percentage
}

const PagosDoctoresForm = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID from URL
    const isEditMode = Boolean(id);
    const { clinicaSeleccionada } = useClinica();

    const [doctores, setDoctores] = useState<Doctor[]>([]);
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [pendientes, setPendientes] = useState<HistoriaClinica[]>([]);
    const [showManual, setShowManual] = useState(false);

    // Modal Forma de Pago
    const [isFormaPagoModalOpen, setIsFormaPagoModalOpen] = useState(false);
    const [userPermisos, setUserPermisos] = useState<string[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (error) {
                console.error('Error parseando usuario:', error);
            }
        }
    }, []);

    const puedeCrearFormaPago = !userPermisos.includes('configuracion');

    const manualSections: ManualSection[] = [
        {
            title: 'Pagos a Doctores',
            content: 'Registro y gestión de pagos a doctores por los tratamientos realizados.'
        },
        {
            title: 'Selección de Doctor y Tratamientos',
            content: 'Seleccione un doctor para ver su lista de tratamientos pendientes. Marque los tratamientos que desea incluir en este pago.'
        },
        {
            title: 'Ajustes y Descuentos Automatizados',
            content: 'El Costo de Laboratorio se extrae de un trabajo de laboratorio asociado al tratamiento presupuestado. Si el pago del paciente fue con factura, se descontará automáticamente el porcentaje correspondiente. Adicionalmente, puede ingresar un descuento manual si aplica.'
        },
        {
            title: 'Datos del Pago',
            content: 'En la parte inferior, configure la fecha, forma de pago y moneda. Verifique el "Total a Pagar" antes de Guardar (o Actualizar Pago).'
        }];

    // Header Data
    const [idDoctor, setIdDoctor] = useState<string>('');
    const [clinicaId, setClinicaId] = useState<number>(0);

    // Footer Data
    const [fecha, setFecha] = useState(getLocalDateString());
    const [moneda, setMoneda] = useState('Bolivianos'); // Bolivianos or Dólares
    const [tc, setTc] = useState<number>(6.96);
    const [idForma_pago, setIdFormaPago] = useState<string>('');

    // Selection & Row Details
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [rowDetails, setRowDetails] = useState<Record<number, RowDetail>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDoctores();
        fetchFormasPago();
        if (isEditMode && id) {
            fetchPagoData(Number(id));
        }
    }, [id, clinicaSeleccionada]);

    useEffect(() => {
        // Only fetch pending if NOT in edit mode, or if doctor changes in create mode
        if (idDoctor && !isEditMode) {
            fetchPendientes(Number(idDoctor));
        }
    }, [idDoctor, isEditMode, clinicaSeleccionada]);

    const fetchPagoData = async (paymentId: number) => {
        try {
            const response = await api.get(`/pagos-doctores/${paymentId}`);
            const pago = response.data;
            setIdDoctor(String(pago.doctor?.id || ''));
            setFecha(pago.fecha.split('T')[0]);
            setClinicaId(pago.clinicaId || 0);

            // Normalized Currency
            let normalizedMoneda = 'Bolivianos';
            if (pago.moneda === 'Bs') normalizedMoneda = 'Bolivianos';
            else if (pago.moneda === '$us' || pago.moneda === 'Sus') normalizedMoneda = 'Dólares';
            else normalizedMoneda = pago.moneda;

            setMoneda(normalizedMoneda);
            setTc(Number(pago.tc) || 6.96); // Load TC
            setIdFormaPago(String(pago.formaPago?.id || ''));

            // 2. Extract "Saved/Paid" Items
            let loadedItems: HistoriaClinica[] = [];
            if (pago.detalles) {
                loadedItems = pago.detalles.map((d: any) => ({
                    ...d.historiaClinica,
                }));
            }

            // 3. Fetch "Unpaid/Pending" Items for this doctor
            let pendingItems: HistoriaClinica[] = [];
            if (pago.doctor?.id) {
                try {
                    const clinicaParam = clinicaSeleccionada ? `?clinicaId=${clinicaSeleccionada}` : '';
                    const pendingRes = await api.get(`/historia-clinica/pendientes/${pago.doctor.id}${clinicaParam}`);
                    pendingItems = pendingRes.data;
                } catch (err) {
                    console.error('Error fetching additional pending items:', err);
                }
            }

            setPendientes([...loadedItems, ...pendingItems]);

            const ids = loadedItems.map((i: any) => i.id);
            setSelectedIds(ids);

            const detailsMap: Record<number, RowDetail> = {};
            pago.detalles.forEach((d: any) => {
                detailsMap[d.historiaClinica.id] = {
                    costoLaboratorio: Number(d.costo_laboratorio),
                    descuento: Number(d.descuento),
                    comision: Number(d.comision)
                };
            });
            pendingItems.forEach(p => {
                detailsMap[p.id] = {
                    costoLaboratorio: p.costoLaboratorioAuto || 0,
                    descuento: p.descuento || p.proformaDetalle?.descuento || 0,
                    comision: p.comisionDefault || 0
                };
            });
            setRowDetails(detailsMap);

        } catch (error) {
            console.error('Error fetching payment:', error);
            Swal.fire('Error', 'No se pudo cargar la información del pago', 'error');
            navigate('/pagos-doctores');
        }
    };

    const fetchDoctores = async () => {
        try {
            const clinicaParam = clinicaSeleccionada ? `?clinicaId=${clinicaSeleccionada}` : '';
            const response = await api.get(`/historia-clinica/doctores/pendientes${clinicaParam}`);
            setDoctores(response.data);
            if (!isEditMode) {
                setClinicaId(clinicaSeleccionada || 0);
            }
        } catch (error) {
            console.error('Error fetching doctores:', error);
        }
    };

    const fetchFormasPago = async () => {
        try {
            const response = await api.get('/forma-pago?limit=100');
            const data = response.data.data || response.data;
            if (Array.isArray(data)) {
                setFormasPago(data.filter((f: any) => f.estado?.toLowerCase() === 'activo'));
            } else {
                setFormasPago([]);
            }
        } catch (error) {
            console.error('Error fetching formas pago:', error);
        }
    };

    const fetchPendientes = async (doctorId: number) => {
        try {
            const clinicaParam = clinicaSeleccionada ? `?clinicaId=${clinicaSeleccionada}` : '';
            const response = await api.get(`/historia-clinica/pendientes/${doctorId}${clinicaParam}`);
            setPendientes(response.data);
            setSelectedIds([]);
            setRowDetails({});
        } catch (error) {
            console.error('Error fetching pendientes:', error);
            Swal.fire('Error', 'No se pudieron cargar los tratamientos pendientes', 'error');
        }
    };

    const calculateRowNeto = (item: HistoriaClinica) => {
        const details = rowDetails[item.id] || { costoLaboratorio: 0, descuento: 0, comision: 0 };
        const base = Number(item.precio) || 0;

        // 1. Discount from Budget (Flat value in Bs)
        const discountAmount = Number(details.descuento) || 0;
        let taxableBase = base - discountAmount;

        // 2. Tax Deduction (16%) if patient paid with invoice
        if (item.ultimoPagoPaciente?.factura) {
            taxableBase = taxableBase * 0.84; // Deduct 16% (leaving 84%)
        }

        // 3. Subtract Lab Cost
        const afterLab = Math.max(0, taxableBase - (Number(details.costoLaboratorio) || 0));
        return afterLab;
    };

    const calculateRowTotal = (item: HistoriaClinica) => {
        const afterLab = calculateRowNeto(item);
        const details = rowDetails[item.id] || { costoLaboratorio: 0, descuento: 0, comision: 0 };

        // 4. Apply Physician Commission
        const comisionAmount = (afterLab * (Number(details.comision) || 0)) / 100;

        return comisionAmount;
    };

    // Grand Total (Sum of rows)
    const totalToPayBs = pendientes
        .filter(p => selectedIds.includes(p.id))
        .reduce((sum, p) => sum + calculateRowTotal(p), 0);

    // Convert to Selected Currency
    const totalToPay = moneda === 'Dólares' && tc > 0
        ? totalToPayBs / tc
        : totalToPayBs;

    // Search
    const filteredPendientes = pendientes.filter(item => {
        const term = searchTerm.toLowerCase();
        const pacienteName = `${item.paciente?.nombre} ${item.paciente?.paterno} ${item.paciente?.materno}`.toLowerCase();
        const tratamiento = item.tratamiento?.toLowerCase() || '';
        return pacienteName.includes(term) || tratamiento.includes(term);
    });

    const handleCheckboxChange = (id: number) => {
        setSelectedIds(prev => {
            const isSelected = prev.includes(id);
            if (!isSelected) {
                // Initialize details when selected if not present
                if (!rowDetails[id]) {
                    const item = pendientes.find(p => p.id === id);
                    const defaultDiscount = item?.descuento || item?.proformaDetalle?.descuento || 0;

                    setRowDetails(curr => ({
                        ...curr,
                        [id]: {
                            costoLaboratorio: item?.costoLaboratorioAuto || 0,
                            descuento: defaultDiscount,
                            comision: item?.comisionDefault || 0
                        }
                    }));
                }
                return [...prev, id];
            } else {
                return prev.filter(pid => pid !== id);
            }
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = filteredPendientes.map(p => p.id);
            const uniqueIds = Array.from(new Set([...selectedIds, ...allIds]));

            setSelectedIds(uniqueIds);

            // Initialize details
            const newDetails = { ...rowDetails };
            filteredPendientes.forEach(p => {
                if (!newDetails[p.id]) {
                    const defaultDiscount = p.descuento || p.proformaDetalle?.descuento || 0;
                    const defaultComision = p.comisionDefault || 0;
                    newDetails[p.id] = { costoLaboratorio: 0, descuento: defaultDiscount, comision: defaultComision };
                }
            });
            setRowDetails(newDetails);
        } else {
            // Deselect visible items
            const visibleIds = filteredPendientes.map(p => p.id);
            setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
        }
    };

    const handleDetailChange = (id: number, field: keyof RowDetail, value: string | number) => {
        setRowDetails(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!idDoctor || !idForma_pago || selectedIds.length === 0) {
            Swal.fire('Atención', 'Seleccione un doctor, forma de pago y al menos un tratamiento', 'warning');
            return;
        }

        const detalles = pendientes
            .filter(p => selectedIds.includes(p.id))
            .map(p => {
                const rd = rowDetails[p.id] || { costoLaboratorio: 0, descuento: 0 };
                const rowTotal = calculateRowTotal(p);
                return {
                    idhistoria_clinica: Number(p.id),
                    total: Number(rowTotal),
                    costo_laboratorio: Number(rd.costoLaboratorio) || 0,
                    fecha_pago_paciente: p.ultimoPagoPaciente?.fecha || null,
                    forma_pago_paciente: p.ultimoPagoPaciente?.forma_pago || null,
                    factura: p.ultimoPagoPaciente?.factura || null,
                    descuento: Number(rd.descuento) || 0,
                    comision: Number(rd.comision) || 0
                };
            });

        const payload = {
            idDoctor: Number(idDoctor),
            fecha,
            comision: 0, // No longer using global commission
            total: totalToPay,
            moneda,
            tc: moneda === 'Dólares' ? tc : 0,
            idForma_pago: Number(idForma_pago),
            clinicaId: clinicaId !== 0 ? clinicaId : null,
            detalles
        };

        try {
            if (isEditMode && id) {
                await api.patch(`/pagos-doctores/${id}`, payload);
                Swal.fire({ icon: 'success', title: 'Pago Actualizado', text: 'El pago se ha actualizado correctamente', timer: 1500, showConfirmButton: false });
            } else {
                await api.post('/pagos-doctores', payload);
                Swal.fire({ icon: 'success', title: 'Pago Registrado', text: 'El pago se ha guardado correctamente', timer: 1500, showConfirmButton: false });
            }
            navigate('/pagos-doctores');
        } catch (error: any) {
            console.error('Error saving pago:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error desconocido';
            const detailMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
            Swal.fire('Error al Guardar', `Detalles: ${detailMsg}. Por favor intente nuevamente.`, 'error');
        }
    };

    return (
        <div className="content-card flex flex-col h-full bg-white dark:bg-gray-800 min-h-screen">
            <div className="flex justify-between items-center mb-6 px-6 pt-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Nuevo Pago a Doctor</h2>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-grow space-y-4 px-6 pb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors space-y-4">
                    <div className="flex flex-col md:flex-row gap-6">


                        <div className="w-full md:w-1/3">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seleccionar Doctor</label>
                                <SearchableSelect
                                    options={doctores.map(d => ({
                                        id: d.id,
                                        label: `${d.paterno} ${d.materno} ${d.nombre}`.trim()
                                    }))}
                                    value={idDoctor}
                                    onChange={(val) => setIdDoctor(String(val))}
                                    placeholder="-- Seleccione Doctor --"
                                    required
                                    icon={
                                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    }
                                />
                        </div>
                    </div>
                </div>

                <div className="flex-grow bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col transition-colors">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Tratamientos Pendientes</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{selectedIds.length} seleccionados</span>
                        </div>
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Buscar paciente o tratamiento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-3 pr-10 py-2 border border-blue-300 dark:border-blue-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-grow">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 shadow-sm z-10 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredPendientes.length > 0 && filteredPendientes.every(p => selectedIds.includes(p.id))}
                                            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                                        />
                                    </th>
                                    <th className="p-3"># Pres.</th>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Paciente</th>
                                    <th className="p-3">Tratamiento</th>
                                    <th className="p-3">Pieza</th>
                                    <th className="p-3 text-center">Cant.</th>
                                    <th className="p-3 text-right">Precio</th>

                                    {/* Editable Columns Header */}
                                    <th className="p-3 bg-red-50/50 dark:bg-red-900/20 text-right text-red-700 dark:text-red-400">Desc. Pac.</th>
                                    <th className="p-3 w-32 bg-blue-50/50 dark:bg-blue-900/20">Costo Lab.</th>
                                    <th className="p-3 bg-gray-50/50 dark:bg-gray-800/50 text-center">Fact.</th>
                                    <th className="p-3 w-24 bg-blue-50/50 dark:bg-blue-900/20 text-right">Imp. (16%)</th>
                                    <th className="p-3 text-right bg-blue-50/50 dark:bg-blue-900/20 font-bold">Neto Doc.</th>
                                    <th className="p-3 w-20 bg-blue-50/50 dark:bg-blue-900/20">Com%</th>
                                    <th className="p-3 bg-green-50/50 dark:bg-green-900/20 text-right font-bold text-green-700 dark:text-green-400">Pago Doct.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                {filteredPendientes.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="p-10 text-center text-gray-500 dark:text-gray-400 italic">
                                            {idDoctor ? (searchTerm ? 'No se encontraron resultados.' : 'No hay tratamientos pendientes.') : 'Seleccione un doctor para ver sus pendientes.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPendientes.map(p => {
                                        const isSelected = selectedIds.includes(p.id);
                                        const details = rowDetails[p.id] || { costoLaboratorio: 0, descuento: 0 };
                                        const rowTotal = calculateRowTotal(p);

                                        return (
                                            <tr key={p.id} className={`${isSelected ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} transition-colors`}>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleCheckboxChange(p.id)}
                                                        className="h-4 w-4 text-blue-600 rounded cursor-pointer focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                                                    />
                                                </td>
                                                <td className="p-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.proformaId || '-'}</td>
                                                <td className="p-3 text-gray-600 dark:text-gray-300">{formatDate(p.fecha)}</td>
                                                <td className="p-3 font-medium text-gray-800 dark:text-white">{p.paciente?.paterno} {p.paciente?.nombre}</td>
                                                <td className="p-3 text-gray-700 dark:text-gray-300">{p.tratamiento}</td>
                                                <td className="p-3 text-gray-500 dark:text-gray-400">{p.pieza || '-'}</td>
                                                <td className="p-3 text-center text-gray-500 dark:text-gray-400">{p.cantidad}</td>
                                                <td className="p-3 text-right font-bold text-gray-800 dark:text-white">Bs. {Number(p.precio).toFixed(2)}</td>
                                                
                                                <td className="p-3 text-right text-red-600 dark:text-red-400 font-medium">
                                                    {isSelected && details.descuento > 0 ? `- Bs. ${Number(details.descuento).toFixed(2)}` : '-'}
                                                </td>

                                                <td className="p-3 text-right font-medium text-gray-700 dark:text-gray-300">
                                                    {isSelected ? Number(details.costoLaboratorio).toFixed(2) : '-'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {isSelected && p.ultimoPagoPaciente?.factura ? (
                                                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-[10px] font-bold border border-yellow-200 dark:border-yellow-800">
                                                            SI
                                                        </span>
                                                    ) : (
                                                        isSelected && <span className="text-gray-400">NO</span>
                                                    )}
                                                </td>

                                                <td className="p-3 text-right text-red-500 dark:text-red-400 font-medium">
                                                    {isSelected && p.ultimoPagoPaciente?.factura ? (
                                                        (() => {
                                                            const base = Number(p.precio) || 0;
                                                            const discountAmount = Number(details.descuento) || 0;
                                                            const taxableBase = base - discountAmount;
                                                            return `- Bs. ${(taxableBase * 0.16).toFixed(2)}`;
                                                        })()
                                                    ) : isSelected ? '0.00' : '-'}
                                                </td>

                                                <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                                    {isSelected ? `Bs. ${calculateRowNeto(p).toFixed(2)}` : '-'}
                                                </td>

                                                <td className="p-2">
                                                    {isSelected && (
                                                        <input
                                                            type="text"
                                                            value={details.comision}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(',', '.');
                                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                    handleDetailChange(p.id, 'comision', val);
                                                                }
                                                            }}
                                                            className="w-full p-1 border border-blue-300 dark:border-blue-600 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            placeholder="0%"
                                                        />
                                                    )}
                                                </td>

                                                <td className="p-3 text-right font-bold text-green-700 dark:text-green-400">
                                                    {isSelected ? rowTotal.toFixed(2) : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer: Payment Details */}
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg mt-auto border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end flex-grow">
                            <div className="md:col-span-1">
                                <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase font-bold mb-2">Fecha Pago</label>
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 font-mono"
                                    required
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase font-bold mb-2">Forma de Pago</label>
                                <div className="flex gap-2">
                                    <select
                                        value={idForma_pago}
                                        onChange={(e) => setIdFormaPago(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 flex-grow"
                                        required
                                    >
                                        <option value="" className="text-gray-500">Seleccionar</option>
                                        {Array.isArray(formasPago) && formasPago.map(f => (
                                            <option key={f.id} value={f.id}>{f.forma_pago}</option>
                                        ))}
                                    </select>
                                    {puedeCrearFormaPago && (
                                        <button
                                            type="button"
                                            onClick={() => setIsFormaPagoModalOpen(true)}
                                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                            title="Añadir Forma de Pago"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase font-bold mb-2">Moneda</label>
                                <select
                                    value={moneda}
                                    onChange={(e) => setMoneda(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:border-blue-400"
                                >
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="Bolivianos">Bolivianos</option>
                                    <option value="Dólares">Dólares</option>
                                </select>
                            </div>

                            {moneda === 'Dólares' && (
                                <div className="md:col-span-1">
                                    <label className="block text-gray-600 dark:text-gray-400 text-xs uppercase font-bold mb-2">T. Cambio</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tc}
                                        onChange={(e) => setTc(Number(e.target.value))}
                                        placeholder="Ej: 6.96"
                                        className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border-2 border-green-500/20 dark:border-green-400/20 text-center min-w-[200px] shadow-sm">
                            <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1">Total a Pagar</span>
                            <span className="block text-3xl font-black text-green-600 dark:text-green-400 tracking-tighter">
                                {totalToPay.toFixed(2)} <span className="text-sm font-normal ml-1">{moneda === 'Dólares' ? '$us' : 'Bs'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Standardized Footer Buttons */}
                    <div className="flex justify-start gap-4 mt-8 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                        <button
                            type="submit"
                            className="px-8 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            disabled={selectedIds.length === 0}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {isEditMode ? 'ACTUALIZAR PAGO' : 'GUARDAR PAGO'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/pagos-doctores')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancelar
                        </button>
                    </div>
                </div>
            </form>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pagos a Doctores"
                sections={manualSections}
            />

            {/* Modal de Creación Rápida de Forma de Pago */}
            {puedeCrearFormaPago && (
                <div style={{ zIndex: 60 }} className="relative">
                    <FormaPagoForm
                        isOpen={isFormaPagoModalOpen}
                        onClose={() => setIsFormaPagoModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchFormasPago();
                            setIsFormaPagoModalOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default PagosDoctoresForm;
