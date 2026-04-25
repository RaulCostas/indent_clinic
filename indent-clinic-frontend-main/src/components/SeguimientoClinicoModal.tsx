import React from 'react';
import type { HistoriaClinica, Proforma } from '../types';
import { formatDate } from '../utils/dateUtils';
import { X, Calendar, Activity, User, ClipboardList } from 'lucide-react';

interface SeguimientoClinicoModalProps {
    isOpen: boolean;
    onClose: () => void;
    historia: HistoriaClinica[];
    pacienteNombre: string;
    proformas: Proforma[];
}

const SeguimientoClinicoModal: React.FC<SeguimientoClinicoModalProps> = ({ isOpen, onClose, historia, pacienteNombre, proformas }) => {
    if (!isOpen) return null;

    // Sort history by date descending
    const sortedHistory = [...historia].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col transform transition-all scale-100">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <ClipboardList className="text-blue-500" size={24} />
                            Seguimiento Clínico Completo
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Cronología completa de tratamientos para <span className="font-bold text-blue-600 dark:text-blue-400">{pacienteNombre}</span>
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/30 dark:bg-gray-900/20">
                    {sortedHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                                <Activity size={48} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400 italic">
                                No se encontraron registros de seguimiento para este paciente.
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-100 dark:bg-blue-900/50 hidden md:block"></div>

                            <div className="space-y-8">
                                {sortedHistory.map((item, index) => (
                                    <div key={item.id} className="relative md:pl-12 group">
                                        {/* Timeline Dot */}
                                        <div className="absolute left-3.5 top-0 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50 dark:ring-blue-900/30 z-10 hidden md:block"></div>
                                        
                                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all hover:shadow-md">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                                        <Calendar size={12} />
                                                        {formatDate(item.fecha)}
                                                    </span>
                                                    {item.pieza && (
                                                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold shadow-sm">
                                                            Pieza: {item.pieza}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                        item.estadoTratamiento === 'terminado' 
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
                                                    }`}>
                                                        {item.estadoTratamiento}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                        Tratamiento & Diagnóstico
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <p className="text-gray-800 dark:text-gray-200 font-bold text-lg leading-tight">
                                                            {item.tratamiento || 'Sin tratamiento especificado'}
                                                        </p>
                                                        {item.diagnostico && (
                                                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 italic text-sm text-gray-600 dark:text-gray-300">
                                                                <span className="font-bold text-gray-400 dark:text-gray-500 not-italic block text-[10px] mb-1">DIAGNÓSTICO:</span>
                                                                {item.diagnostico}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                        Detalles & Observaciones
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <User size={14} className="text-blue-500" />
                                                                {item.doctor ? `Dr. ${item.doctor.paterno} ${item.doctor.nombre}` : 'Sin doctor'}
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <Activity size={14} className="text-purple-500" />
                                                                {item.especialidad?.especialidad || 'Sin especialidad'}
                                                            </div>
                                                        </div>
                                                        {item.observaciones && (
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100/50 dark:border-blue-800/30">
                                                                {item.observaciones}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {item.proformaId && (
                                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                                                        PLAN ASOCIADO: <span className="text-blue-500 dark:text-blue-400">#{proformas.find(p => p.id === item.proformaId)?.numero || item.proformaId}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
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

export default SeguimientoClinicoModal;
