import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import api from '../services/api';
import type { Paciente, Pago, Proforma, Agenda } from '../types';
import {
    User, Calendar, FileText, CreditCard, Image as ImageIcon, ClipboardList,
    ArrowLeft, Edit, Activity, Heart, CheckCircle
} from 'lucide-react';

// ─── Tab definition ───────────────────────────────────────────────────────────
interface TabDef {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string; // relative path suffix after /pacientes/:id
}

const TABS: TabDef[] = [
    { id: 'ficha',       label: 'Ficha Médica',         icon: <Heart size={15} />,           path: 'ficha' },
    { id: 'citas',       label: 'Citas',                icon: <Calendar size={15} />,       path: 'citas' },
    { id: 'planes',      label: 'Planes de Tratamiento',icon: <CreditCard size={15} />,      path: 'presupuestos' },
    { id: 'seguimiento', label: 'Seguimiento Clínico',  icon: <Activity size={15} />,        path: 'historia-clinica' },
    { id: 'pagos',       label: 'Pagos',                icon: <FileText size={15} />,        path: 'pagos' },
    { id: 'imagenes',    label: 'Imágenes',             icon: <ImageIcon size={15} />,       path: 'imagenes' },
    { id: 'propuestas',  label: 'Propuestas',           icon: <ClipboardList size={15} />,   path: 'propuestas' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcEdad = (fecha?: string): string => {
    if (!fecha) return '—';
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return `${edad} años`;
};

const clasificacionColor = (c?: string) => {
    if (!c) return 'text-white';
    if (c.startsWith('A')) return 'text-yellow-300';
    if (c.startsWith('B')) return 'text-slate-300';
    return 'text-orange-300';
};

// ─── Main Layout Component ────────────────────────────────────────────────────
const PacientePerfil: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ citas: 0, planes: 0, pagos: 0, totalPagado: 0 });

    // ─── Filter Tabs based on permissions ─────────────────────────────────────────
    const [allowedTabs, setAllowedTabs] = useState<TabDef[]>(TABS);

    useEffect(() => {
        const userString = localStorage.getItem('user');
        if (userString) {
            try {
                const user = JSON.parse(userString);
                const restricted = Array.isArray(user.permisos) ? user.permisos : [];
                setAllowedTabs(TABS.filter(tab => !restricted.includes(tab.id)));
            } catch (e) {
                console.error("Error parsing user for tabs permissions", e);
            }
        }
    }, []);

    // Determine active tab from current URL path
    const activeTab = allowedTabs.find(t =>
        location.pathname.endsWith(`/${t.path}`) || location.pathname.includes(`/${t.path}/`)
    ) ?? null;

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            setLoading(true);
            try {
                const [pacRes, agendaRes, pagosRes, proformasRes] = await Promise.allSettled([
                    api.get<Paciente>(`/pacientes/${id}`),
                    api.get(`/agenda?pacienteId=${id}&limit=1000`),
                    api.get(`/pagos/paciente/${id}`),
                    api.get(`/proformas/paciente/${id}`),
                ]);
                if (pacRes.status === 'fulfilled') setPaciente(pacRes.value.data);
                const citas = agendaRes.status === 'fulfilled'
                    ? (Array.isArray(agendaRes.value.data) ? agendaRes.value.data : agendaRes.value.data?.data ?? []).length
                    : 0;
                const pagos: Pago[] = pagosRes.status === 'fulfilled' && Array.isArray(pagosRes.value.data) ? pagosRes.value.data : [];
                const planes = proformasRes.status === 'fulfilled' && Array.isArray(proformasRes.value.data) ? proformasRes.value.data.length : 0;
                setStats({
                    citas,
                    planes,
                    pagos: pagos.length,
                    totalPagado: pagos.reduce((s, p) => s + Number(p.monto), 0),
                });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    // If we're exactly at /pacientes/:id (no sub-path), redirect to citas tab
    useEffect(() => {
        if (!loading && id) {
            const isRootProfile = location.pathname === `/pacientes/${id}` ||
                location.pathname === `/pacientes/${id}/`;
            if (isRootProfile) {
                navigate(`/pacientes/${id}/ficha`, { replace: true });
            }
        }
    }, [loading, id, location.pathname]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-gray-500 dark:text-gray-400">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (!paciente) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <p className="text-lg text-gray-500 dark:text-gray-400">Paciente no encontrado</p>
                    <button onClick={() => navigate('/pacientes')}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg">
                        Volver a Pacientes
                    </button>
                </div>
            </div>
        );
    }

    const nombreCompleto = `${paciente.paterno} ${paciente.materno} ${paciente.nombre}`;

    return (
        <div className="flex flex-col min-h-full">

            {/* ── Navigation bar ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4 px-1">
                <button
                    onClick={() => navigate('/pacientes')}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                >
                    <ArrowLeft size={16} /> Volver a Pacientes
                </button>
                <button
                    onClick={() => navigate(`/pacientes/edit/${id}`)}
                    className="bg-amber-400 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                >
                    <Edit size={16} /> Editar Paciente
                </button>
            </div>

            {/* ── Patient Header ──────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-900 dark:to-slate-900 rounded-2xl p-5 mb-4 text-white shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner flex-shrink-0">
                            <User size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight leading-tight">{nombreCompleto}</h1>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-blue-100 text-xs">
                                {paciente.fecha_nacimiento && <span>🎂 {calcEdad(paciente.fecha_nacimiento)}</span>}
                                {paciente.celular && (() => {
                                    const cel = paciente.celular;
                                    const match = cel.match(/^(\+\d{1,3})(\d+)$/);
                                    const formatted = match ? `(${match[1]}) ${match[2]}` : cel;
                                    return <span>📱 {formatted}</span>;
                                })()}
                                {paciente.email && <span>✉️ {paciente.email}</span>}
                                {paciente.seguro_medico && (
                                    <span className="px-2 py-0.5 bg-white/20 rounded-full font-bold">
                                        🏥 {paciente.seguro_medico}
                                    </span>
                                )}
                                {paciente.fecha_vencimiento && (
                                    <span className="px-2 py-0.5 bg-white/20 rounded-full font-bold">
                                        📅 Vence: {new Date(paciente.fecha_vencimiento).toLocaleDateString()}
                                    </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full font-bold ${
                                    paciente.estado === 'activo' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'
                                }`}>
                                    {paciente.estado === 'activo' ? '● Activo' : '● Inactivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {paciente.clasificacion && (
                            <div className="text-center">
                                <div className="text-[9px] text-blue-200 uppercase tracking-widest mb-0.5">Clasificación</div>
                                <div className={`text-3xl font-black drop-shadow ${clasificacionColor(paciente.clasificacion)}`}>
                                    {paciente.clasificacion}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/20">
                    {[
                        { label: 'Citas', value: stats.citas, Icon: Calendar },
                        { label: 'Planes', value: stats.planes, Icon: CreditCard },
                        { label: 'Pagos', value: stats.pagos, Icon: FileText },
                        { label: 'Total Pagado', value: `Bs. ${stats.totalPagado.toFixed(0)}`, Icon: CheckCircle },
                    ].map(({ label, value, Icon }) => (
                        <div key={label} className="bg-white/10 rounded-xl p-2 text-center hover:bg-white/20 transition-colors">
                            <Icon size={14} className="mx-auto mb-0.5 text-blue-200" />
                            <div className="text-base font-black leading-tight">{value}</div>
                            <div className="text-[9px] text-blue-200 uppercase tracking-wider">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {allowedTabs.map(tab => {
                    const isActive = activeTab?.id === tab.id;
                    return (
                        <Link
                            key={tab.id}
                            to={`/pacientes/${id}/${tab.path}`}
                            className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {/* ── Tab Content (Outlet renders the matched child route) ──────── */}
            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
};

export default PacientePerfil;
