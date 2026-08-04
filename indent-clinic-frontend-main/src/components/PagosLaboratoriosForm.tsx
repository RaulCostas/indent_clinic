import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { TrabajoLaboratorio, FormaPago } from '../types';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import { formatNumber } from '../utils/formatters';
import FormaPagoForm from './FormaPagoForm';


interface PagosLaboratoriosFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    preSelectedWorkId?: number | string | null;
    onSaveSuccess?: () => void;
}

const PagosLaboratoriosForm: React.FC<PagosLaboratoriosFormProps> = ({ isOpen, onClose, id, preSelectedWorkId, onSaveSuccess }) => {
    const { clinicaSeleccionada } = useClinica();
    const isEdit = !!id;

    // Form Fields
    const [fecha, setFecha] = useState(() => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - offset).toISOString().split('T')[0];
    });
    const [moneda, setMoneda] = useState('Bolivianos');
    const [tc, setTc] = useState<number | string>(6.96);
    const [idFormaPago, setIdFormaPago] = useState<number | ''>('');
    const [clinicaId, setClinicaId] = useState<number>(0);
    // Manual monto input for partial payments
    const [montoInput, setMontoInput] = useState<string>('');
    const [descuentoInput, setDescuentoInput] = useState<string>('0');
    const [montoError, setMontoError] = useState<string>('');
    // Existing payments for the selected work (to show dates)
    const [pagosExistentes, setPagosExistentes] = useState<any[]>([]);

    // Cascading Select States
    const [selectedLabId, setSelectedLabId] = useState<number | ''>('');
    const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
    const [idTrabajosLaboratorios, setIdTrabajosLaboratorios] = useState<number | ''>('');

    // Data
    const [allUnpaidWorks, setAllUnpaidWorks] = useState<TrabajoLaboratorio[]>([]);
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);

    // Modal Forma Pago
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
            title: 'Pagos a Laboratorios',
            content: 'Registre pagos a laboratorios externos por trabajos realizados. Seleccione el laboratorio, paciente y trabajo específico para registrar el pago.'
        },
        {
            title: 'Pago a Cuenta (Abono Parcial)',
            content: 'Puede registrar un pago parcial ingresando un monto menor al saldo pendiente. El trabajo permanecerá en "Deudas" hasta que se cubra el total. El campo "Monto a Abonar" se pre-carga con el saldo pendiente, pero puede reducirlo.'
        },
        {
            title: 'Moneda y Tipo de Cambio',
            content: 'Seleccione la moneda del pago (Bolivianos o Dólares). El tipo de cambio se usa para conversiones y reportes.'
        },
        {
            title: 'Forma de Pago',
            content: 'Seleccione el método de pago utilizado. El sistema actualiza automáticamente el estado del trabajo a "Pagado" solo cuando se cubra el total.'
        }];

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen, id, preSelectedWorkId, isEdit, clinicaSeleccionada]);


    const fetchInitialData = async () => {
        try {
            const clinicaParam = clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : '';
            const [trabajosRes, formasPagoRes] = await Promise.all([
                api.get(`/trabajos-laboratorios?pagado=no&limit=1000${clinicaParam}`),
                api.get('/forma-pago?limit=1000')
            ]);

            const activeFormasPago = (formasPagoRes.data.data || []).filter((fp: any) => fp.estado === 'activo');
            setFormasPago(activeFormasPago);

            let allTrabajos: TrabajoLaboratorio[] = [];
            if (Array.isArray(trabajosRes.data)) {
                if (trabajosRes.data.length === 2 && Array.isArray(trabajosRes.data[0]) && typeof trabajosRes.data[1] === 'number') {
                    allTrabajos = trabajosRes.data[0];
                } else {
                    allTrabajos = trabajosRes.data;
                }
            } else if (trabajosRes.data?.data && Array.isArray(trabajosRes.data.data)) {
                allTrabajos = trabajosRes.data.data;
            }

            let currentPaymentWorkId: number | null = null;

            // Logic for Edit Mode
            if (isEdit) {
                try {
                    const pagoRes = await api.get(`/pagos-laboratorios/${id}`);
                    const pago = pagoRes.data;

                    if (pago) {
                        try {
                            if (pago.fecha) {
                                const dateStr = typeof pago.fecha === 'string' ? pago.fecha.split('T')[0] : new Date(pago.fecha).toISOString().split('T')[0];
                                setFecha(dateStr);
                            }
                        } catch (e) {
                            console.error('Error parsing date:', e);
                        }

                        // Normalize Currency
                        let normalizedMoneda = 'Bolivianos';
                        if (pago.moneda === 'Bs') normalizedMoneda = 'Bolivianos';
                        else if (pago.moneda === '$us' || pago.moneda === 'Sus') normalizedMoneda = 'Dólares';
                        else normalizedMoneda = pago.moneda || 'Bolivianos';

                        setMoneda(normalizedMoneda);
                        setTc(Number(pago.tc) || 6.96);
                        setMontoInput(String(pago.monto || ''));
                        setDescuentoInput(String(pago.descuento || '0'));

                        if (pago.idforma_pago) setIdFormaPago(pago.idforma_pago);
                        setClinicaId(pago.clinicaId || 0);

                        if (pago.trabajoLaboratorio) {
                            currentPaymentWorkId = pago.trabajoLaboratorio.id;
                            setSelectedLabId(pago.trabajoLaboratorio.idLaboratorio || '');
                            setSelectedPatientId(pago.trabajoLaboratorio.idPaciente || '');
                            setIdTrabajosLaboratorios(pago.trabajoLaboratorio.id);
                        }
                    }
                } catch (err) {
                    console.error('Error loading single payment:', err);
                }
            } else {
                setClinicaId(clinicaSeleccionada || 0);
                if (preSelectedWorkId) {
                    // Logic for "Ver Deudas" -> "Pagar" Pre-fill
                    const targetWork = allTrabajos.find((w: any) => w.id === preSelectedWorkId);
                    if (targetWork) {
                        setFecha(getLocalDateString());
                        setMoneda((targetWork as any).moneda || 'Bolivianos');

                        setSelectedLabId(targetWork.idLaboratorio);
                        setSelectedPatientId(targetWork.idPaciente);
                        setIdTrabajosLaboratorios(targetWork.id);
                        currentPaymentWorkId = targetWork.id;

                        // Pre-fill monto with the pending balance
                        const saldo = Number(targetWork.total) - Number(targetWork.monto_pagado || 0);
                        setDescuentoInput('0');
                        setMontoInput(saldo.toFixed(2));

                        // Fetch existing payments to show dates in Resumen de Pagos
                        try {
                            const pagosRes = await api.get(`/pagos-laboratorios?idTrabajos_Laboratorios=${targetWork.id}`);
                            const pagos = Array.isArray(pagosRes.data) ? pagosRes.data : (pagosRes.data.data || []);
                            setPagosExistentes(pagos);
                        } catch {
                            setPagosExistentes([]);
                        }
                    }
                } else {
                    setMontoInput('');
                    setDescuentoInput('0');
                }
            }

            const worksToShow = allTrabajos.filter((t: any) =>
                (t.estado === 'terminado' && t.pagado !== 'si' && t.estado !== 'anulado') ||
                (isEdit && currentPaymentWorkId && t.id === currentPaymentWorkId) ||
                (preSelectedWorkId && t.id === preSelectedWorkId)
            );

            setAllUnpaidWorks(worksToShow);

        } catch (error) {
            console.error('Error fetching initial data:', error);
            Swal.fire('Error', 'No se pudieron cargar los datos iniciales', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Derived Lists for Cascading Dropdowns
    const availableLabs = useMemo(() => {
        const labsMap = new Map();
        allUnpaidWorks.forEach(work => {
            if (work.laboratorio) {
                labsMap.set(work.laboratorio.id, work.laboratorio.laboratorio);
            }
        });
        return Array.from(labsMap.entries()).map(([id, name]) => ({ id, name }));
    }, [allUnpaidWorks]);

    const availablePatients = useMemo(() => {
        if (!selectedLabId) return [];
        const patientsMap = new Map();
        allUnpaidWorks.forEach(work => {
            if (work.laboratorio && work.laboratorio.id === selectedLabId && work.paciente) {
                patientsMap.set(work.paciente.id, `${work.paciente.nombre} ${work.paciente.paterno}`);
            }
        });
        return Array.from(patientsMap.entries()).map(([id, name]) => ({ id, name }));
    }, [allUnpaidWorks, selectedLabId]);

    const availableWorks = useMemo(() => {
        if (!selectedLabId || !selectedPatientId) return [];
        return allUnpaidWorks.filter(work =>
            work.laboratorio?.id === selectedLabId &&
            work.paciente?.id === selectedPatientId
        );
    }, [allUnpaidWorks, selectedLabId, selectedPatientId]);

    // Derived financial values for the selected work
    const selectedWork = availableWorks.find(w => w.id === idTrabajosLaboratorios);
    const totalTrabajoBs = selectedWork ? Number(selectedWork.total) : 0;
    const montoPagadoBs = selectedWork ? Number(selectedWork.monto_pagado || 0) : 0;
    const saldoPendienteBs = totalTrabajoBs - montoPagadoBs;
    const descuentoBs = Number(descuentoInput) || 0;
    const totalAPagarBs = Math.max(0, saldoPendienteBs - descuentoBs);
    const montoIngresadoBs = Number(montoInput) || 0;
    const montoFinalDisplay = moneda === 'Dólares' && Number(tc) > 0
        ? montoIngresadoBs / Number(tc)
        : montoIngresadoBs;

    // When a work is selected, pre-fill monto with saldo pendiente and load existing payments
    const handleWorkChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const workId = Number(e.target.value);
        setIdTrabajosLaboratorios(workId || '');
        setMontoError('');
        setDescuentoInput('0');
        if (workId) {
            const work = availableWorks.find(w => w.id === workId);
            if (work) {
                const saldo = Number(work.total) - Number(work.monto_pagado || 0);
                setMontoInput(saldo.toFixed(2));
            }
            // Fetch existing payments to show dates
            try {
                const res = await api.get(`/pagos-laboratorios?idTrabajos_Laboratorios=${workId}`);
                const pagos = Array.isArray(res.data) ? res.data : (res.data.data || []);
                setPagosExistentes(pagos);
            } catch {
                setPagosExistentes([]);
            }
        } else {
            setMontoInput('');
            setPagosExistentes([]);
        }
    };

    // Handlers
    const handleLabChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = Number(e.target.value);
        setSelectedLabId(val || '');
        setSelectedPatientId('');
        setIdTrabajosLaboratorios('');
        setMontoInput('');
        setDescuentoInput('0');
        setMontoError('');
        setPagosExistentes([]);
    };

    const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = Number(e.target.value);
        setSelectedPatientId(val || '');
        setIdTrabajosLaboratorios('');
        setMontoInput('');
        setDescuentoInput('0');
        setMontoError('');
        setPagosExistentes([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!idTrabajosLaboratorios || !idFormaPago) {
            Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
            return;
        }

        const montoAbonoEnMonedaOriginal = Number(montoInput) || 0;
        const descuentoEnMonedaOriginal = Number(descuentoInput) || 0;

        if (montoAbonoEnMonedaOriginal <= 0 && descuentoEnMonedaOriginal <= 0) {
            Swal.fire('Error', 'Ingrese un monto a abonar o un descuento mayor a 0', 'error');
            return;
        }

        // For display: convert to Bs base if Dólares
        const montoAbonoParaServidor = moneda === 'Dólares' && Number(tc) > 0
            ? Number((montoAbonoEnMonedaOriginal * Number(tc)).toFixed(2)) // convert $us → Bs for balance tracking
            : montoAbonoEnMonedaOriginal;

        const descuentoParaServidor = moneda === 'Dólares' && Number(tc) > 0
            ? Number((descuentoEnMonedaOriginal * Number(tc)).toFixed(2))
            : descuentoEnMonedaOriginal;

        const totalCoberturaParaServidor = montoAbonoParaServidor + descuentoParaServidor;

        // Validate against pending balance (in Bs)
        if (totalCoberturaParaServidor > saldoPendienteBs + 0.01) {
            Swal.fire('Error', `La suma de abono y descuento (Bs ${totalCoberturaParaServidor.toFixed(2)}) supera el saldo pendiente (Bs ${saldoPendienteBs.toFixed(2)})`, 'error');
            return;
        }

        const payload = {
            fecha,
            idTrabajos_Laboratorios: Number(idTrabajosLaboratorios),
            monto: moneda === 'Dólares' ? montoAbonoParaServidor : montoAbonoEnMonedaOriginal,
            descuento: moneda === 'Dólares' ? descuentoParaServidor : descuentoEnMonedaOriginal,
            moneda,
            tc: moneda === 'Dólares' ? Number(tc) : 0,
            idforma_pago: Number(idFormaPago),
            clinicaId: clinicaId !== 0 ? clinicaId : null
        };

        try {
            if (isEdit) {
                await api.patch(`/pagos-laboratorios/${id}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Pago Actualizado',
                    text: 'El pago se ha actualizado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/pagos-laboratorios', payload);
                const esSaldado = totalCoberturaParaServidor >= saldoPendienteBs - 0.01;
                Swal.fire({
                    icon: 'success',
                    title: esSaldado ? '✅ Pago Completo' : '🟡 Abono Registrado',
                    text: esSaldado
                        ? 'El trabajo quedó completamente saldado.'
                        : `Abono de Bs ${totalCoberturaParaServidor.toFixed(2)} registrado. Saldo restante: Bs ${(saldoPendienteBs - totalCoberturaParaServidor).toFixed(2)}`,
                    timer: 2500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving pago:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error desconocido';
            const detailMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
            Swal.fire('Error al guardar', `Detalles: ${detailMsg}. Por favor intente nuevamente.`, 'error');
        }
    };

    if (!isOpen) return null;

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
                <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-green-100 dark:bg-green-900 rounded-lg text-green-600 dark:text-green-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </span>
                                {isEdit ? 'Editar Pago' : 'Nuevo Pago a Laboratorio'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowManual(true)}
                                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                title="Ayuda / Manual"
                            >
                                ?
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Fecha */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        required
                                    />
                                </div>
                            </div>

                            {/* 1. Select Laboratorio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Laboratorio</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                    </div>
                                    <select
                                        value={selectedLabId}
                                        onChange={handleLabChange}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        required
                                        disabled={isEdit}
                                    >
                                        <option value="">Seleccione Laboratorio...</option>
                                        {availableLabs.map((lab) => (
                                            <option key={lab.id} value={lab.id}>{lab.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 2. Select Paciente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paciente</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <select
                                        value={selectedPatientId}
                                        onChange={handlePatientChange}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        required={!!selectedLabId}
                                        disabled={!selectedLabId || isEdit}
                                    >
                                        <option value="">Seleccione Paciente...</option>
                                        {availablePatients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 3. Select Trabajo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trabajo de Laboratorio</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                    <select
                                        value={idTrabajosLaboratorios}
                                        onChange={handleWorkChange}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        required={!!selectedPatientId}
                                        disabled={!selectedPatientId || isEdit}
                                    >
                                        <option value="">Seleccione el Trabajo...</option>
                                        {availableWorks.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.precioLaboratorio?.detalle || 'Trabajo'} - {t.fecha ? formatDate(t.fecha) : ''} - Total: {formatNumber(t.total)} Bs.
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedPatientId && availableWorks.length === 0 && (
                                    <p className="text-xs text-yellow-600 mt-1">Este paciente no tiene trabajos pendientes en este laboratorio.</p>
                                )}
                            </div>

                            {/* Financial Summary Card */}
                            {selectedWork && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-750 border border-blue-200 dark:border-gray-600 rounded-xl p-4 space-y-2">
                                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M15 11h.01M12 11h.01M12 7h.01M3 7h1m8 8h.01M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Resumen de Pagos
                                    </h3>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Costo Total:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">Bs. {formatNumber(totalTrabajoBs)}</span>
                                    </div>
                                    {pagosExistentes.length > 0 && (
                                        <div className="space-y-1 border-t border-blue-100 dark:border-gray-600 pt-2 mt-1">
                                            {pagosExistentes.map((p: any, i: number) => {
                                                const fechaStr = p.fecha
                                                    ? (typeof p.fecha === 'string' ? p.fecha.split('T')[0] : new Date(p.fecha).toISOString().split('T')[0])
                                                    : '';
                                                const [y, m, d] = fechaStr.split('-');
                                                const fechaFmt = fechaStr ? `${d}/${m}/${y}` : '-';
                                                return (
                                                    <div key={p.id ?? i} className="flex justify-between text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            Abono {i + 1}
                                                            <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({fechaFmt})</span>
                                                        </span>
                                                        <span className="font-medium text-amber-600 dark:text-amber-400">Bs. {formatNumber(Number(p.monto))}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {montoPagadoBs > 0 && pagosExistentes.length === 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">Ya Abonado:</span>
                                            <span className="font-medium text-amber-600 dark:text-amber-400">Bs. {formatNumber(montoPagadoBs)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm border-t border-blue-200 dark:border-gray-600 pt-2 mt-2">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Saldo Pendiente:</span>
                                        <span className="font-bold text-red-600 dark:text-red-400">Bs. {formatNumber(saldoPendienteBs)}</span>
                                    </div>
                                    {descuentoBs > 0 && (
                                        <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300 font-medium">
                                            <span>Descuento (resta):</span>
                                            <span>- Bs. {formatNumber(descuentoBs)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Descuento & Monto a Abonar Inputs */}
                            {selectedWork && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Descuento (Resta) */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Descuento <span className="text-xs text-purple-600 dark:text-purple-400 font-normal">(Resta al total)</span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-purple-500 font-bold text-sm">Bs.</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={saldoPendienteBs}
                                                    value={descuentoInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDescuentoInput(val);
                                                        const numDesc = Number(val) || 0;
                                                        if (numDesc > saldoPendienteBs + 0.001) {
                                                            setMontoError(`El descuento no puede superar el saldo pendiente (Bs. ${formatNumber(saldoPendienteBs)})`);
                                                        } else {
                                                            const nuevoMonto = Math.max(0, saldoPendienteBs - numDesc);
                                                            setMontoInput(nuevoMonto > 0 ? nuevoMonto.toFixed(2) : '0');
                                                            setMontoError('');
                                                        }
                                                    }}
                                                    placeholder="0.00"
                                                    className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold"
                                                />
                                            </div>
                                        </div>

                                        {/* Monto a Abonar */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Monto a Abonar
                                                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                                                    (máx. Bs. {formatNumber(totalAPagarBs)})
                                                </span>
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <span className="text-gray-400 font-bold text-sm">Bs.</span>
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max={totalAPagarBs}
                                                    value={montoInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setMontoInput(val);
                                                        const numAbono = Number(val) || 0;
                                                        const numDesc = Number(descuentoInput) || 0;
                                                        if (numAbono + numDesc > saldoPendienteBs + 0.001) {
                                                            setMontoError(`El abono más el descuento (Bs. ${formatNumber(numAbono + numDesc)}) supera el saldo pendiente (Bs. ${formatNumber(saldoPendienteBs)})`);
                                                        } else {
                                                            setMontoError('');
                                                        }
                                                    }}
                                                    placeholder={`Ej: ${totalAPagarBs.toFixed(2)}`}
                                                    className={`w-full pl-10 px-3 py-2 border rounded text-sm focus:ring-2 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold transition-colors ${
                                                        montoError
                                                            ? 'border-red-400 dark:border-red-500 focus:ring-red-400'
                                                            : 'border-gray-300 dark:border-gray-600 focus:ring-green-500'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {montoError ? (
                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {montoError}
                                        </p>
                                    ) : (montoIngresadoBs + descuentoBs) > 0 && (montoIngresadoBs + descuentoBs) < saldoPendienteBs - 0.01 ? (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Pago parcial — quedará un saldo de Bs. {formatNumber(saldoPendienteBs - (montoIngresadoBs + descuentoBs))}
                                        </p>
                                    ) : (montoIngresadoBs + descuentoBs) >= saldoPendienteBs - 0.01 && (montoIngresadoBs + descuentoBs) > 0 ? (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Pago completo — el trabajo quedará saldado
                                        </p>
                                    ) : null}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Moneda */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-400 font-bold">$</span>
                                        </div>
                                        <select
                                            value={moneda}
                                            onChange={(e) => setMoneda(e.target.value)}
                                            className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        >
                                            <option value="" disabled>-- Seleccione --</option>
                                            <option value="Bolivianos">Bolivianos</option>
                                            <option value="Dólares">Dólares</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Tipo de Cambio */}
                                {moneda === 'Dólares' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Cambio</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={tc}
                                            onChange={(e) => setTc(e.target.value)}
                                            placeholder="Ej: 6.96"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Total a Pagar en moneda seleccionada */}
                            {selectedWork && montoIngresadoBs > 0 && moneda === 'Dólares' && Number(tc) > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 text-right">
                                    <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Total a Pagar:</span>
                                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                        $us. {formatNumber(montoFinalDisplay)}
                                    </span>
                                </div>
                            )}

                            {/* Forma de Pago */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pago</label>
                                <div className="flex gap-2 relative">
                                    <div className="relative flex-grow">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </div>
                                        <select
                                            value={idFormaPago}
                                            onChange={(e) => setIdFormaPago(Number(e.target.value))}
                                            className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            required
                                        >
                                            <option value="">Seleccione Forma de Pago...</option>
                                            {formasPago.map((fp) => (
                                                <option key={fp.id} value={fp.id}>
                                                    {fp.forma_pago}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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

                            <div className="flex justify-start gap-4 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                                <button
                                    type="submit"
                                    disabled={!!montoError}
                                    className={`font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all shadow-md ${
                                        montoError
                                            ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed opacity-60'
                                            : 'bg-green-600 hover:bg-green-700 text-white transform hover:-translate-y-0.5'
                                    }`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {isEdit ? 'Actualizar' : 'Registrar Pago'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Pagos a Laboratorios"
                sections={manualSections}
            />

            {/* Modal Creación Rápida Forma de Pago */}
            {puedeCrearFormaPago && (
                <div style={{ zIndex: 60 }} className="relative">
                    <FormaPagoForm
                        isOpen={isFormaPagoModalOpen}
                        onClose={() => setIsFormaPagoModalOpen(false)}
                        onSaveSuccess={() => {
                            api.get('/forma-pago?limit=1000').then((formasPagoRes) => {
                                const activeFormasPago = (formasPagoRes.data.data || formasPagoRes.data || []).filter((fp: any) => fp.estado === 'activo');
                                setFormasPago(activeFormasPago);
                            });
                            setIsFormaPagoModalOpen(false);
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default PagosLaboratoriosForm;
