import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';
import type { Proforma } from '../types';
import { formatDateUTC } from '../utils/formatters';
import { getLocalDateString } from '../utils/dateUtils';

interface RecordatorioPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    proformaId: number;
    proforma: Proforma | null;
}

const RecordatorioPlanModal: React.FC<RecordatorioPlanModalProps> = ({ isOpen, onClose, proformaId, proforma }) => {
    const [dias, setDias] = useState<number>(0);
    const [mensaje, setMensaje] = useState('');
    const [estado, setEstado] = useState('activo');
    const [loading, setLoading] = useState(false);
    const [fechaCalculada, setFechaCalculada] = useState<string>('');

    const [existingRecordatorio, setExistingRecordatorio] = useState<any>(null);

    useEffect(() => {
        if (isOpen && proformaId) {
            setLoading(true);
            setDias(0);

            // Initial calculation based on proforma date
            const proformaDate = proforma?.fecha || getLocalDateString();
            setFechaCalculada(proformaDate.split('T')[0]);

            setMensaje(`Recordatorio para Plan de Tratamiento #${proforma?.numero || proforma?.id || proformaId}`);
            setEstado('activo');
            setExistingRecordatorio(null);

            // Fetch existing recordatorios for this proforma
            api.get(`/recordatorio-plan/proforma/${proformaId}`)
                .then(response => {
                    const recordatorios = response.data;
                    if (recordatorios && recordatorios.length > 0) {
                        const rec = recordatorios[0];
                        setExistingRecordatorio(rec);
                        setDias(rec.dias);
                        setMensaje(rec.mensaje);
                        setEstado(rec.estado);
                        // Recalculate date based on fetched days
                        // Logic below will handle effect
                    }
                })
                .catch(err => console.error("Error checking existing recordatorio:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, proforma, proformaId]);

    // Recalculate date when days change
    useEffect(() => {
        if ((proforma?.fecha || proformaId) && dias >= 0) {
            const baseDateStr = proforma?.fecha || getLocalDateString();

            // Parse date manually to avoid timezone issues
            const parts = baseDateStr.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);

            // Use UTC to avoid timezone shifts (e.g. crossing DST or bad offsets)
            const date = new Date(Date.UTC(year, month, day));
            date.setUTCDate(date.getUTCDate() + Number(dias));

            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');

            setFechaCalculada(`${y}-${m}-${d}`);
        }
    }, [dias, proforma, proformaId]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);

        try {
            const payload = {
                proformaId,
                fechaRecordatorio: fechaCalculada,
                dias: Number(dias),
                mensaje,
                estado
            };

            if (existingRecordatorio) {
                await api.patch(`/recordatorio-plan/${existingRecordatorio.id}`, payload);
            } else {
                await api.post('/recordatorio-plan', payload);
            }

            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'Recordatorio guardado exitosamente',
                timer: 1500,
                showConfirmButton: false
            });
            onClose();
        } catch (error) {
            console.error('Error saving recordatorio:', error);
            Swal.fire('Error', 'No se pudo guardar el recordatorio', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-fade-in-down border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {existingRecordatorio ? 'Actualizar Recordatorio' : 'Programar Recordatorio'}
                    </h3>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tratamiento
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="pl-10 text-gray-900 dark:text-white font-medium p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                Plan #{proforma?.numero || proforma?.id || proformaId}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha Plan
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="pl-10 text-gray-600 dark:text-gray-400 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    {proforma?.fecha ? formatDateUTC(proforma.fecha) : 'N/A'}
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Dias para aviso
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    value={dias}
                                    onChange={(e) => setDias(parseInt(e.target.value) || 0)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 text-center">
                        <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-1">El recordatorio aparecerá el:</p>
                        <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                            {formatDateUTC(fechaCalculada)}
                        </p>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl -mx-6 -mb-6 mt-6">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {existingRecordatorio ? 'Actualizar' : 'Guardar'}
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecordatorioPlanModal;
