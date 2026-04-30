import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Personal, GastoFijo, Inventario, Recordatorio, RecordatorioTratamiento, RecordatorioPlan } from '../types';

import { getLocalDateString, formatDate } from '../utils/dateUtils';
import { useClinica } from '../context/ClinicaContext';
import Swal from 'sweetalert2';
import PagosGastosFijosForm from './PagosGastosFijosForm';
import Pagination from './Pagination';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [birthdays, setBirthdays] = useState<Personal[]>([]);
    const [stats, setStats] = useState<{ totalPacientes: number, birthdayPacientes: any[] }>({ totalPacientes: 0, birthdayPacientes: [] });
    const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
    const [dueGastos, setDueGastos] = useState<GastoFijo[]>([]);
    const [labAlerts, setLabAlerts] = useState<any[]>([]);
    const [lowStockItems, setLowStockItems] = useState<Inventario[]>([]);
    const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
    const [tratamientosPendientes, setTratamientosPendientes] = useState<RecordatorioTratamiento[]>([]);
    const [planesPendientes, setPlanesPendientes] = useState<RecordatorioPlan[]>([]);
    const [sendingGreeting, setSendingGreeting] = useState<number[]>([]);
    const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
    const [selectedGasto, setSelectedGasto] = useState<GastoFijo | null>(null);

    const { clinicaSeleccionada, clinicaActual } = useClinica();

    // Permission Logic
    const userString = localStorage.getItem('user');
    let user = null;
    try {
        user = userString ? JSON.parse(userString) : null;
    } catch {
        user = null;
    }
    const permisos = (user && Array.isArray(user.permisos)) ? user.permisos : [];
    const hasAccess = (moduleId: string) => !permisos.includes(moduleId);

    useEffect(() => {
        fetchBirthdays();
        fetchStats();
        fetchTodayAppointments();
        fetchDueGastos();
        fetchLabAlerts();
        fetchLowStockItems();
        fetchNoRegistrados();
        fetchRecordatorios();
        fetchTratamientosPendientes();
        fetchPlanesPendientes();
    }, [clinicaSeleccionada]);

    const fetchPlanesPendientes = async () => {
        try {
            const response = await api.get<RecordatorioPlan[]>('/recordatorio-plan/pendientes');
            setPlanesPendientes(response.data);
        } catch (error) {
            console.error('Error fetching planes pendientes:', error);
        }
    };

    const fetchTratamientosPendientes = async () => {
        try {
            const response = await api.get<RecordatorioTratamiento[]>('/recordatorio-tratamiento/pendientes');
            setTratamientosPendientes(response.data);
        } catch (error) {
            console.error('Error fetching tratamientos pendientes:', error);
        }
    };

    const handleCompletarTratamiento = async (id: number) => {
        try {
            await api.patch(`/recordatorio-tratamiento/${id}`, { estado: 'completado' });
            fetchTratamientosPendientes(); // Refresh list
        } catch (error) {
            console.error('Error al completar tratamiento:', error);
        }
    };

    const handleCompletarPlan = async (id: number) => {
        try {
            await api.patch(`/recordatorio-plan/${id}`, { estado: 'inactivo' });
            fetchPlanesPendientes();
        } catch (error) {
            console.error('Error al completar plan:', error);
        }
    };

    const handleCompletarRecordatorioGeneral = async (id: number) => {
        try {
            await api.patch(`/recordatorio/${id}`, { estado: 'inactivo' }); // Assuming 'inactivo' means processed/done for general reminders
            fetchRecordatorios();
        } catch (error) {
            console.error('Error al completar recordatorio:', error);
        }
    };

    const fetchTodayAppointments = async () => {
        try {
            const today = getLocalDateString();
            const url = clinicaSeleccionada ? `/agenda?date=${today}&clinicaId=${clinicaSeleccionada}` : `/agenda?date=${today}`;
            const response = await api.get(url);
            if (response.data) {
                setTodayAppointmentsCount(response.data.length);
            }
        } catch (error) {
            console.error('Error fetching today appointments:', error);
        }
    };

    const fetchBirthdays = async () => {
        try {
            const url = clinicaSeleccionada ? `/personal/birthdays?clinicaId=${clinicaSeleccionada}` : '/personal/birthdays';
            const response = await api.get<Personal[]>(url);
            setBirthdays(response.data);
        } catch (error) {
            console.error('Error fetching birthdays:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const url = clinicaSeleccionada ? `/pacientes/dashboard-stats?clinicaId=${clinicaSeleccionada}` : '/pacientes/dashboard-stats';
            const response = await api.get(url);
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchDueGastos = async () => {
        try {
            const url = clinicaSeleccionada ? `/gastos-fijos?clinicaId=${clinicaSeleccionada}` : '/gastos-fijos';
            const response = await api.get<GastoFijo[]>(url);
            const gastos = response.data;
            const today = new Date();
            const currentDay = today.getDate();
            const currentMonth = today.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();

            const due = gastos.filter(gasto => {
                if (gasto.dia !== currentDay) return false;
                if (gasto.anual) {
                    return gasto.mes?.toLowerCase() === currentMonth;
                }
                return true; // Monthly expense matches day
            });
            setDueGastos(due);
        } catch (error) {
            console.error('Error fetching due expenses:', error);
        }
    };


    const calculateAge = (dateString: string) => {
        const birthDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const fetchLabAlerts = async () => {
        try {
            const url = clinicaSeleccionada ? `/trabajos-laboratorios/alertas/terminados-sin-cita?clinicaId=${clinicaSeleccionada}` : '/trabajos-laboratorios/alertas/terminados-sin-cita';
            const response = await api.get(url);
            setLabAlerts(response.data);
        } catch (error) {
            console.error('Error fetching lab alerts:', error);
        }
    };

    const fetchLowStockItems = async () => {
        try {
            const url = clinicaSeleccionada ? `/inventario/alertas/bajo-stock?clinicaId=${clinicaSeleccionada}` : '/inventario/alertas/bajo-stock';
            const response = await api.get<Inventario[]>(url);
            setLowStockItems(response.data);
        } catch (error) {
            console.error('Error fetching low stock items:', error);
        }
    };

    const [noRegistrados, setNoRegistrados] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const itemsPerPage = 5;

    const fetchNoRegistrados = async () => {
        try {
            const url = clinicaSeleccionada ? `/pacientes/no-registrados?clinicaId=${clinicaSeleccionada}` : '/pacientes/no-registrados';
            const response = await api.get(url);
            setNoRegistrados(response.data);
        } catch (error) {
            console.error('Error fetching no registrados:', error);
        }
    };

    const fetchRecordatorios = async () => {
        try {
            const usuarioId = user?.id;
            const response = await api.get<Recordatorio[]>(`/recordatorio/activos${usuarioId ? `?usuarioId=${usuarioId}` : ''}`);
            setRecordatorios(response.data);
        } catch (error) {
            console.error('Error fetching recordatorios:', error);
        }
    };

    const handleSendGreeting = async (paciente: any) => {
        if (!clinicaActual?.id) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Debe seleccionar una clínica para enviar felicitaciones.',
                timer: 1500,
                showConfirmButton: false
            });
            return;
        }

        setSendingGreeting((prev) => [...prev, paciente.id]);
        try {
            await api.post(`/chatbot/${clinicaActual.id}/send-birthday/${paciente.id}`, { clinicName: clinicaActual?.nombre });
            Swal.fire({
                icon: 'success',
                title: '¡Enviado!',
                text: 'Felicitación enviada correctamente',
                timer: 1500,
                showConfirmButton: false
            });

            // Actualizar estado local para deshabilitar botón instantáneamente
            const currentYear = new Date().getFullYear();
            setStats(prev => ({
                ...prev,
                birthdayPacientes: prev.birthdayPacientes.map((p: any) => 
                    p.id === paciente.id ? { ...p, ultimo_cumpleanos_felicitado: currentYear } : p
                )
            }));
        } catch (error: any) {
            console.error('Error enviando felicitación:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'El chatbot no está conectado a WhatsApp',
                timer: 1500,
                showConfirmButton: false
            });
        } finally {
            setSendingGreeting((prev) => prev.filter((id) => id !== paciente.id));
        }
    };

    return (
        <div className="content-card dark:bg-gray-800 p-8 rounded-xl shadow-sm transition-colors duration-200">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                {clinicaActual ? `Bienvenido a ${clinicaActual.nombre}` : 'Bienvenidos'}
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 text-center mb-8">
                Sistema de Gestión de Consultorio Dental.
            </p>

            {/* Pacientes No Registrados Section */}
            {hasAccess('dashboard_pacientes_no_registrados') && noRegistrados.length > 0 && (() => {
                const doctoresUnicos = Array.from(
                    new Set(noRegistrados.map((r: any) => r.doctorNombre?.trim()).filter(Boolean))
                ).sort() as string[];
                const filtered = selectedDoctor
                    ? noRegistrados.filter((r: any) => r.doctorNombre?.trim() === selectedDoctor)
                    : noRegistrados;
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                return (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-yellow-700 dark:text-yellow-400 mb-4 flex items-center gap-2">
                            <span>⚠️</span> Pacientes Agendados (Atendidos) Sin Registro
                        </h2>

                        {/* Toolbar: Mostrando + Filter */}
                        <div className="flex items-center justify-between mb-2 gap-4">
                            <div className="text-gray-600 dark:text-gray-400 text-sm">
                                Mostrando {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                                {selectedDoctor && <span className="ml-2 text-yellow-600 dark:text-yellow-400">(filtrado)</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">Filtrar por Doctor:</label>
                                <select
                                    value={selectedDoctor}
                                    onChange={(e) => { setSelectedDoctor(e.target.value); setCurrentPage(1); }}
                                    className="pl-3 pr-8 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
                                >
                                    <option value="">-- Todos --</option>
                                    {doctoresUnicos.map((d) => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                {selectedDoctor && (
                                    <button
                                        onClick={() => { setSelectedDoctor(''); setCurrentPage(1); }}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-200 hover:bg-red-100 dark:bg-gray-600 dark:hover:bg-red-900/40 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 hover:shadow-md"
                                        title="Limpiar filtro de doctor"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 20H7L3 16l10-10 7 7-1.5 1.5"/>
                                            <path d="M6.5 17.5l4-4"/>
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                        </svg>
                                        <span className="text-xs font-medium">Limpiar</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                        {!clinicaSeleccionada && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Clínica</th>}
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Doctor</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha (cita)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hora</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item: any, index: number) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="p-3 text-gray-800 dark:text-gray-300 font-medium">{item.nombre} {item.paterno} {item.materno}</td>
                                            {!clinicaSeleccionada && (
                                                <td className="p-3 text-gray-800 dark:text-gray-300 font-medium text-blue-600 dark:text-blue-400">
                                                    {item.clinicaNombre || 'N/A'}
                                                </td>
                                            )}
                                            <td className="p-3 text-gray-800 dark:text-gray-300">{item.doctorNombre?.trim() || '-'}</td>
                                            <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(item.fecha)}</td>
                                            <td className="p-3 text-gray-800 dark:text-gray-300">{item.hora?.substring(0, 5)}</td>
                                            <td className="p-3">
                                                <button
                                                    onClick={() => navigate(`/pacientes/${item.pacienteId}/historia-clinica`)}
                                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-md transform hover:-translate-y-0.5"
                                                >
                                                    Llenar Seguimiento Clínico
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={clinicaSeleccionada ? 6 : 7} className="p-6 text-center text-gray-400 dark:text-gray-500">
                                                No hay resultados para el doctor seleccionado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        )}
                    </div>
                );
            })()}


            {/* Recordatorios Section */}
            {recordatorios.length > 0 && (
                <div className="mb-8 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2">
                        <span>🔔</span> Recordatorios Activos
                    </h2>
                    <div className="space-y-3">
                        {recordatorios.map(recordatorio => (
                            <div
                                key={recordatorio.id}
                                className="flex justify-between items-start bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${recordatorio.tipo === 'personal'
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                            }`}>
                                            {recordatorio.tipo === 'personal' ? '👤 Personal' : '🏥 Consultorio'}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(recordatorio.fecha)} - {recordatorio.hora.substring(0, 5)}
                                        </span>
                                    </div>
                                    <p className="text-gray-800 dark:text-white font-medium mb-1">
                                        {recordatorio.mensaje}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Repetir: {recordatorio.repetir}
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-2xl text-purple-500 dark:text-purple-400">
                                        🔔
                                    </div>
                                    <button
                                        onClick={() => handleCompletarRecordatorioGeneral(recordatorio.id)}
                                        title="Marcar como visto / inactivar"
                                        className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tratamientos Pendientes Section */}
            {tratamientosPendientes.length > 0 && (
                <div className="mb-8 bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2">
                        <span>📋</span> Seguimiento Clínico
                    </h2>
                    <div className="space-y-3">
                        {tratamientosPendientes.map(recordatorio => (
                            <div
                                key={recordatorio.id}
                                className="flex justify-between items-start bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                            Tratamiento
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(recordatorio.fechaRecordatorio)}
                                        </span>
                                    </div>
                                    <div className="text-gray-800 dark:text-white mb-1">
                                        <span className="font-bold block text-lg mb-1">{recordatorio.historiaClinica?.paciente?.nombre} {recordatorio.historiaClinica?.paciente?.paterno} {recordatorio.historiaClinica?.paciente?.materno}</span>
                                        {!clinicaSeleccionada && recordatorio.historiaClinica?.proforma?.clinica && (
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 mb-2 inline-block">
                                                🏥 {recordatorio.historiaClinica.proforma.clinica.nombre}
                                            </span>
                                        )}
                                        <div className="text-sm mt-1">
                                            <span className="font-semibold text-indigo-700 dark:text-indigo-300">Tratamiento:</span> {recordatorio.historiaClinica?.tratamiento}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Fecha Cita: {formatDate(recordatorio.historiaClinica?.fecha)} • Recordatorio a los {recordatorio.dias} días
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/pacientes/${recordatorio.historiaClinica?.pacienteId}/historia-clinica`)}
                                        className="mt-3 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                                    >
                                        Ver Seguimiento Clínico
                                    </button>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-2xl text-indigo-500 dark:text-indigo-400">
                                        📋
                                    </div>
                                    <button
                                        onClick={() => handleCompletarTratamiento(recordatorio.id)}
                                        title="Marcar como visto / completado"
                                        className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Planes Pendientes Section */}
            {planesPendientes.length > 0 && (
                <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                        <span>🗓️</span> Seguimiento de Planes
                    </h2>
                    <div className="space-y-3">
                        {planesPendientes.map(plan => (
                            <div
                                key={plan.id}
                                className="flex justify-between items-start bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            Plan #{plan.proforma?.numero || plan.proforma?.id}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatDate(plan.fechaRecordatorio)}
                                        </span>
                                    </div>
                                    <div className="text-gray-800 dark:text-white mb-1">
                                        <span className="font-bold block text-lg mb-1">{plan.proforma?.paciente?.nombre} {plan.proforma?.paciente?.paterno} {plan.proforma?.paciente?.materno}</span>
                                        {!clinicaSeleccionada && plan.proforma?.clinica && (
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 mb-2 inline-block">
                                                🏥 {plan.proforma.clinica.nombre}
                                            </span>
                                        )}
                                        <div className="text-sm mt-1">
                                            {plan.mensaje}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Fecha Plan: {formatDate(plan.proforma?.fecha)} • Recordatorio a los {plan.dias} días
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/pacientes/${plan.proforma?.pacienteId}/historia-clinica`)}
                                        className="mt-3 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                                    >
                                        Ver Seguimiento Clínico
                                    </button>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="text-2xl text-blue-500 dark:text-blue-400">
                                        🗓️
                                    </div>
                                    <button
                                        onClick={() => handleCompletarPlan(plan.id)}
                                        title="Marcar como visto / completado"
                                        className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Low Stock Alert Section */}
            {hasAccess('dashboard_stock_minimo') && lowStockItems.length > 0 && (
                <div className="mb-8 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                        <span>⚠️</span> Alerta de Stock Bajo
                    </h2>
                    <div className="space-y-3">
                        {lowStockItems.map(item => (
                            <div
                                key={item.id}
                                className="flex justify-between items-center bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">{item.descripcion}</h3>
                                    {!clinicaSeleccionada && item.clinica && (
                                        <div className="mb-2">
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                                🏥 {item.clinica.nombre}
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-300">
                                        Cantidad: <span className="font-bold text-red-500 dark:text-red-400">{item.cantidad_existente}</span> | Mínimo Requerido: {item.stock_minimo}
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                                        Especialidad: {item.especialidad?.especialidad} | Grupo: {item.grupoInventario?.grupo}
                                    </p>
                                </div>
                                <div className="text-2xl text-red-500 dark:text-red-400">
                                    📉
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Expenses Due Today Section */}
            {hasAccess('dashboard_gastos_vencidos') && dueGastos.length > 0 && (
                <div className="mb-8 bg-pink-50 dark:bg-pink-900/20 border-l-4 border-pink-500 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-pink-700 dark:text-pink-400 mb-4 flex items-center gap-2">
                        <span>⚠️</span> Gastos Fijos por Pagar Hoy
                    </h2>
                    <div className="space-y-3">
                        {dueGastos.map(gasto => (
                            <div
                                key={gasto.id}
                                className="flex justify-between items-center bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                                        {gasto.gasto_fijo}
                                    </h3>
                                    {!clinicaSeleccionada && gasto.clinica && (
                                        <div className="mb-2">
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                                🏥 {gasto.clinica.nombre}
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-300">
                                        Monto: {gasto.monto} {gasto.moneda}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => { setSelectedGasto(gasto); setIsGastoModalOpen(true); }}
                                        className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-md transition-all transform hover:-translate-y-0.5"
                                    >
                                        <span>💳</span> Pagar
                                    </button>
                                    <div className="text-2xl text-pink-500 dark:text-pink-400">
                                        💸
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Birthday Section */}
            {hasAccess('dashboard_cumpleanos') && birthdays.length > 0 && (
                <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
                        <span>🎉</span> Cumpleaños de Personal Hoy
                    </h2>
                    <div className="space-y-3">
                        {birthdays.map((person: any) => (
                            <div
                                key={person.id}
                                className="flex justify-between items-center bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                                        {person.nombre} {person.paterno} {person.materno}
                                    </h3>
                                    {!clinicaSeleccionada && person.clinica && (
                                        <div className="mb-2">
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                                🏥 {person.clinica.nombre}
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-300">
                                        Cumple {calculateAge(person.fecha_nacimiento)} años hoy
                                    </p>
                                </div>
                                <div className="text-3xl animate-bounce">
                                    🎂
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Patient Birthday Section */}
            {hasAccess('dashboard_cumpleanos') && stats.birthdayPacientes.length > 0 && (
                <div className="mb-8 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-green-700 dark:text-green-300 mb-4 flex items-center gap-2">
                        <span>🎉</span> Cumpleaños de Pacientes Hoy
                    </h2>
                    <div className="space-y-3">
                        {stats.birthdayPacientes.map((paciente: any) => (
                            <div
                                key={paciente.id}
                                className="flex justify-between items-center bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                                        {paciente.nombre} {paciente.paterno} {paciente.materno}
                                    </h3>
                                    {!clinicaSeleccionada && paciente.clinica && (
                                        <div className="mb-2">
                                            <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                                🏥 {paciente.clinica.nombre}
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-300">
                                        Cumple {calculateAge(paciente.fecha_nacimiento)} años hoy
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleSendGreeting(paciente)}
                                        disabled={sendingGreeting.includes(paciente.id) || paciente.ultimo_cumpleanos_felicitado === new Date().getFullYear()}
                                        className={`px-3 py-1.5 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 ${(sendingGreeting.includes(paciente.id) || paciente.ultimo_cumpleanos_felicitado === new Date().getFullYear()) ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                                    >
                                        {sendingGreeting.includes(paciente.id) ? (
                                            <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                                        ) : (
                                            <span>{paciente.ultimo_cumpleanos_felicitado === new Date().getFullYear() ? '✅' : '📲'}</span>
                                        )}
                                        {paciente.ultimo_cumpleanos_felicitado === new Date().getFullYear() ? 'Felicitado' : 'Enviar Felicitaciones'}
                                    </button>
                                    <div className="text-3xl animate-bounce">
                                        🎈
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Alertas Trabajos Laboratorio (Terminado Sin Cita) */}
            {hasAccess('dashboard_trabajos_pendientes') && labAlerts.length > 0 && (
                <div className="mb-8 bg-gray-100 dark:bg-gray-700/50 border-l-4 border-gray-500 p-6 rounded-r-lg shadow-sm">
                    <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <span>⚠️</span> Trabajos Terminados Sin Cita
                    </h2>
                    <div className="space-y-3">
                        {labAlerts.map(work => (
                            <div
                                key={work.id}
                                className="flex flex-col gap-1 bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600"
                            >
                                <div className="font-bold text-red-500 dark:text-red-400 mb-1">
                                    El siguiente trabajo de Laboratorio se encuentra en la Clínica, y el Paciente no tiene Cita Agendada
                                </div>
                                {!clinicaSeleccionada && work.clinica && (
                                    <div className="text-gray-800 dark:text-white mb-2">
                                        <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                                            🏥 {work.clinica.nombre}
                                        </span>
                                    </div>
                                )}
                                <div className="text-gray-800 dark:text-white">
                                    <span className="font-semibold">Laboratorio:</span> {work.laboratorio?.laboratorio}
                                </div>
                                <div className="text-gray-800 dark:text-white">
                                    <span className="font-semibold">Paciente:</span> {work.paciente?.nombre} {work.paciente?.paterno}
                                </div>
                                <div className="text-gray-800 dark:text-white">
                                    <span className="font-semibold">Trabajo:</span> {work.precioLaboratorio?.detalle} (Pieza: {work.pieza})
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Terminado el: {formatDate(work.fecha_terminado)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-12 flex justify-center gap-6 flex-wrap">
                <div className="p-6 bg-blue-500 text-white rounded-xl w-52 text-center shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-1 duration-200">
                    <h3 className="mb-2 text-lg font-medium opacity-90">Pacientes</h3>
                    <p className="text-3xl font-bold">{stats.totalPacientes}</p>
                </div>
                {hasAccess('dashboard_citas_hoy') && (
                    <div className="p-6 bg-green-500 text-white rounded-xl w-52 text-center shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-1 duration-200">
                        <h3 className="mb-2 text-lg font-medium opacity-90">Citas Hoy</h3>
                        <p className="text-3xl font-bold">{todayAppointmentsCount}</p>
                    </div>
                )}
            </div>

            {isGastoModalOpen && selectedGasto && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <PagosGastosFijosForm
                        gastoFijo={selectedGasto}
                        existingPayment={null}
                        onClose={() => { setIsGastoModalOpen(false); setSelectedGasto(null); }}
                        onSave={() => {
                            setIsGastoModalOpen(false);
                            setSelectedGasto(null);
                            fetchDueGastos(); // Refresh list
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default Home;
