import React from 'react';
import type { Proforma, HistoriaClinica } from '../types';

interface PlanTratamientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    proforma: Proforma | null;
    historia: HistoriaClinica[];
}

const PlanTratamientoModal: React.FC<PlanTratamientoModalProps> = ({ isOpen, onClose, proforma, historia }) => {
    if (!isOpen || !proforma) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full transform transition-all animate-fade-in-down border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-t-xl">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        Plan de Tratamiento #{proforma.numero || proforma.id}
                    </h3>

                </div>

                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-6 flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Fecha del Plan:</p>
                            <p className="font-bold text-gray-800 dark:text-white">{proforma.fecha}</p>
                        </div>

                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamiento</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Piezas / Detalles</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cantidad</th>
                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {(proforma.detalles || []).map((detalle) => {
                                    let isCompleted = false;
                                    let completedPieces: string[] = [];
                                    let allPieces: string[] = [];

                                    if (detalle.piezas) {
                                        // Robust splitting by slash, comma, space, or hyphen
                                        allPieces = detalle.piezas.split(/[\/\s,\-]+/).filter(p => p.trim() !== '');
                                        historia.forEach(h => {
                                            if (h.proformaDetalleId === detalle.id && h.estadoTratamiento === 'terminado' && h.pieza) {
                                                const hPieces = h.pieza.split(/[\/\s,\-]+/).filter(p => p.trim() !== '');
                                                completedPieces.push(...hPieces);
                                            }
                                        });
                                        isCompleted = allPieces.length > 0 && allPieces.every(p => completedPieces.includes(p));
                                    } else {
                                        isCompleted = historia.some(h =>
                                            h.proformaDetalleId === detalle.id &&
                                            h.estadoTratamiento === 'terminado'
                                        );
                                    }

                                    return (
                                        <tr key={detalle.id} className={isCompleted ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                {detalle.arancel?.detalle || 'Tratamiento'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                {detalle.piezas ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {allPieces.map((pieza, idx) => {
                                                            const isPieceDone = completedPieces.includes(pieza);
                                                            return (
                                                                <span
                                                                    key={idx}
                                                                    className={`px-2 py-0.5 rounded text-xs border ${isPieceDone
                                                                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                                        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                                                        }`}
                                                                >
                                                                    {pieza} {isPieceDone && '✓'}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                                {detalle.cantidad}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isCompleted ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                        Terminado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlanTratamientoModal;
