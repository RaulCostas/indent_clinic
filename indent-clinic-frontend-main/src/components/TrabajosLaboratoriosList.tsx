import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { TrabajoLaboratorio } from '../types';
import Pagination from './Pagination';
import * as XLSX from 'xlsx';
import ManualModal, { type ManualSection } from './ManualModal';
import TrabajoLaboratorioViewModal from './TrabajoLaboratorioViewModal';
import TrabajosNoTerminadosModal from './TrabajosNoTerminadosModal';
import UbicacionCubetasModal from './UbicacionCubetasModal';
import { useClinica } from '../context/ClinicaContext';
import { FileText, ClipboardList } from 'lucide-react';


const TrabajosLaboratoriosList: React.FC = () => {
    const navigate = useNavigate();
    const { clinicaSeleccionada } = useClinica();
    const [trabajos, setTrabajos] = useState<TrabajoLaboratorio[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);
    const [showNoTerminados, setShowNoTerminados] = useState(false);
    const [showCubetas, setShowCubetas] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Trabajos',
            content: 'Este módulo permite administrar los trabajos enviados a laboratorios dentales. Puede registrar nuevos trabajos, realizar seguimiento de su estado, controlar los pagos y gestionar la ubicación de cubetas.'
        },
        {
            title: 'Nuevo Trabajo',
            content: 'Para registrar un nuevo trabajo, haga clic en el botón azul "+ Nuevo Trabajo". Deberá seleccionar el paciente, el laboratorio, el tipo de trabajo y opcionalmente asignar una cubeta para su almacenamiento.'
        },
        {
            title: 'Trabajos No Terminados',
            content: 'El botón ámbar con icono de reloj "Trabajos No terminados" muestra una lista de todos los trabajos pendientes. Desde esta ventana puede acceder directamente al formulario de edición de cada trabajo para actualizarlo.'
        },
        {
            title: 'Ubicación de Cubetas',
            content: 'El botón morado con icono de ubicación "Ubicación de Cubetas" muestra todas las cubetas que están actualmente FUERA (en uso), junto con información del laboratorio, trabajo y paciente asociado. Útil para localizar rápidamente dónde está almacenado cada trabajo.'
        },
        {
            title: 'Seguimiento y Estados',
            content: 'Utilice el botón "Seguimiento" (icono de lista cyan) para registrar cambios de estado (Envío/Retorno) y observaciones. Los trabajos cambian de color según su estado: Pendiente (Amarillo) o Terminado (Verde). El botón de seguimiento se deshabilita si el trabajo ya está pagado.'
        },
        {
            title: 'Ver Detalles e Imprimir',
            content: 'El botón "Ver Detalles" (icono de ojo azul) abre una ventana con toda la información del trabajo y su historial de seguimiento. Desde esa ventana puede imprimir el reporte individual del trabajo.'
        },
        {
            title: 'Exportar Datos',
            content: 'El botón verde "Excel" descarga un reporte completo de todos los trabajos que se muestran en pantalla según los filtros aplicados, incluyendo detalles de costos, fechas y estados.'
        },
        {
            title: 'Edición y Eliminación',
            content: 'Puede editar (icono ámbar) o eliminar (icono rojo) un trabajo siempre y cuando NO haya sido pagado. Una vez pagado, estas acciones se bloquean por seguridad. Al editar un trabajo puede cambiar la cubeta asignada, lo cual actualizará automáticamente el estado de disponibilidad de las cubetas.'
        }];
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        fetchTrabajos();
    }, [clinicaSeleccionada]);

    const fetchTrabajos = async () => {
        try {
            let url = '/trabajos-laboratorios?limit=1000';
            if (clinicaSeleccionada) {
                url += `&clinicaId=${clinicaSeleccionada}`;
            }
            const response = await api.get(url);
            const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setTrabajos(data);
        } catch (error) {
            console.error('Error fetching trabajos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este trabajo?')) {
            try {
                await api.delete(`/trabajos-laboratorios/${id}`);
                fetchTrabajos();
            } catch (error) {
                console.error('Error deleting trabajo:', error);
                alert('Error al eliminar');
            }
        }
    };

    // Filter Logic
    const filteredTrabajos = trabajos.filter(trabajo => {
        const term = searchTerm.toLowerCase();
        const pacienteName = trabajo.paciente ? `${trabajo.paciente.nombre} ${trabajo.paciente.paterno}`.toLowerCase() : '';
        const labName = trabajo.laboratorio?.laboratorio.toLowerCase() || '';
        return pacienteName.includes(term) || labName.includes(term);
    });

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTrabajos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTrabajos.length / itemsPerPage);

    // Date formatter
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const exportToExcel = () => {
        const dataToExport = filteredTrabajos.map(t => ({
            ID: t.id,
            Laboratorio: t.laboratorio?.laboratorio || '-',
            Paciente: t.paciente ? `${t.paciente.nombre} ${t.paciente.paterno}` : '-',
            Trabajo: t.precioLaboratorio?.detalle || (t as any).trabajo,
            Piezas: t.pieza,
            Cantidad: t.cantidad,
            'Fecha Recepcion': formatDate(t.fecha),
            'Fecha Pedido': formatDate(t.fecha_pedido),
            'Fecha Terminado': formatDate(t.fecha_terminado || ''),
            Color: t.color || '-',
            Estado: t.estado,
            Cita: t.cita || '-',
            Observacion: t.observacion || '-',
            Pagado: t.pagado,
            'Precio Unitario': t.precio_unitario,
            Total: t.total,
            Resaltar: t.resaltar === 'si' ? 'Sí' : 'No',
            Dr: (t as any).doctor ? `Dr. ${(t as any).doctor.nombre}` : '-',
            Cost: (t as any).costo || 0
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Trabajos");
        XLSX.writeFile(wb, "trabajos_laboratorio.xlsx");
    };

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="content-card">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <ClipboardList className="text-blue-600" size={32} />
                            Trabajos de Laboratorios
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión y seguimiento de trabajos enviados a laboratorio</p>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-center items-center md:justify-end">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={exportToExcel}
                            className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a Excel"
                        >
                            <FileText size={18} />
                            <span className="text-sm">Excel</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-2 self-center"></div>

                    <button
                        onClick={() => navigate('/trabajos-laboratorios/nuevo')}
                        className="bg-[#3498db] hover:bg-blue-600 text-white hover:text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Trabajo
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por Paciente o Laboratorio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
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
                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={() => setShowNoTerminados(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">Trabajos No terminados</span>
                    </button>
                    <button
                        onClick={() => setShowCubetas(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-sm">Ubicación de Cubetas</span>
                    </button>
                </div>
            </div>

            {/* Record Count Indicator */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                Mostrando {filteredTrabajos.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTrabajos.length)} de {filteredTrabajos.length} registros
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Laboratorio</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trabajo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Piezas</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant.</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pagado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentItems.map((trabajo, index) => (
                            <tr key={trabajo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-700 dark:text-gray-300">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(trabajo.fecha)}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">
                                    {trabajo.paciente ? `${trabajo.paciente.nombre} ${trabajo.paciente.paterno}` : '-'}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">
                                    {trabajo.laboratorio ? trabajo.laboratorio.laboratorio : '-'}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">
                                    {trabajo.precioLaboratorio ? trabajo.precioLaboratorio.detalle : '-'}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{trabajo.pieza}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{trabajo.cantidad}</td>
                                <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{Number(trabajo.total).toFixed(2)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-white text-xs ${trabajo.estado === 'terminado' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                        {trabajo.estado}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-white text-xs ${trabajo.pagado === 'si' ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {trabajo.pagado}
                                    </span>
                                </td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedWorkId(trabajo.id);
                                            setIsViewModalOpen(true);
                                        }}
                                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Ver Detalles"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (trabajo.pagado !== 'si') {
                                                navigate(`/trabajos-laboratorios/seguimiento/${trabajo.id}`);
                                            }
                                        }}
                                        disabled={trabajo.pagado === 'si'}
                                        className={`p-2 rounded-lg ${trabajo.pagado === 'si'
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-md transition-all transform hover:-translate-y-0.5'
                                            }`}
                                        title={trabajo.pagado === 'si' ? "No se puede dar seguimiento, trabajo pagado" : "Seguimiento del Trabajo"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => trabajo.pagado !== 'si' && navigate(`/trabajos-laboratorios/editar/${trabajo.id}`)}
                                        disabled={trabajo.pagado === 'si'}
                                        className={`p-2 rounded-lg ${trabajo.pagado === 'si'
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-amber-400 hover:bg-amber-500 text-white shadow-md transition-all transform hover:-translate-y-0.5'
                                            }`}
                                        title={trabajo.pagado === 'si' ? "No se puede editar, trabajo pagado" : "Editar"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => trabajo.pagado !== 'si' && handleDelete(trabajo.id)}
                                        disabled={trabajo.pagado === 'si'}
                                        className={`p-2 rounded-lg ${trabajo.pagado === 'si'
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-red-500 hover:bg-red-600 text-white shadow-md transition-all transform hover:-translate-y-0.5'
                                            }`}
                                        title={trabajo.pagado === 'si' ? "No se puede eliminar, trabajo pagado" : "Eliminar"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {currentItems.length === 0 && (
                            <tr>
                                <td colSpan={11} className="p-5 text-center text-gray-500 dark:text-gray-400">
                                    No se encontraron trabajos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Trabajos de Laboratorio"
                sections={manualSections}
            />

            {/* Read Only View Modal */}
            <TrabajoLaboratorioViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                trabajoId={selectedWorkId}
            />

            <TrabajosNoTerminadosModal
                isOpen={showNoTerminados}
                onClose={() => setShowNoTerminados(false)}
                trabajos={trabajos}
            />

            <UbicacionCubetasModal
                isOpen={showCubetas}
                onClose={() => setShowCubetas(false)}
            />
        </div>
    );
};

export default TrabajosLaboratoriosList;
