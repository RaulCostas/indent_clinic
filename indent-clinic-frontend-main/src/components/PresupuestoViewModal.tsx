import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { FileText, Calendar, User, Hash, DollarSign, Check, Award } from 'lucide-react';

interface PresupuestoViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    proformaId: number | null;
    pacienteNombre?: string;
}

const PresupuestoViewModal: React.FC<PresupuestoViewModalProps> = ({
    isOpen,
    onClose,
    proformaId,
    pacienteNombre,
}) => {
    const [proforma, setProforma] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [historiaClinica, setHistoriaClinica] = useState<any[]>([]);
    const [firmas, setFirmas] = useState<any[]>([]);
    const [historySignature, setHistorySignature] = useState<string | null>(null);
    const [isTerminado, setIsTerminado] = useState(false);

    useEffect(() => {
        if (isOpen && proformaId) {
            setLoading(true);
            setHistoriaClinica([]);
            setFirmas([]);
            setIsTerminado(false);

            api.get(`/proformas/${proformaId}`)
                .then(async (res) => {
                    const data = res.data;
                    setProforma(data);

                    // Fetch Historia Clinica for this patient to check completed items
                    const pacienteId = data.pacienteId;
                    if (pacienteId) {
                        try {
                            const hRes = await api.get(`/historia-clinica/paciente/${pacienteId}`);
                            const historia: any[] = hRes.data || [];
                            setHistoriaClinica(historia);

                            // Check if budget is overall terminated
                            const terminado = historia.some(
                                (h: any) => h.proformaId === proformaId && h.estadoPresupuesto === 'terminado'
                            );
                            setIsTerminado(terminado);

                            // Find patient signature in history if not already found in firmas table
                            const historiaConFirma = historia.find(
                                (h: any) => h.proformaId === proformaId && h.firmaPaciente
                            );
                            if (historiaConFirma && historiaConFirma.firmaPaciente) {
                                setHistorySignature(historiaConFirma.firmaPaciente);
                            }
                        } catch (e) {
                            console.error('Error loading historia clinica:', e);
                        }
                    }

                    // Fetch signatures
                    try {
                        const firmaRes = await api.get(`/firmas/documento/presupuesto/${proformaId}`);
                        setFirmas(firmaRes.data || []);
                    } catch (e) {
                        // No signatures is normal
                    }
                })
                .catch(err => console.error('Error loading proforma:', err))
                .finally(() => setLoading(false));
        } else {
            setProforma(null);
            setHistoriaClinica([]);
            setFirmas([]);
            setHistorySignature(null);
            setIsTerminado(false);
        }
    }, [isOpen, proformaId]);

    if (!isOpen) return null;

    // Check if a specific detail item is completed
    const isItemCompleted = (detalle: any): boolean => {
        const matchingHistory = historiaClinica.filter((h: any) => {
            if (h.estadoTratamiento !== 'terminado') return false;
            if (h.proformaDetalleId) {
                return detalle.id && h.proformaDetalleId === detalle.id;
            }
            if (h.proformaId === proformaId) {
                return h.tratamiento === (detalle.arancel?.detalle || detalle.descripcion);
            }
            return false;
        });
        const totalCompleted = matchingHistory.reduce((sum: number, h: any) => sum + (h.cantidad || 0), 0);
        return totalCompleted >= (detalle.cantidad || 1);
    };

    const patientSignature = firmas.find((f: any) => f.rolFirmante === 'paciente')?.firmaData || historySignature;
    const clinicSignatureData = firmas.find((f: any) =>
        f.rolFirmante === 'doctor' || f.rolFirmante === 'personal' || f.rolFirmante === 'administrador'
    );
    const clinicSignature = clinicSignatureData?.firmaData;
    const clinicName = clinicSignatureData ? `${clinicSignatureData.usuario?.name || clinicSignatureData.usuario?.nombre || ''} ${clinicSignatureData.usuario?.apellido || ''}`.trim() : null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex-shrink-0">
                    <div className="p-2 bg-white/20 rounded-xl">
                        <FileText size={22} />
                    </div>
                    <div className="flex-1">
                        {loading ? (
                            <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold leading-tight">
                                        Plan de Tratamiento #{proforma?.numero?.toString().padStart(2, '0')}
                                    </h2>
                                    {isTerminado && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                                            <Check size={12} /> TERMINADO
                                        </span>
                                    )}
                                </div>
                                {pacienteNombre && (
                                    <p className="text-orange-100 text-sm">{pacienteNombre}</p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">Cargando plan de tratamiento...</span>
                            </div>
                        </div>
                    ) : proforma ? (
                        <div className="space-y-6">
                            {/* Info cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                                        <Hash size={12} /> Plan #
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {proforma.numero?.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                                        <Calendar size={12} /> Fecha
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {formatDate(proforma.fecha)}
                                    </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                                        <User size={12} /> Registrado por
                                    </span>
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {proforma.usuario?.name || 'Sistema'}
                                    </span>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-green-600 dark:text-green-400 tracking-wider">
                                        <DollarSign size={12} /> Total
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {Number(proforma.total).toFixed(2)} Bs.
                                    </span>
                                </div>
                            </div>

                            {/* Nota */}
                            {proforma.nota && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                                    <p className="text-xs font-bold uppercase text-yellow-700 dark:text-yellow-400 mb-1">Nota</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{proforma.nota}</p>
                                </div>
                            )}

                            {/* Detalles Table */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                                    <FileText size={14} /> Tratamientos
                                </h3>
                                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pieza(s)</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant.</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">P.U.</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                            {proforma.detalles?.map((detalle: any, i: number) => {
                                                const completed = !detalle.posible && isItemCompleted(detalle);
                                                return (
                                                    <tr
                                                        key={i}
                                                        className={`transition-colors ${
                                                            completed
                                                                ? 'bg-green-50/60 dark:bg-green-900/10'
                                                                : detalle.posible
                                                                    ? 'bg-yellow-50/50 dark:bg-yellow-900/10'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                                        }`}
                                                    >
                                                        <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300 font-mono">
                                                            {detalle.piezas || '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium">
                                                            <span className={completed ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-900 dark:text-white'}>
                                                                {detalle.arancel?.detalle || detalle.descripcion || '—'}
                                                            </span>
                                                            {detalle.posible && (
                                                                <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400 italic">(posible)</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">{detalle.cantidad}</td>
                                                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">{Number(detalle.precioUnitario).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                                                            {detalle.posible
                                                                ? <span className="text-yellow-600 dark:text-yellow-400 text-xs font-normal">—</span>
                                                                : Number(detalle.total).toFixed(2)
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {detalle.posible ? (
                                                                <span className="inline-flex px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
                                                                    Posible
                                                                </span>
                                                            ) : completed ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-bold shadow-sm">
                                                                    <Check size={10} /> Terminado
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs shadow-sm">
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

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 min-w-[220px] space-y-2 shadow-sm">
                                    <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white">
                                        <span>TOTAL:</span>
                                        <span>{Number(proforma.total).toFixed(2)} Bs.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Signatures — show when signatures exist */}
                            {(patientSignature || clinicSignature) && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                                        <Award size={14} /> Firmas de Conformidad
                                    </h3>
                                    <div className="flex flex-wrap justify-center gap-12 p-8 bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-2xl shadow-sm">
                                        {/* Clinic signature - only show if exists */}
                                        {clinicSignature && (
                                            <div className="flex flex-col items-center gap-3 min-w-[200px]">
                                                <img
                                                    src={clinicSignature}
                                                    alt="Firma autorizada"
                                                    className="h-24 object-contain border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-800 shadow-inner"
                                                />
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                                        {clinicName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                                                        {clinicSignatureData?.rolFirmante === 'doctor' ? 'Odontólogo' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Patient signature - only show if exists */}
                                        {patientSignature && (
                                            <div className="flex flex-col items-center gap-3 min-w-[200px]">
                                                <img
                                                    src={patientSignature}
                                                    alt="Firma del paciente"
                                                    className="h-24 object-contain border border-gray-200 dark:border-gray-600 rounded-xl p-3 bg-white dark:bg-gray-800 shadow-inner"
                                                />
                                                <div className="text-center">
                                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                                                        {pacienteNombre}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                                                        FIRMA DE CONFORMIDAD
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Badge when terminated but no signatures yet */}
                            {isTerminado && !patientSignature && !clinicSignature && (
                                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                                    <Check size={20} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                                        Plan de tratamiento completado. Aún no se han registrado firmas de conformidad.
                                    </p>
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

export default PresupuestoViewModal;
