import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Download, Printer } from 'lucide-react';


interface PrintFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPrint: (laboratorioId: number | null, fechaInicio: string, fechaFinal: string) => void;
    onExport?: (laboratorioId: number | null, fechaInicio: string, fechaFinal: string) => void;
    modalMode?: 'print' | 'export';
}

const PrintFilterModal: React.FC<PrintFilterModalProps> = ({ isOpen, onClose, onPrint, onExport, modalMode = 'print' }) => {
    const [laboratorios, setLaboratorios] = useState<any[]>([]);
    const [selectedLaboratorio, setSelectedLaboratorio] = useState<number | null>(null);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFinal, setFechaFinal] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchLaboratoriosWithPayments();
            // Set default dates (current month)
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            setFechaInicio(firstDay.toISOString().split('T')[0]);
            setFechaFinal(lastDay.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const fetchLaboratoriosWithPayments = async () => {
        try {
            // Fetch all pagos to get unique laboratories
            const response = await api.get('/pagos-laboratorios?limit=9999');
            const allPagos = Array.isArray(response.data) ? response.data : response.data.data || [];

            // Extract unique laboratories that have payments
            const labsMap = new Map();
            allPagos.forEach((pago: any) => {
                const lab = pago.trabajoLaboratorio?.laboratorio;
                if (lab && !labsMap.has(lab.id)) {
                    labsMap.set(lab.id, lab);
                }
            });

            const uniqueLabs = Array.from(labsMap.values()).sort((a, b) =>
                a.laboratorio.localeCompare(b.laboratorio)
            );

            setLaboratorios(uniqueLabs);
        } catch (error) {
            console.error('Error fetching laboratorios:', error);
        }
    };

    const handleConfirm = () => {
        if (!fechaInicio || !fechaFinal) {
            alert('Por favor seleccione las fechas');
            return;
        }

        if (modalMode === 'export' && onExport) {
            onExport(selectedLaboratorio, fechaInicio, fechaFinal);
        } else {
            onPrint(selectedLaboratorio, fechaInicio, fechaFinal);
        }
        onClose();
    };

    if (!isOpen) return null;

    const isExport = modalMode === 'export';
    const title = isExport ? 'Exportar Pagos' : 'Imprimir Pagos a Laboratorios';
    const buttonText = isExport ? 'Exportar PDF' : 'Imprimir';
    const buttonColorClass = isExport
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    const iconWrapperClass = isExport
        ? 'bg-red-100 dark:bg-red-900'
        : 'bg-blue-100 dark:bg-blue-900';
    const iconClass = isExport
        ? 'text-red-600 dark:text-red-300'
        : 'text-blue-600 dark:text-blue-300';

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
                        {/* Header with Icon and Title */}
                        <div className="flex items-start mb-4">
                            <div className={`flex-shrink-0 rounded-full p-3 mr-4 ${iconWrapperClass}`}>
                                <svg className={`h-6 w-6 ${iconClass}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isExport ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    )}
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2" id="modal-title">
                                    {title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Seleccione el laboratorio y el rango de fechas para {isExport ? 'exportar' : 'imprimir'} los pagos. Solo se muestran laboratorios con pagos registrados.
                                </p>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="mt-6 space-y-5">
                            {/* Laboratorio Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Laboratorio
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <select
                                        value={selectedLaboratorio || ''}
                                        onChange={(e) =>setSelectedLaboratorio(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                    >
                                        <option value="">-- Seleccione una opción --</option>
                                        {laboratorios.map(lab => (
                                            <option key={lab.id} value={lab.id}>
                                                {lab.laboratorio}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Fecha Inicio y Final - Side by Side */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Fecha Inicio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Fecha Inicio *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type="date"
                                            value={fechaInicio}
                                            onChange={(e) => setFechaInicio(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Fecha Final */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Fecha Final *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type="date"
                                            value={fechaFinal}
                                            onChange={(e) => setFechaFinal(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3">
                        <button
                            type="button"
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonColorClass}`}
                            onClick={handleConfirm}
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintFilterModal;
