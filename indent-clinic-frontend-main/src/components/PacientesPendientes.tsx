import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Doctor, Especialidad } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Clock } from 'lucide-react';
import ManualModal, { type ManualSection } from './ManualModal';

interface PacientePendiente {
    id: number;
    nombre: string;
    paterno: string;
    materno: string;
    celular: string;
    ultima_cita: string | null;
    ultimo_doctor: string | null;
    ultimo_tratamiento: string | null;
    ultima_especialidad: string | null;
    numero_presupuesto: number | null;
}

const PacientesPendientes: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'no_agendados' | 'agendados'>('no_agendados');
    const [pacientes, setPacientes] = useState<PacientePendiente[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);

    // Filters
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<string>('');
    const [selectedEspecialidad, setSelectedEspecialidad] = useState<string>('');

    const manualSections: ManualSection[] = [
        {
            title: 'Pacientes No Agendados',
            content: 'Muestra pacientes que tienen tratamientos en curso o planes de tratamiento activos pero que no cuentan con una cita futura programada en la agenda.'
        },
        {
            title: 'Pacientes Agendados',
            content: 'Lista a los pacientes que ya tienen una cita programada, permitiendo verificar cuándo regresarán a la clínica.'
        },
        {
            title: 'Filtros de Búsqueda',
            content: 'Utilice los selectores de Doctor y Especialidad para filtrar la lista. Esto es útil para que cada especialista pueda ver su propia lista de pacientes pendientes.'
        },
        {
            title: 'Seguimiento Clínico',
            content: 'En la tabla puede ver el número de plan de tratamiento, la fecha de la última cita, quién lo atendió y qué tratamiento se realizó por última vez, facilitando la toma de decisiones para el seguimiento.'
        }];

    useEffect(() => {
        fetchFilters();
    }, []);

    useEffect(() => {
        fetchPacientes();
    }, [activeTab, selectedDoctor, selectedEspecialidad]);

    const fetchFilters = async () => {
        try {
            const [doctorsRes, especialidadesRes] = await Promise.all([
                api.get('/doctors?limit=100'),
                api.get('/especialidad?limit=100')
            ]);
            const activeDoctors = (doctorsRes.data.data || []).filter((doctor: any) => doctor.estado === 'activo');
            const activeEspecialidades = (especialidadesRes.data.data || []).filter((esp: any) => esp.estado === 'activo');
            setDoctors(activeDoctors);
            setEspecialidades(activeEspecialidades);
        } catch (error) {
            console.error('Error fetching filters:', error);
        }
    };

    const fetchPacientes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('tab', activeTab);
            if (selectedDoctor) params.append('doctorId', selectedDoctor);
            if (selectedEspecialidad) params.append('especialidadId', selectedEspecialidad);

            const response = await api.get<PacientePendiente[]>(`/pacientes/pendientes?${params.toString()}`);
            setPacientes(response.data);
        } catch (error) {
            console.error('Error fetching pacientes pendientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'no_agendados', label: 'No Agendados' },
        { id: 'agendados', label: 'Agendados' },
    ];

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen text-gray-800 dark:text-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Clock className="text-blue-600" size={32} />
                        Pacientes Pendientes
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Pacientes con tratamientos pendientes de atención</p>
                </div>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="no-print flex flex-wrap border-b border-gray-200 dark:border-gray-600 mb-5 bg-white dark:bg-gray-800 rounded-t-lg pt-2 px-2 transition-colors">
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-5 py-2.5 cursor-pointer border-b-4 flex items-center gap-2 transition-all duration-200 text-base ${activeTab === tab.id
                            ? 'border-blue-500 text-blue-500 font-bold dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-gray-600 dark:text-gray-400 font-normal hover:text-blue-500 dark:hover:text-blue-300'
                            }`}
                    >
                        {tab.id === 'no_agendados' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="18" y1="8" x2="23" y2="13"></line>
                                <line x1="23" y1="8" x2="18" y2="13"></line>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                <path d="M9 16l2 2 4-4"></path>
                            </svg>
                        )}
                        {tab.label}
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doctor</label>
                    <select
                        value={selectedDoctor}
                        onChange={(e) =>setSelectedDoctor(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Todos</option>
                        {doctors.map(d => (
                            <option key={d.id} value={d.id}>
                                {d.nombre} {d.paterno}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Especialidad</label>
                    <select
                        value={selectedEspecialidad}
                        onChange={(e) =>setSelectedEspecialidad(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Todas</option>
                        {especialidades.map(e => (
                            <option key={e.id} value={e.id}>
                                {e.especialidad}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">Cargando...</div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {pacientes.length} de {pacientes.length} registros
                    </div>

                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Plan</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Último Tratamiento</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Última Cita</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            {pacientes.length > 0 ? (
                                pacientes.map((p, index) => (
                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{index + 1}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200 font-bold">{p.numero_presupuesto || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                                            {p.nombre} {p.paterno} {p.materno}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {p.ultima_especialidad || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 max-w-xs truncate" title={p.ultimo_tratamiento || ''}>
                                            {p.ultimo_tratamiento || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {formatDate(p.ultima_cita)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                            {p.ultimo_doctor || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400 italic">No se encontraron pacientes.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Pacientes Pendientes"
                sections={manualSections}
            />
        </div>
    );
};

export default PacientesPendientes;
