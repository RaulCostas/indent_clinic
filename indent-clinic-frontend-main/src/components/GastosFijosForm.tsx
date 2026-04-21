import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { GastoFijo } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import { Plus } from 'lucide-react';


interface GastosFijosFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

const GastosFijosForm: React.FC<GastosFijosFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const { clinicaSeleccionada, clinicas } = useClinica();
    const isEditing = Boolean(id);


    const [dia, setDia] = useState<number>(1);
    const [anual, setAnual] = useState(false);
    const [mes, setMes] = useState('');
    const [gastoFijo, setGastoFijo] = useState('');
    const [monto, setMonto] = useState<number | string>(0);
    const [moneda, setMoneda] = useState('Bolivianos');
    const [clinicaId, setClinicaId] = useState<number | string>('');
    const [error, setError] = useState('');
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Gastos Fijos',
            content: 'Registre gastos recurrentes mensuales o anuales. Especifique día de pago, monto y moneda.'
        },
        {
            title: 'Gastos Anuales',
            content: 'Para gastos que se pagan una vez al año, marque "Anual" y seleccione el mes correspondiente. El sistema recordará el pago anual.'
        },
        {
            title: 'Seguimiento',
            content: 'Los gastos fijos aparecen en el calendario de pagos. Puede registrar cada pago mensual desde la lista de gastos fijos.'
        }];

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                fetchGasto();
            } else {

                setDia(1);
                setAnual(false);
                setMes('');
                setGastoFijo('');
                setMonto('');
                setMoneda('Bolivianos');
                setClinicaId(clinicaSeleccionada || '');
                setError('');
            }
        }
    }, [id, isOpen]); // Removed clinicaSeleccionada from dependencies to prevent form reset while typing

    const fetchGasto = async () => {
        try {
            const response = await api.get<GastoFijo>(`/gastos-fijos/${id}`);
            const item = response.data;

            setDia(item.dia);
            setAnual(item.anual);
            setMes(item.mes || '');
            setGastoFijo(item.gasto_fijo);
            setMonto(item.monto);
            setMoneda(item.moneda);
            setClinicaId(item.clinicaId || clinicaSeleccionada || '');
        } catch (error) {
            console.error('Error fetching gasto:', error);
            Swal.fire('Error', 'No se pudo cargar el gasto fijo', 'error');
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (anual && !mes) {
            setError('Debe seleccionar un mes para gastos anuales.');
            return;
        }

        const data = {

            dia,
            anual,
            mes: anual ? mes : null,
            gasto_fijo: gastoFijo,
            monto: Number(monto),
            moneda,
            clinicaId: clinicaId ? Number(clinicaId) : null
        };

        try {
            if (isEditing) {
                await api.patch(`/gastos-fijos/${id}`, data);
                await Swal.fire({
                    icon: 'success',
                    title: 'Gasto Fijo Actualizado',
                    text: 'Gasto fijo actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/gastos-fijos', data);
                await Swal.fire({
                    icon: 'success',
                    title: 'Gasto Fijo Creado',
                    text: 'Gasto fijo creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving gasto fijo:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el gasto fijo';
            Swal.fire({
                icon: 'error',
                title: 'Aviso',
                text: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-md h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg text-yellow-600 dark:text-yellow-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                            {isEditing ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}
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
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">Error!</strong> <span className="block sm:inline ml-1">{error}</span>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Clínica Selector */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Clínica:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                <select
                                    value={clinicaId}
                                    onChange={(e) => setClinicaId(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                >
                                    <option value="" disabled className="dark:bg-gray-800">Seleccione Clínica...</option>
                                    {clinicas.map((c: any) => (
                                        <option key={c.id} value={c.id} className="dark:bg-gray-800">{c.nombre}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div>
                                <label className="block font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Día</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={dia}
                                        onChange={(e) => setDia(parseInt(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition duration-200"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={anual}
                                    onChange={(e) => {
                                        setAnual(e.target.checked);
                                        if (!e.target.checked) setMes('');
                                    }}
                                    className="form-checkbox h-5 w-5 text-blue-600 dark:text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="ml-2 font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Anual</span>
                            </label>
                        </div>

                        {anual && (
                            <div>
                                <label className="block font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Mes</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <select
                                        value={mes}
                                        onChange={(e) => setMes(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none transition duration-200"
                                        required={anual}
                                    >
                                        <option value="">Seleccione un mes</option>
                                        {months.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Gasto Fijo</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                <input
                                    type="text"
                                    value={gastoFijo}
                                    onChange={(e) => setGastoFijo(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                                    placeholder="Ej. Alquiler, Internet"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Monto</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        placeholder="Ej: 150.00"
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition duration-200"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Moneda</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    <select
                                        value={moneda}
                                        onChange={(e) => setMoneda(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none transition duration-200"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        <option value="Bolivianos">Bolivianos</option>
                                        <option value="Dólares">Dólares</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-start space-x-3 mt-8">
                            <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {isEditing ? 'Actualizar' : 'Guardar'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> Cancelar
                            </button>
                        </div>
                    </form>
                    <ManualModal
                        isOpen={showManual}
                        onClose={() => setShowManual(false)}
                        title="Manual - Gastos Fijos"
                        sections={manualSections}
                    />
                </div>
            </div>
        </div>
    );
};

export default GastosFijosForm;

