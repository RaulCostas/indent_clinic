
import React, { useState, useEffect } from 'react';
import type { PagosPedidos } from '../types';
import { Download, Printer } from 'lucide-react';


interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (providerName: string | null) => void;
    pagos: PagosPedidos[]; // Pass all pagos to extract unique providers
    mode?: 'print' | 'export';
}

const PagosPedidosPrintModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, pagos, mode = 'print' }) => {
    const [selectedProvider, setSelectedProvider] = useState('');
    const [providers, setProviders] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && pagos.length > 0) {
            // Extract unique provider names from pagos
            const uniqueProviders = Array.from(new Set(
                pagos
                    .map(p => p.pedido?.proveedor?.proveedor)
                    .filter((p): p is string => !!p)
            )).sort();
            setProviders(uniqueProviders);
        }
    }, [isOpen, pagos]);

    const handleConfirm = () => {
        onConfirm(selectedProvider || null);
        onClose();
    };

    if (!isOpen) return null;

    const isExport = mode === 'export';
    const title = isExport ? 'Exportar Pagos de Pedidos' : 'Imprimir Pagos de Pedidos';
    const confirmButtonText = isExport ? 'Exportar PDF' : 'Imprimir';
    const confirmButtonClass = isExport
        ? "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
        : "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm";

    const iconBg = isExport ? "bg-red-100" : "bg-blue-100";
    const iconColor = isExport ? "text-red-600" : "text-blue-600";

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExport ? "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" : "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"} />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        Seleccione el proveedor del cual desea {isExport ? 'exportar' : 'imprimir'} los pagos. Si deja la opción por defecto, se incluirán todos los pagos visibles.
                                    </p>

                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Proveedor
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <select
                                            value={selectedProvider}
                                            onChange={(e) =>setSelectedProvider(e.target.value)}
                                            className="block w-full pl-10 pr-10 py-2 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="">-- Todos los Proveedores --</option>
                                            {providers.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                        <button
                            type="button"
                            className={confirmButtonClass}
                            onClick={handleConfirm}
                        >
                            {confirmButtonText}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PagosPedidosPrintModal;
