import React, { useState } from 'react';
import type { HistoriaClinica } from '../types';

interface HistoriaClinicaListProps {
    historia: HistoriaClinica[];
    onDelete: (id: number) => void;
    onEdit: (item: HistoriaClinica) => void;
    onNewHistoria?: () => void;
    onViewPlan?: () => void;
    onPrint?: () => void;
    onReminder?: (item: HistoriaClinica) => void;
    onSign?: (item: HistoriaClinica) => void;
    onViewSeguimiento?: () => void;

}

import { formatDate } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';
import { Printer, PenTool, X } from 'lucide-react';


const HistoriaClinicaList: React.FC<HistoriaClinicaListProps> = ({ historia, onDelete, onEdit, onNewHistoria, onPrint, onViewPlan, onReminder, onSign, onViewSeguimiento }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedSignature, setSelectedSignature] = useState('');
    const itemsPerPage = 5;

    const manualSections: ManualSection[] = [
        {
            title: 'Seguimiento Clínico',
            content: 'Registro detallado de todos los tratamientos realizados al paciente.'
        },
        {
            title: 'Estados',
            content: 'Cada registro muestra el estado del Tratamiento (Terminado/Pendiente) y del Plan de Tratamiento u Honorario (Cobrado/Pendiente).'
        },
        {
            title: 'Acciones',
            content: 'Puede Editar un registro, Eliminarlo o Imprimir la lista. También puede ver el Plan de Tratamiento asociado si el registro proviene de un Plan de Tratamiento.'
        },
        {
            title: 'Recordatorio de Tratamiento',
            content: 'Utilice el botón de campana/ícono índigo para programar un recordatorio de seguimiento para un tratamiento específico. Este recordatorio aparecerá en la página de inicio cuando llegue la fecha programada.'
        }];

    const filteredHistoria = historia.filter(item => {
        const term = searchTerm.toLowerCase();
        const pieza = item.pieza?.toLowerCase() || '';
        const tratamiento = item.tratamiento?.toLowerCase() || '';
        return pieza.includes(term) || tratamiento.includes(term);
    });

    // Pagination
    const totalPages = Math.ceil(filteredHistoria.length / itemsPerPage);
    const paginatedHistoria = filteredHistoria.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </span>
                Historial de Seguimiento Clínico
            </h3>

            {/* Search Bar & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por Pieza o Tratamiento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <svg
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap justify-center md:justify-end gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    {onViewSeguimiento && (
                        <button
                            onClick={onViewSeguimiento}
                            className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            <span>Ver Seguimiento</span>
                        </button>
                    )}
                    {onViewPlan && (
                        <button
                            onClick={onViewPlan}
                            className="px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <span>Ver Plan</span>
                        </button>
                    )}

                    {onNewHistoria && (
                        <button
                            onClick={onNewHistoria}
                            className="px-3 md:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Nuevo Seguimiento</span>
                        </button>
                    )}
                    {onPrint && (
                        <button
                            onClick={onPrint}
                            className="px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 md:gap-2 text-sm md:text-base"
                        >
                            <Printer size={18} className="flex-shrink-0 md:w-5 md:h-5" />
                            <span>Imprimir</span>
                        </button>
                    )}

                </div>
            </div>

            <div className="flex justify-between items-center mb-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">
                    Mostrando <span className="text-gray-800 dark:text-gray-200">{filteredHistoria.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredHistoria.length)}</span> de <span>{filteredHistoria.length}</span> registros
                </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pieza</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamiento</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Observaciones</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant.</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Diagnóstico</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Est. Trat.</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Est. Plan</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedHistoria.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{formatDate(item.fecha)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{item.pieza || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-medium">{item.tratamiento || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs" title={item.observaciones}>
                                    <div className="flex flex-col gap-1">
                                        <span className="truncate">{item.observaciones || '-'}</span>
                                        {item.firmaPaciente && (
                                            <button
                                                onClick={() => {
                                                    setSelectedSignature(item.firmaPaciente!);
                                                    setShowSignatureModal(true);
                                                }}
                                                className="text-xs flex items-center gap-1 text-blue-600 hover:text-white dark:text-blue-400 font-semibold bg-blue-50 hover:bg-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-600 px-2 py-0.5 rounded shadow-sm transition-all w-fit"
                                                title="Ver Firma Digital"
                                            >
                                                <PenTool size={11} />
                                                Ver Firma
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-600 dark:text-gray-300">{item.cantidad}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {item.especialidad ? item.especialidad.especialidad : '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                    {item.doctor ? `${item.doctor.paterno} ${item.doctor.nombre}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={item.diagnostico}>
                                    {item.diagnostico || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className={`px-2 py-1 rounded text-sm ${item.estadoTratamiento === 'terminado'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                        }`}>
                                        {item.estadoTratamiento}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <span className={`px-2 py-1 rounded text-sm ${item.estadoPresupuesto === 'terminado'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                        }`}>
                                        {item.estadoPresupuesto || 'no terminado'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                                    <div className="flex items-center justify-center gap-2">

                                        {item.firmaPaciente ? (
                                            // Firma already exists — show in Observaciones column (handled above)
                                            null
                                        ) : onSign && (
                                            <button
                                                onClick={() => onSign(item)}
                                                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Firma Digital del Paciente"
                                            >
                                                <PenTool size={16} className="h-4 w-4" />
                                            </button>
                                        )}

                                        {onReminder && (
                                            <button
                                                onClick={() => onReminder(item)}
                                                className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Recordatorio de Tratamiento"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-1.5 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            disabled={item.tienePagos}
                                            className={`p-1.5 rounded-lg shadow-md transition-all transform ${item.tienePagos
                                                ? 'bg-gray-400 cursor-not-allowed opacity-60 text-white'
                                                : 'bg-red-500 hover:bg-red-600 text-white hover:-translate-y-0.5'
                                                }`}
                                            title={item.tienePagos ? "No se puede eliminar: tiene pagos asociados" : "Eliminar"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {paginatedHistoria.length === 0 && (
                            <tr>
                                <td colSpan={11} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                    <div className="flex flex-col items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-lg font-medium">{searchTerm ? 'No se encontraron resultados.' : 'No hay registros en el seguimiento clínico.'}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Seguimiento Clínico"
                sections={manualSections}
            />

            {/* Signature Viewer Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowSignatureModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 w-full flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <PenTool className="w-5 h-5 text-blue-600" />
                                Firma de Conformidad
                            </h3>
                            <button onClick={() => setShowSignatureModal(false)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-1.5 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 w-full flex justify-center bg-white dark:bg-gray-800">
                            <img src={selectedSignature} alt="Firma del paciente" className="max-w-full h-auto max-h-48 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm bg-white" />
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 w-full text-center text-xs text-gray-500 font-medium">
                            Firma digital registrada como conformidad del Tratamiento Realizado.
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default HistoriaClinicaList;
