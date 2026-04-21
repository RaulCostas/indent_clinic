import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { TrabajoLaboratorio, FormaPago } from '../types';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
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
            title: 'Moneda y Tipo de Cambio',
            content: 'Seleccione la moneda del pago (Bolivianos o Dólares). El tipo de cambio se usa para conversiones y reportes.'
        },
        {
            title: 'Forma de Pago',
            content: 'Seleccione el método de pago utilizado. El sistema actualiza automáticamente el estado del trabajo a "Pagado".'
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
                    }
                }
            }

            const worksToShow = allTrabajos.filter((t: any) =>
                (t.estado === 'terminado' && t.pagado !== 'si' && t.estado !== 'anulado') ||
                (isEdit && currentPaymentWorkId && t.id === currentPaymentWorkId) ||
                (preSelectedWorkId && t.id === preSelectedWorkId)
            );

            setAllUnpaidWorks(worksToShow);

            //formasPago is already filtered and set on line 72
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
            // Check if work belongs to selected Lab
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

    // Handlers
    const handleLabChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = Number(e.target.value);
        setSelectedLabId(val || '');
        setSelectedPatientId(''); // Reset subsequent selects
        setIdTrabajosLaboratorios('');
    };

    const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = Number(e.target.value);
        setSelectedPatientId(val || '');
        setIdTrabajosLaboratorios(''); // Reset work select
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!idTrabajosLaboratorios || !idFormaPago) {
            Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
            return;
        }

        // Calculate monto (Total a Pagar)
        const selectedWork = availableWorks.find(w => w.id === Number(idTrabajosLaboratorios));
        const amountInBs = selectedWork ? Number(selectedWork.total) : 0;
        const finalMonto = moneda === 'Dólares' && Number(tc) > 0 ? Number((amountInBs / Number(tc)).toFixed(2)) : amountInBs;

        const payload = {
            fecha,
            idTrabajos_Laboratorios: Number(idTrabajosLaboratorios),
            monto: Number(finalMonto),
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
                Swal.fire({
                    icon: 'success',
                    title: 'Pago Registrado',
                    text: 'El pago se ha guardado correctamente',
                    timer: 1500,
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

    // Calculate details for display
    const selectedWork = availableWorks.find(w => w.id === idTrabajosLaboratorios);
    const amountInBs = selectedWork ? Number(selectedWork.total) : 0;
    const amountToPay = moneda === 'Dólares' && Number(tc) > 0 ? amountInBs / Number(tc) : amountInBs;

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
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                            {/* 2. Select Paciente (Dependent on Lab) */}
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
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                            {/* 3. Select Trabajo (Dependent on Patient) */}
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
                                        onChange={(e) => setIdTrabajosLaboratorios(Number(e.target.value))}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        required={!!selectedPatientId}
                                        disabled={!selectedPatientId || isEdit}
                                    >
                                        <option value="">Seleccione el Trabajo...</option>
                                        {availableWorks.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.precioLaboratorio?.detalle || 'Trabajo'} - {t.fecha ? formatDate(t.fecha) : ''} - Bs. {t.total}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedPatientId && availableWorks.length === 0 && (
                                    <p className="text-xs text-yellow-600 mt-1">Este paciente no tiene trabajos pendientes en este laboratorio.</p>
                                )}
                            </div>

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
                                            className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                )}
                            </div>

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
                                            className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                            {/* Summary / Total Display */}
                            {selectedWork && (
                                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded p-4 text-right">
                                    <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">Monto del Trabajo (Base):</span>
                                    <span className="font-medium text-gray-900 dark:text-white">Bs. {amountInBs.toFixed(2)}</span>

                                    <div className="mt-2 text-xl font-bold text-gray-800 dark:text-white">
                                        Total a Pagar: <span className="text-green-600 dark:text-green-400">
                                            {moneda === 'Dólares' ? '$us ' : 'Bs. '} {amountToPay.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-start gap-4 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {isEdit ? 'Actualizar' : 'Guardar'}
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
