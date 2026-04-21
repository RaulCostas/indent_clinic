import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Calificacion } from '../types';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import EstadisticasModal from './EstadisticasModal';
import Swal from 'sweetalert2';
import CalificacionForm from './CalificacionForm';
import { Star, BarChart2 } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';


interface PaginatedResponse {
    data: Calificacion[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const CalificacionList: React.FC = () => {
    const { clinicaSeleccionada } = useClinica();
    const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [showEstadisticas, setShowEstadisticas] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedCalificacionId, setSelectedCalificacionId] = useState<number | string | null>(null);
    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Calificaciones del Personal',
            content: 'Registre y gestione las evaluaciones del personal de la clínica basadas en la atención brindada a los pacientes.'
        },
        {
            title: 'Crear Calificación',
            content: 'Use el botón "+ Nueva Calificación" para registrar una evaluación. Debe seleccionar el personal evaluado, el paciente atendido, el consultorio, y la calificación (Malo, Regular o Bueno).'
        },
        {
            title: 'Badges de Colores',
            content: 'Las calificaciones se muestran con colores:\n• Malo: Rojo\n• Regular: Amarillo\n• Bueno: Verde\n\nEsto facilita la identificación visual del desempeño.'
        },
        {
            title: 'Búsqueda y Filtros',
            content: 'Puede buscar calificaciones por nombre del personal o del paciente. Use el campo de búsqueda en la parte superior de la lista.'
        },
        {
            title: 'Estadísticas Visuales',
            content: 'Acceda al módulo de estadísticas con el botón "Estadísticas". Seleccione un personal, mes y año para visualizar un gráfico de pastel con la distribución de calificaciones (Bueno, Regular, Malo) y el total de evaluaciones en ese periodo.'
        }];

    useEffect(() => {
        fetchCalificaciones();
    }, [currentPage, searchTerm, clinicaSeleccionada]);

    const fetchCalificaciones = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            const response = await api.get<PaginatedResponse>(`/calificacion?${params}`);
            setCalificaciones(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching calificaciones:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar las calificaciones'
            });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar calificación?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/calificacion/${id}`);
                await Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: 'La calificación ha sido eliminada.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchCalificaciones();
            } catch (error) {
                console.error('Error al eliminar calificación:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo eliminar la calificación'
                });
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
    };

    const getCalificacionBadge = (calificacion: string) => {
        const styles = {
            'Malo': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
            'Regular': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            'Bueno': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        };
        return styles[calificacion as keyof typeof styles] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Star className="text-blue-600" size={32} />
                            Calificaciones del Personal
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Evaluación del desempeño y atención al paciente</p>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-center items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>

                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setShowEstadisticas(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Estadísticas"
                        >
                            <BarChart2 size={18} />
                            <span className="text-sm">Estadísticas</span>
                        </button>
                    </div>
                    
                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                    <button
                        onClick={() => {
                            setSelectedCalificacionId(null);
                            setIsDrawerOpen(true);
                        }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nueva Calificación
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por personal o paciente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Personal</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Consultorio</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Calificación</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Observaciones</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {calificaciones.map((cal, index) => (
                            <tr key={cal.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300 font-medium">
                                    {cal.personal ? `${cal.personal.nombre} ${cal.personal.paterno}` : 'N/A'}
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    {cal.paciente ? `${cal.paciente.nombre} ${cal.paciente.paterno}` : 'N/A'}
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{cal.consultorio}</td>
                                <td className="p-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCalificacionBadge(cal.calificacion)}`}>
                                        {cal.calificacion}
                                    </span>
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(cal.fecha)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    {cal.observaciones ? (cal.observaciones.length > 50 ? cal.observaciones.substring(0, 50) + '...' : cal.observaciones) : '-'}
                                </td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedCalificacionId(cal.id);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cal.id)}
                                        className="bg-[#dc3545] hover:bg-red-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {calificaciones.length === 0 && (
                <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay calificaciones registradas'}
                </p>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Calificaciones"
                sections={manualSections}
            />

            <EstadisticasModal
                isOpen={showEstadisticas}
                onClose={() => setShowEstadisticas(false)}
            />

            <CalificacionForm
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                id={selectedCalificacionId}
                onSaveSuccess={() => {
                    fetchCalificaciones();
                    setIsDrawerOpen(false);
                }}
            />
        </div>
    );
};

export default CalificacionList;
