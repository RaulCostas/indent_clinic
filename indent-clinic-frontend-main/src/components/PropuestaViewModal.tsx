import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { FileText, Calendar, User, Hash, DollarSign } from 'lucide-react';

interface PropuestaViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    propuestaId: number | null;
    pacienteNombre?: string;
}

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

const PropuestaViewModal: React.FC<PropuestaViewModalProps> = ({
    isOpen,
    onClose,
    propuestaId,
    pacienteNombre,
}) => {
    const [propuesta, setPropuesta] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [activeLetra, setActiveLetra] = useState<string>('A');

    useEffect(() => {
        if (isOpen && propuestaId) {
            setLoading(true);
            setActiveLetra('A');
            api.get(`/propuestas/${propuestaId}`)
                .then(res => {
                    setPropuesta(res.data);
                    // Auto-select first letter with data
                    const letrasConDatos = LETRAS.filter(l =>
                        (res.data.detalles || []).some((d: any) => d.letra === l)
                    );
                    if (letrasConDatos.length > 0) setActiveLetra(letrasConDatos[0]);
                })
                .catch(err => console.error('Error loading propuesta:', err))
                .finally(() => setLoading(false));
        } else {
            setPropuesta(null);
        }
    }, [isOpen, propuestaId]);

    if (!isOpen) return null;

    const letrasConDatos = LETRAS.filter(l =>
        (propuesta?.detalles || []).some((d: any) => d.letra === l)
    );

    const detallesFiltrados = (propuesta?.detalles || []).filter((d: any) => d.letra === activeLetra);
    const totalLetraActiva = detallesFiltrados.reduce((acc: number, d: any) => acc + Number(d.total), 0);

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white flex-shrink-0">
                    <div className="p-2 bg-white/20 rounded-xl">
                        <FileText size={22} />
                    </div>
                    <div>
                        {loading ? (
                            <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
                        ) : (
                            <>
                                <h2 className="text-lg font-bold leading-tight">
                                    Propuesta #{propuesta?.numero?.toString().padStart(2, '0')}
                                </h2>
                                {pacienteNombre && (
                                    <p className="text-purple-100 text-sm">{pacienteNombre}</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs de letras */}
                {!loading && letrasConDatos.length > 1 && (
                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex-shrink-0">
                        {letrasConDatos.map(letra => (
                            <button
                                key={letra}
                                onClick={() => setActiveLetra(letra)}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-colors border-b-2 ${
                                    activeLetra === letra
                                        ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-800'
                                        : 'border-transparent bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                Opción {letra}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">Cargando propuesta...</span>
                            </div>
                        </div>
                    ) : propuesta ? (
                        <div className="space-y-6">
                            {/* Info cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                                        <Hash size={12} /> Prop. #
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {propuesta.numero?.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                                        <Calendar size={12} /> Fecha
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {formatDate(propuesta.fecha)}
                                    </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                                        <User size={12} /> Registrado por
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {propuesta.usuario?.name || 'Sistema'}
                                    </span>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-green-600 dark:text-green-400 tracking-wider">
                                        <DollarSign size={12} /> Opciones
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {letrasConDatos.length}
                                    </span>
                                </div>
                            </div>

                            {/* Nota */}
                            {propuesta.nota && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                                    <p className="text-xs font-bold uppercase text-yellow-700 dark:text-yellow-400 mb-1">Nota</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{propuesta.nota}</p>
                                </div>
                            )}

                            {/* Tabla de detalles de la opción activa */}
                            {letrasConDatos.length > 0 ? (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 flex items-center gap-2">
                                        <FileText size={14} /> Tratamientos — Opción {activeLetra}
                                    </h3>
                                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pieza(s)</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant.</th>
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">P.U.</th>
                                                    {detallesFiltrados.some((d: any) => d.descuento > 0) && (
                                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dcto %</th>
                                                    )}
                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                                {detallesFiltrados.map((detalle: any, i: number) => (
                                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300 font-mono">{detalle.piezas || '—'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{detalle.arancel?.detalle || '—'}</td>
                                                        <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{detalle.cantidad}</td>
                                                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{Number(detalle.precioUnitario).toFixed(2)}</td>
                                                        {detallesFiltrados.some((d: any) => d.descuento > 0) && (
                                                            <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                                                                {detalle.descuento > 0 ? `${detalle.descuento}%` : '—'}
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                                                            {Number(detalle.total).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Total opción activa */}
                                    <div className="flex justify-end mt-4">
                                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-6 py-3">
                                            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                                Total Opción {activeLetra}: {totalLetraActiva.toFixed(2)} Bs.
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                    <FileText size={40} className="opacity-30 mb-2" />
                                    <p className="text-sm">No hay tratamientos registrados.</p>
                                </div>
                            )}

                            {/* Resumen de todas las opciones */}
                            {letrasConDatos.length > 1 && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Resumen de Opciones</h3>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                        {letrasConDatos.map(letra => {
                                            const total = (propuesta.detalles || [])
                                                .filter((d: any) => d.letra === letra)
                                                .reduce((acc: number, d: any) => acc + Number(d.total), 0);
                                            return (
                                                <button
                                                    key={letra}
                                                    onClick={() => setActiveLetra(letra)}
                                                    className={`p-3 rounded-xl text-center transition-all border ${
                                                        activeLetra === letra
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                                                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-purple-400'
                                                    }`}
                                                >
                                                    <div className="text-xs font-bold">Opción {letra}</div>
                                                    <div className={`text-sm font-bold mt-1 ${activeLetra === letra ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                                        {total.toFixed(2)}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all transform hover:-translate-y-0.5 shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropuestaViewModal;
