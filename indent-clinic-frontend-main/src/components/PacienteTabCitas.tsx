import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Agenda, Paciente } from '../types';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import { Calendar, Plus, ChevronRight, HelpCircle } from 'lucide-react';
import AgendaForm from './AgendaForm';
import ManualModal, { type ManualSection } from './ManualModal';

// ── Estado colors (igual que en /agenda) ─────────────────────────────────────
const estadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
        case 'agendado':   return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
        case 'completada':
        case 'atendido':   return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
        case 'cancelada':
        case 'cancelado':  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
        case 'no asistio':
        case 'no asistió': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
        case 'en espera':  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
        case 'en atencion':
        case 'en atención':return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
        default:           return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
};

// Suma minutos a una hora HH:MM y devuelve HH:MM
const addMinutes = (hora: string, mins: number): string => {
    const [h, m] = hora.split(':').map(Number);
    const total = h * 60 + m + mins;
    const rh = Math.floor(total / 60) % 24;
    const rm = total % 60;
    return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
};

const PacienteTabCitas: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [citas, setCitas] = useState<Agenda[]>([]);
    const [loading, setLoading] = useState(true);
    const [paciente, setPaciente] = useState<Paciente | null>(null);

    // AgendaForm modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCita, setSelectedCita] = useState<Agenda | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Historial de Citas',
            content: 'Aquí puede ver todas las citas pasadas y futuras del paciente. Las citas están codificadas por colores para facilitar su identificación.'
        },
        {
            title: 'Agendar Nueva Cita',
            content: 'Haga clic en el botón "+ Nueva Cita" para programar una nueva atención. Se abrirá el formulario de agenda pre-completado con los datos del paciente.'
        },
        {
            title: 'Editar Citas Futuras',
            content: 'Puede hacer clic en la fecha de cualquier cita futura (marcada con un icono de lápiz ✎) para modificar sus detalles, como el doctor, horario o tratamiento.'
        },
        {
            title: 'Estados de Cita',
            content: (
                <ul className="list-disc pl-5 space-y-1">
                    <li><span className="text-blue-600 font-bold">Agendado:</span> Cita programada pendiente de confirmación.</li>
                    <li><span className="text-green-600 font-bold">Atendido:</span> Cita finalizada.</li>
                    <li><span className="text-red-600 font-bold">Cancelado:</span> Cita anulada por el paciente o la clínica.</li>
                    <li><span className="text-orange-600 font-bold">No Asistió:</span> El paciente no se presentó a la cita.</li>
                </ul>
            )
        }
    ];

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                const userPermisos = Array.isArray(user.permisos) ? user.permisos : [];
                setIsRestricted(userPermisos.includes('agenda-restringida'));
            } catch (e) {
                console.error('Error parsing user permissions', e);
            }
        }
    }, []);

    const fetchCitas = async () => {
        if (!id) return;
        try {
            const [pacRes, agendaRes] = await Promise.allSettled([
                api.get<Paciente>(`/pacientes/${id}`),
                api.get(`/agenda?pacienteId=${id}&limit=1000`),
            ]);
            if (pacRes.status === 'fulfilled') setPaciente(pacRes.value.data);
            if (agendaRes.status === 'fulfilled') {
                const d = agendaRes.value.data;
                setCitas(Array.isArray(d) ? d : (d?.data ?? []));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchCitas();
    }, [id]);

    const sorted = [...citas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isPast = (fecha: string) => new Date(fecha) < today;

    const rowStyle = (c: Agenda) => {
        const estado = c.estado?.toLowerCase();
        if (estado === 'cancelada' || estado === 'cancelado')
            return 'bg-red-50 dark:bg-red-950/40 border-l-4 border-red-400 dark:border-red-600';
        if (isPast(c.fecha))
            return 'opacity-60 bg-gray-50 dark:bg-gray-900/40';
        return 'bg-blue-50/40 dark:bg-blue-900/10';
    };

    const handleFechaClick = (c: Agenda) => {
        if (!isPast(c.fecha)) {
            setSelectedCita(c);
            setModalOpen(true);
        }
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar size={22} className="text-blue-500" />
                        Historial de Citas
                    </h2>
                    {paciente && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {paciente.paterno} {paciente.materno} {paciente.nombre} — {citas.length} cita(s) registrada(s)
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors self-center mr-2 flex-shrink-0"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    {!isRestricted && (
                        <span
                            onClick={() => {
                                setSelectedCita(null);
                                setModalOpen(true);
                            }}
                            className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => e.key === 'Enter' && (setSelectedCita(null), setModalOpen(true))}
                        >
                            <Plus size={16} /> Nueva Cita
                        </span>
                    )}
                </div>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-3 mb-4 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <span className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 inline-block" />
                    Citas futuras <span className="text-gray-400 font-normal">(clic en fecha para editar)</span>
                </span>
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 inline-block" />
                    Citas pasadas
                </span>
                <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                    <span className="w-3 h-3 rounded-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 inline-block" />
                    Canceladas
                </span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <Calendar size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Sin citas registradas para este paciente</p>
                    {!isRestricted && (
                        <span
                            onClick={() => {
                                setSelectedCita(null);
                                setModalOpen(true);
                            }}
                            className="mt-4 bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 mx-auto cursor-pointer w-fit"
                            role="button"
                            tabIndex={0}
                        >
                            <Plus size={16} /> Agendar primera cita
                        </span>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {['Fecha', 'Hora', 'Doctor', 'Tratamiento', 'Sucursal', 'Estado', 'Observaciones'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {sorted.map((c) => {
                                const past = isPast(c.fecha);
                                const esCancelada = ['cancelada', 'cancelado'].includes(c.estado?.toLowerCase());
                                return (
                                    <tr key={c.id} className={`transition-colors ${rowStyle(c)}`}>
                                        <td className={`px-4 py-3 text-sm font-semibold ${past ? 'text-gray-500 dark:text-gray-500' : 'text-blue-700 dark:text-blue-300'}`}>
                                            {!past && !esCancelada ? (
                                                <span
                                                    onClick={() => handleFechaClick(c)}
                                                    className="cursor-pointer hover:underline flex items-center gap-1 group"
                                                    title="Clic para editar esta cita"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={e => e.key === 'Enter' && handleFechaClick(c)}
                                                >
                                                    {formatDate(c.fecha)}
                                                    <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                        próxima ✎
                                                    </span>
                                                </span>
                                            ) : (
                                                formatDate(c.fecha)
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                            {c.hora?.substring(0, 5)}
                                            {c.duracion ? (
                                                <span className="text-gray-400 dark:text-gray-500"> - {addMinutes(c.hora, c.duracion)}</span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                                            {(c.doctor as any)
                                                ? `${(c.doctor as any).nombre} ${(c.doctor as any).paterno} ${(c.doctor as any).materno || ''}`.trim()
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{c.tratamiento || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                            {c.sucursal?.nombre || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${estadoColor(c.estado)}`}>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{c.observacion || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Link to full agenda */}
            <div className="mt-4 flex justify-end">
                <span
                    onClick={() => navigate('/agenda')}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate('/agenda')}
                >
                    Ir a la Agenda completa <ChevronRight size={14} />
                </span>
            </div>

            {/* AgendaForm modal para editar citas futuras */}
            {modalOpen && (
                <AgendaForm
                    isOpen={modalOpen}
                    onClose={() => { setModalOpen(false); setSelectedCita(null); }}
                    onSave={() => {
                        setModalOpen(false);
                        setSelectedCita(null);
                        setLoading(true);
                        fetchCitas();
                    }}
                    initialData={selectedCita}
                    defaultDate={selectedCita ? selectedCita.fecha : getLocalDateString()}
                    defaultTime={selectedCita ? selectedCita.hora : '08:00'}
                    defaultClinicaId={selectedCita ? selectedCita.clinicaId : (paciente?.clinicaId || null)}
                    defaultPacienteId={Number(id)}
                />
            )}
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Historial de Citas"
                sections={manualSections}
            />
        </div>
    );
};

export default PacienteTabCitas;
