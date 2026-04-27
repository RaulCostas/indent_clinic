import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import { Clock, Search, X } from 'lucide-react';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';

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

    // Search and Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 10;

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
            title: 'Búsqueda de Pacientes',
            content: 'Use el buscador por nombre para localizar rápidamente a un paciente específico. Este buscador reemplaza los filtros previos de doctor y especialidad para una búsqueda más directa.'
        },
        {
            title: 'Seguimiento Clínico',
            content: 'En la tabla puede ver el número de plan de tratamiento, la fecha de la última cita, quién lo atendió y qué tratamiento se realizó por última vez, facilitando la toma de decisiones para el seguimiento.'
        }];

    useEffect(() => {
        fetchPacientes();
    }, [activeTab, searchTerm, currentPage]);

    const fetchPacientes = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('tab', activeTab);
            params.append('page', currentPage.toString());
            params.append('limit', limit.toString());
            if (searchTerm) params.append('search', searchTerm);

            const response = await api.get<any>(`/pacientes/pendientes?${params.toString()}`);
            setPacientes(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotalRecords(response.data.total);
        } catch (error) {
            console.error('Error fetching pacientes pendientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
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
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[40px] h-[40px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
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
                        onClick={() => {
                            setActiveTab(tab.id as any);
                            setCurrentPage(1);
                        }}
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

            {/* Search Bar (Styled like Deudores) */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print flex justify-between items-center transition-colors">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por Paciente..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-300"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">Cargando...</div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 flex justify-between items-center">
                        <span>Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)} de {totalRecords} registros</span>
                        {totalPages > 1 && (
                            <div className="text-xs">Página {currentPage} de {totalPages}</div>
                        )}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{(currentPage - 1) * limit + index + 1}</td>
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
                    
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        </div>
                    )}
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
