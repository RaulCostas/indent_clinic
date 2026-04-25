import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './AgendaView.css'; // Import custom overrides
import api from '../services/api';
import type { Agenda, Paciente } from '../types';
import AgendaForm from './AgendaForm';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import QuienAgendoModal from './QuienAgendoModal';

import { getLocalDateString, formatDate, getDayName } from '../utils/dateUtils';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

import { useClinica } from '../context/ClinicaContext';
import { Calendar as CalendarIcon, X as CloseIcon, User as UserIcon, MapPin as LocationIcon, MessageCircle } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import type { Doctor } from '../types';

const getStatusColor = (estado: string, isBlock: boolean = false) => {
    if (isBlock) return '#475569'; // Slate-600 for blocks/events
    switch (estado) {
        case 'agendado': return '#3498db'; // Blue
        case 'confirmado': return '#2ecc71'; // Green
        case 'atendido': return '#95a5a6'; // Gray
        case 'no_asistio': return '#9b59b6'; // Purple
        case 'cancelado': return '#e74c3c'; // Red
        default: return '#f1c40f'; // Yellow
    }
};

// Returns 'white' or 'black' based on the luminance of a hex color
const getContrastTextColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Perceived luminance formula (WCAG)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#1a1a2e' : '#ffffff';
};

const AgendaView: React.FC = () => {
    const navigate = useNavigate();
    const { clinicas, clinicaSeleccionada: globalClinicaId } = useClinica();

    // Removed local activeClinicId state to use globalClinicaId from context directly
    // const [activeClinicId, setActiveClinicId] = useState<number | null>(null);

    const [currentDate, setCurrentDate] = useState(getLocalDateString());
    const [dateValue, setDateValue] = useState<Value>(new Date());
    const [appointments, setAppointments] = useState<Agenda[]>([]);
    const [globalAppointments, setGlobalAppointments] = useState<Agenda[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ time: string, clinicaId: number | null }>({ time: '', clinicaId: null });
    const [editingAppointment, setEditingAppointment] = useState<Agenda | null>(null);
    const [isSendingReminders, setIsSendingReminders] = useState(false);
    const [recordatoriosEnviadosHoy, setRecordatoriosEnviadosHoy] = useState(false);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);


    const isTomorrow = (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const y = tomorrow.getFullYear();
        const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const d = String(tomorrow.getDate()).padStart(2, '0');
        return currentDate === `${y}-${m}-${d}`;
    })();

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

    // ... (rest of search state stays same)
    // Patient Search State
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredPacientes, setFilteredPacientes] = useState<Paciente[]>([]);
    const [showPatientResults, setShowPatientResults] = useState(false);
    const [patientHistory, setPatientHistory] = useState<Agenda[]>([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Paciente | null>(null);

    const [showManual, setShowManual] = useState(false);
    const [showQuienAgendoModal, setShowQuienAgendoModal] = useState(false);
    const [showMobileCalendar, setShowMobileCalendar] = useState(false);

    // (manualSections)
    const manualSections: ManualSection[] = [
        {
            title: 'Multiclínica',
            content: 'Utilice el selector de clínicas en la cabecera (esquina superior derecha) para cambiar entre las agendas de las diferentes clínicas.'
        },
        {
            title: 'Navegación',
            content: 'Utilice los botones "<<" y ">>" para moverse entre días, o "Hoy" para volver a la fecha actual. También puede seleccionar una fecha específica en el calendario lateral.'
        },
        // ... rest
        {
            title: 'Agendar Cita',
            content: 'Haga clic en cualquier espacio vacío de la grilla para programar una nueva cita en ese horario y consultorio. Complete el formulario con los datos del paciente.'
        },
        {
            title: 'Gestión de Citas',
            content: 'Haga clic en una cita existente (celdas coloreadas) para ver detalles, editarla o cambiar su estado. Los colores indican: Azul (Agendado), Verde (Confirmado), Rojo (Cancelado), Gris (Atendido).'
        },
        {
            title: 'Búsqueda de Pacientes',
            content: 'Utilice el buscador en la barra lateral izquierda para encontrar pacientes y ver su historial completo de citas.'
        },
        {
            title: 'Vista Global por Doctor',
            content: 'Utilice el selector de doctor en la cabecera para ver todas las citas de un profesional en todas las clínicas simultáneamente. En este modo, se mostrará el nombre de la clínica en cada cita y se deshabilitará la creación de nuevas citas.'
        }];

    // Sync with global clinic selection is now handled directly by using globalClinicaId

    // Generate dynamic row groups based on appointments (Unique Start Time + Duration combinations)
    const rowGroups = Array.from(new Set(
        appointments
            .filter(app => app.estado !== 'eliminado') 
            .map(app => JSON.stringify({ 
                hora: (app.hora || '08:00').substring(0, 5), 
                duracion: app.duracion || 30 
            }))
    ))
    .map(str => JSON.parse(str) as { hora: string, duracion: number })
    .sort((a, b) => {
        // Sort by time, then duration
        if (a.hora !== b.hora) return a.hora.localeCompare(b.hora);
        return a.duracion - b.duracion;
    });

    useEffect(() => {
        fetchAppointments();
        fetchGlobalAppointments();
        fetchPatients();
    }, [currentDate, globalClinicaId, selectedDoctorId]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const url = globalClinicaId 
                    ? `/agenda/estado-recordatorios-manana?clinicaId=${globalClinicaId}`
                    : '/agenda/estado-recordatorios-manana';
                const res = await api.get(url);
                setRecordatoriosEnviadosHoy(res.data.enviadoHoy);
            } catch (e) {
                console.error('Error fetching reminder status:', e);
            }
        };
        fetchStatus();
    }, [globalClinicaId, currentDate]);

    useEffect(() => {
        fetchDoctors();
    }, []);



    const fetchDoctors = async () => {
        try {
            const response = await api.get('/doctors?limit=2000');
            console.log('[AgendaView] Doctors response:', response.data);
            
            // Backend returns { data: Doctor[], total: number } or just Doctor[]
            const rawData = response.data.data || response.data;
            const dataArray = Array.isArray(rawData) ? rawData : [];
            
            const activeDoctors = dataArray.filter((d: any) => 
                d.estado?.toLowerCase() === 'activo'
            );
            
            console.log('[AgendaView] Active doctors loaded:', activeDoctors.length);
            setDoctors(activeDoctors);
        } catch (error) {
            console.error('[AgendaView] Error fetching doctors:', error);
        }
    };

    // Sync dateValue when currentDate changes (e.g. via prev/next buttons)
    useEffect(() => {
        const [year, month, day] = currentDate.split('-').map(Number);
        setDateValue(new Date(year, month - 1, day));
    }, [currentDate]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredPacientes([]);
            setShowPatientResults(false);
        } else {
            const lowerComp = searchTerm.toLowerCase();
            const filtered = pacientes.filter(p =>
                p.nombre.toLowerCase().includes(lowerComp) ||
                p.paterno.toLowerCase().includes(lowerComp) ||
                p.materno?.toLowerCase().includes(lowerComp)
            );
            setFilteredPacientes(filtered.slice(0, 10)); // Limit to 10 results
            setShowPatientResults(true);
        }
    }, [searchTerm, pacientes]);

    const fetchPatients = async () => {
        try {
            const url = globalClinicaId 
                ? `/pacientes?limit=2000&clinicaId=${globalClinicaId}&estado=activo` 
                : '/pacientes?limit=2000&estado=activo';
            const response = await api.get(url);
            setPacientes(Array.isArray(response.data.data) ? response.data.data : response.data);
        } catch (error) {
            console.error('Error fetching patients:', error);
        }
    };

    const handlePatientSelect = async (patient: Paciente) => {
        setSearchTerm(`${patient.nombre} ${patient.paterno}`);
        setShowPatientResults(false);
        setSelectedPatientForHistory(patient);

        try {
            const response = await api.get(`/agenda/paciente/${patient.id}`);
            setPatientHistory(response.data);
            setShowHistoryModal(true);
        } catch (error) {
            console.error('Error fetching patient history:', error);
            Swal.fire('Error', 'No se pudo obtener el historial del paciente', 'error');
        }
    };

    const fetchAppointments = async () => {
        try {
            let url = `/agenda?date=${currentDate}`;
            
            // If doctor is selected, we filter globally by doctor
            if (selectedDoctorId) {
                url += `&doctorId=${selectedDoctorId}`;
            } else if (globalClinicaId) {
                // Otherwise filter by clinic
                url += `&clinicaId=${globalClinicaId}`;
            }
            // If globalClinicaId is null, we fetch all without clinicaId filter
            const response = await api.get(url);
            setAppointments(response.data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    const fetchGlobalAppointments = async () => {
        try {
            const url = `/agenda?date=${currentDate}`;
            const response = await api.get(url);
            setGlobalAppointments(response.data || []);
        } catch (error) {
            console.error('Error fetching global appointments:', error);
        }
    };

    const handlePrevDay = () => {
        const date = new Date(currentDate + 'T00:00:00'); // Force local time interpretation
        date.setDate(date.getDate() - 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setCurrentDate(`${year}-${month}-${day}`);
    };

    const handleNextDay = () => {
        const date = new Date(currentDate + 'T00:00:00'); // Force local time interpretation
        date.setDate(date.getDate() + 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setCurrentDate(`${year}-${month}-${day}`);
    };

    const handleToday = () => {
        setCurrentDate(getLocalDateString());
    };

    const handleCalendarChange = (value: Value) => {
        if (value instanceof Date) {
            // Adjust for timezone offset to prevent day shift
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            setCurrentDate(`${year}-${month}-${day}`);
            setShowMobileCalendar(false);
        }
    };

    const handleCellClick = (time: string, clinicaId: number) => {
        if (isRestricted) {
            return; // Simply do nothing or could show a toast. For doctors, clicking empty slots shouldn't do anything.
        }

        // Disabled direct edit on empty click if filtering globally by doctor
        if (selectedDoctorId) {
            Swal.fire({
                icon: 'info',
                title: 'Modo Doctor activo',
                text: 'Para agendar una nueva cita, por favor seleccione una clínica específica y quite el filtro de doctor.',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }

        setEditingAppointment(null);
        setSelectedSlot({ time, clinicaId });
        setIsFormOpen(true);
    };

    const handleEditAppointment = (appointment: Agenda, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingAppointment(appointment);
        setSelectedSlot({ time: appointment.hora.substring(0, 5), clinicaId: appointment.clinicaId ?? null });
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setSelectedSlot({ time: '', clinicaId: null });
        setEditingAppointment(null);
    };

    const handleStatusChange = async (appointmentId: number, nuevoEstado: string, e: React.MouseEvent | React.ChangeEvent) => {
        e.stopPropagation(); // Prevent opening the edit modal

        try {
            // Special case for cancelled status
            let motivoCancelacion = '';
            if (nuevoEstado === 'cancelado') {
                const { value: text, isConfirmed } = await Swal.fire({
                    title: 'Motivo de Cancelación',
                    input: 'textarea',
                    inputPlaceholder: 'Ingrese el motivo...',
                    showCancelButton: true,
                    confirmButtonText: 'Confirmar Cancelación',
                    cancelButtonText: 'Volver',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });

                if (!isConfirmed) {
                    fetchAppointments(); // Reset select if cancelled
                    return;
                }
                motivoCancelacion = text || 'Sin motivo especificado';
            }

            const payload: any = { estado: nuevoEstado };
            if (nuevoEstado === 'cancelado') {
                payload.motivoCancelacion = motivoCancelacion;
            }

            await api.patch(`/agenda/${appointmentId}`, payload);
            
            Swal.fire({
                icon: 'success',
                title: 'Estado actualizado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });

            fetchAppointments();
            fetchGlobalAppointments();
        } catch (error: any) {
            console.error('Error updating status:', error);
            Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
            fetchAppointments();
            fetchGlobalAppointments();
        }
    };

    const handleFormSave = () => {
        fetchAppointments();
        fetchGlobalAppointments();
        handleFormClose();
    };

    // Removed handleClinicTabClick as it is no longer used

    const getAppointmentsForSlot = (time: string, clinicaId: number) => {
        return appointments.filter(app => {
            const appTime = (app.hora || '00:00').substring(0, 5);
            // Exclude cancelled appointments from blocking the slot visually if needed,
            // but we group them so we just return them. Filter later or render them grey.
            return appTime === time && app.clinicaId === clinicaId && app.estado !== 'cancelado';
        });
    };

    const handleEnviarRecordatorioIndividual = async (appointment: Agenda) => {
        if (!appointment.paciente?.celular) {
            Swal.fire('Atención', 'El paciente no tiene un número de celular registrado.', 'warning');
            return;
        }

        try {
            // 1. Verificar chatbots activos
            Swal.fire({
                title: 'Verificando chatbots...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const instances = [1, 2];
            const activeInstances: { id: number, label: string, phone: string }[] = [];

            const formatPhone = (phone: string) => {
                if (!phone) return 'Número desconocido';
                const d = phone.replace(/\D/g, '');
                if (d.startsWith('591')) return `(+591) ${d.substring(3)}`;
                return `(+${d})`;
            };

            for (const inst of instances) {
                try {
                    const res = await api.get(`/chatbot/${appointment.clinicaId}/status?instance=${inst}`);
                    if (res.data.status === 'connected') {
                        const formatted = formatPhone(res.data.phoneNumber);
                        activeInstances.push({
                            id: inst,
                            phone: formatted,
                            label: `<div class="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        <span class="font-bold">Instancia ${inst}</span> 
                                        <span class="text-blue-600 dark:text-blue-400 font-mono">${formatted}</span>
                                    </div>`
                        });
                    }
                } catch (e) {
                    console.error(`Error checking instance ${inst}:`, e);
                }
            }

            Swal.close();

            if (activeInstances.length === 0) {
                Swal.fire({
                    title: 'Chatbot Desconectado',
                    text: 'No hay ninguna instancia de WhatsApp conectada. Por favor, conecte el chatbot antes de enviar recordatorios.',
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
                return;
            }

            let selectedInstance = activeInstances[0].id;

            if (activeInstances.length > 1) {
                const inputOptions: any = {};
                activeInstances.forEach(ai => { inputOptions[ai.id] = ai.label; });

                const { value: instanceId, isConfirmed } = await Swal.fire({
                    title: 'Seleccionar número de envío',
                    html: '<p class="text-sm text-gray-500 mb-4">¿Cuál número desea usar para este recordatorio?</p>',
                    input: 'radio',
                    inputOptions,
                    inputValue: activeInstances[0].id,
                    showCancelButton: true,
                    confirmButtonText: 'Continuar',
                    cancelButtonText: 'Cancelar',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });

                if (!isConfirmed) return;
                selectedInstance = Number(instanceId);
            }

            // 2. Enviar recordatorio
            Swal.fire({
                title: 'Enviando mensaje...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await api.post('/agenda/recordatorio-individual', {
                agendaId: appointment.id,
                instance: selectedInstance
            });

            if (response.data.success) {
                // Actualizar estado local
                setAppointments(prev => prev.map(app => 
                    app.id === appointment.id ? { ...app, recordatorioEnviado: true } : app
                ));

                Swal.fire({
                    title: '¡Enviado!',
                    text: `Recordatorio enviado a ${appointment.paciente.nombre}`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', 'No se pudo enviar el recordatorio.', 'error');
            }
        } catch (error) {
            console.error('Error sending individual reminder:', error);
            Swal.fire('Error', 'Ocurrió un error al procesar el envío.', 'error');
        }
    };

    const handleEnviarRecordatoriosManana = async () => {
        // This function is now deprecated in favor of individual reminders
        Swal.fire('Información', 'Esta función ha sido reemplazada por recordatorios individuales en cada cita.', 'info');
    };

    // Calculate which cells to skip rendering - NOT NEEDED ANYMORE since we removed rowSpan.
    // Instead we just render stacked cards inside the same td.
    const visibleClinics = globalClinicaId 
        ? clinicas.filter(c => c.id === globalClinicaId) 
        : clinicas.filter(c => c.activo);
    // ... imports remain the same

    // ... logic up to return

    return (
        <div className="flex flex-col h-[85vh] p-2 md:p-5">
            {/* Main View Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-2 md:mb-6 no-print gap-2 md:gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2 sm:gap-3">
                            <CalendarIcon className="text-blue-600" size={24} />
                            Agenda
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs sm:text-sm hidden sm:block">Gestión de citas y programación de consultorios</p>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center flex-1 max-w-[550px]">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors self-center mr-2 flex-shrink-0"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>

                    {/* Patient Search Widget Moved to Header */}
                    <div className="relative flex-1 min-w-[180px]">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar Paciente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setShowPatientResults(false);
                                }}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center bg-transparent border-transparent hover:bg-transparent focus:outline-none"
                                title="Limpiar búsqueda"
                            >
                                <CloseIcon size={18} color="#ef4444" className="hover:opacity-75 transition-opacity" />
                            </button>
                        )}
                        {showPatientResults && filteredPacientes.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-b-md shadow-xl z-[9999] max-h-[250px] overflow-y-auto mt-1">
                                {filteredPacientes.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handlePatientSelect(p)}
                                        className="p-2.5 cursor-pointer border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-200 flex flex-col"
                                    >
                                        <strong className="text-blue-600 dark:text-blue-400">{p.nombre} {p.paterno}</strong>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Global Doctor Filter in Header */}
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <div className="relative w-full">
                            <SearchableSelect
                                options={doctors.map(d => ({
                                    id: d.id,
                                    label: `${d.nombre} ${d.paterno}`,
                                    subLabel: d.especialidad?.especialidad
                                }))}
                                value={selectedDoctorId || 0}
                                onChange={(val) => setSelectedDoctorId(val ? Number(val) : null)}
                                placeholder="-- Ver Agenda Global --"
                                icon={<UserIcon size={14} className="text-blue-500" />}
                                className="!py-1 shadow-sm"
                            />
                        </div>
                        {selectedDoctorId && (
                            <button 
                                onClick={() => setSelectedDoctorId(null)}
                                className="flex-shrink-0 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-1.5 rounded-full hover:bg-red-200 transition-colors border border-red-200 dark:border-red-800"
                                title="Quitar filtro de doctor"
                            >
                                <CloseIcon size={14} />
                            </button>
                        )}
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row-reverse gap-5 flex-1 overflow-hidden">

                {/* Sidebar Calendar - Hidden on mobile */}
                <div className="hidden md:flex w-[300px] flex-shrink-0 flex-col gap-5">

                    {/* Availability Widget */}
                    {/* Management Actions Sidebar */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col gap-3 min-h-0">
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowQuienAgendoModal(true)}
                                className="w-full px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-bold transition-all transform hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2 text-sm"
                                title="Buscar quién agendó"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Quien Agendó
                            </button>
                            {!isRestricted && (
                                <button
                                    onClick={() => navigate('/recordatorio')}
                                    className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition-all transform hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2 text-sm"
                                    title="Gestionar recordatorios"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Recordatorios
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/contactos')}
                                className="w-full px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold transition-all transform hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2 text-sm"
                                title="Ver Contactos"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Contactos
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 calendar-wrapper">
                        <Calendar
                            onChange={handleCalendarChange}
                            value={dateValue}
                            locale="es-ES"
                            className="dark:bg-gray-800 dark:text-white dark:border-gray-700 w-full"
                            tileClassName={({ date, view }) => view === 'month' && date.toDateString() === new Date().toDateString() ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full' : 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full'}
                        />
                    </div>
                </div>

                {/* Main Agenda Grid */}
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-w-0">

                    {/* Clinic Tabs Removed (Option A) */}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 gap-2">
                        {/* Botones de acción movidos a la izquierda */}
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pt-1 pb-1 no-scrollbar">
                            {!isRestricted && (
                                <button
                                    onClick={() => { setEditingAppointment(null); setSelectedSlot({ time: '08:00', clinicaId: globalClinicaId }); setIsFormOpen(true); }}
                                    className="flex-shrink-0 px-3 py-1.5 bg-[#3498db] hover:bg-blue-600 text-white rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md flex items-center gap-1"
                                    title="Agendar nueva cita manualmente"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Nueva Cita
                                </button>
                            )}
                            {/* 
                                !isRestricted && (
                                <button
                                    onClick={handleEnviarRecordatoriosManana}
                                    disabled={isSendingReminders || recordatoriosEnviadosHoy}
                                    className={`flex-shrink-0 px-3 py-1.5 text-white rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md flex items-center gap-1 ${recordatoriosEnviadosHoy ? 'bg-gray-400 cursor-not-allowed opacity-75' : isSendingReminders ? 'bg-green-400 cursor-not-allowed' : 'bg-[#28a745] hover:bg-green-600'}`}
                                    title={recordatoriosEnviadosHoy ? "Los recordatorios de mañana ya fueron enviados el día de hoy" : "Enviar WhatsApp de confirmación para citas de mañana"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    {recordatoriosEnviadosHoy ? 'Enviados Hoy' : 'Recordatorios'}
                                </button>
                                )
                            */}
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end mt-1 sm:mt-0 pt-1">
                            <button
                                onClick={handleToday}
                                className="px-2 sm:px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md"
                                title="Ir a hoy"
                            >
                                Hoy
                            </button>
                            <button
                                onClick={() => setShowMobileCalendar(true)}
                                className="md:hidden px-2 py-1.5 bg-blue-600 text-white rounded font-bold transition-all shadow-md flex items-center justify-center translate-y-[2px]"
                                title="Abrir Calendario"
                            >
                                <CalendarIcon size={16} />
                            </button>
                            <button
                                onClick={handlePrevDay}
                                className="px-2 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md"
                                title="Día anterior"
                            >
                                {'<<'}
                            </button>
                            <div className="flex flex-col items-center min-w-[120px] sm:min-w-[150px]">
                                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-black">
                                    {getDayName(currentDate)}
                                </span>
                                <span className="text-sm sm:text-xl font-bold text-gray-800 dark:text-white leading-tight">
                                    {formatDate(currentDate)}
                                </span>
                            </div>
                            <button
                                onClick={handleNextDay}
                                className="px-2 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded font-bold transition-all transform hover:-translate-y-0.5 text-xs sm:text-sm shadow-md"
                                title="Día siguiente"
                            >
                                {'>>'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto relative bg-white dark:bg-gray-800 custom-scrollbar">
                        <table className="min-w-[500px] md:min-w-[800px] w-full border-collapse table-fixed">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-10 shadow-sm">
                                <tr>
                                    <th className="sticky left-0 bg-gray-100 dark:bg-gray-700 z-[25] border border-gray-300 dark:border-gray-600 p-2 text-center font-bold text-gray-700 dark:text-gray-200 w-20 md:w-32 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">HORA</th>
                                    {visibleClinics.map(clinica => (
                                        <th key={clinica.id} className="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold text-gray-700 dark:text-gray-200 uppercase">{clinica.nombre}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rowGroups.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleClinics.length + 1} className="p-10 text-center text-gray-500 dark:text-gray-400 italic bg-white dark:bg-gray-800">
                                            No hay citas agendadas para este día. Utilice el botón "+ Nueva Cita" de arriba para comenzar a agendar.
                                        </td>
                                    </tr>
                                ) : (
                                    rowGroups.map((group, groupIndex) => {
                                        // Calculate exact end time for the row label
                                        const end = new Date(`1970-01-01T${group.hora}`);
                                        end.setMinutes(end.getMinutes() + group.duracion);
                                        const endTimeStr = end.toTimeString().substring(0, 5);

                                        // Calculate how many times to repeat the hour label based on the max appointments in any clinic for this row
                                        const appointmentsInRowByClinic = visibleClinics.map(clinica => {
                                            return appointments.filter(app => {
                                                const appTime = (app.hora || '00:00').substring(0, 5);
                                                return appTime === group.hora && (app.duracion || 30) === group.duracion && app.clinicaId === clinica.id && app.estado !== 'eliminado';
                                            }).length;
                                        });
                                        const maxAppsInRow = Math.max(...appointmentsInRowByClinic, 1);

                                        return (
                                            <React.Fragment key={groupIndex}>
                                                {Array.from({ length: maxAppsInRow }).map((_, appIndex) => (
                                                    <tr key={`${groupIndex}-${appIndex}`}>
                                                        <td className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1 md:p-2 text-center font-bold text-gray-700 dark:text-gray-300 text-sm align-middle whitespace-nowrap min-w-[80px] md:min-w-[120px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                            <div className="flex flex-col justify-center items-center gap-0.5">
                                                                <span className="text-[11px] md:text-sm">{group.hora}</span>
                                                                <span className="text-[8px] md:text-[9px] text-gray-500 font-medium">hasta {endTimeStr}</span>
                                                            </div>
                                                        </td>
                                                        {visibleClinics.map(clinica => {
                                                            const appsAtSlot = appointments.filter(app => {
                                                                const appTime = (app.hora || '00:00').substring(0, 5);
                                                                return appTime === group.hora && (app.duracion || 30) === group.duracion && app.clinicaId === clinica.id && app.estado !== 'eliminado';
                                                            });
                                                            const appointment = appsAtSlot[appIndex];
                                                            const isBlock = appointment && !appointment.paciente;
                                                            const bgColor = isBlock ? '#475569' : (appointment?.paciente?.categoria?.color || (appointment ? getStatusColor(appointment.estado) : ''));

                                                            return (
                                                                <td
                                                                    key={`${clinica.id}-${appIndex}`}
                                                                    className={`border border-gray-300 dark:border-gray-600 p-1.5 align-top transition-colors ${!appointment ? 'bg-white dark:bg-gray-800 opacity-50' : 'bg-blue-50/20 dark:bg-gray-800'}`}
                                                                >
                                                                    <div className="min-h-[85px] flex flex-col justify-center">
                                                                        {appointment ? (
                                                                            <div 
                                                                                onClick={(e) => handleEditAppointment(appointment, e)}
                                                                                className={`flex flex-col justify-center text-xs overflow-hidden px-1 py-1 md:px-2 md:py-1.5 rounded relative hover:opacity-90 transition-opacity cursor-pointer shadow-sm border border-black/10 ${appointment.estado === 'cancelado' ? 'text-red-800 opacity-70 grayscale-[0.2]' : ''} ${isBlock ? 'ring-1 ring-white/20' : ''}`}
                                                                                style={{ backgroundColor: appointment.estado === 'cancelado' ? '#fee2e2' : bgColor, borderLeft: `4px solid ${getStatusColor(appointment.estado, isBlock)}`, color: appointment.estado === 'cancelado' ? '#991b1b' : getContrastTextColor(bgColor || getStatusColor(appointment.estado, isBlock)) }}
                                                                            >
                                                                                {isBlock && <div className="absolute top-0 left-0 w-full h-full bg-stripe-pattern opacity-10 pointer-events-none rounded"></div>}
                                                                                {appointment.paciente && appointment.paciente.clasificacion && (
                                                                                    <div className={`absolute top-0 right-0 px-1 py-0.5 rounded-bl-[4px] text-[9px] font-black backdrop-blur-sm z-10 border-l border-b border-white/10 shadow-sm ${appointment.paciente.clasificacion.charAt(0) === 'A' ? 'bg-yellow-500/60 text-yellow-50' :
                                                                                            appointment.paciente.clasificacion.charAt(0) === 'B' ? 'bg-slate-500/60 text-slate-50' :
                                                                                                'bg-orange-500/60 text-orange-50'
                                                                                        }`}>
                                                                                        {appointment.paciente.clasificacion}
                                                                                    </div>
                                                                                )}
                                                                                <div className={`font-bold truncate pr-3 text-[11px] mb-0.5 ${appointment.estado === 'cancelado' ? 'text-red-600' : ''}`} style={appointment.estado !== 'cancelado' ? { color: getContrastTextColor(bgColor || getStatusColor(appointment.estado)), opacity: 0.85 } : {}}>
                                                                                    {!selectedDoctorId && appointment.doctor ? (
                                                                                        <span>Dr. {`${appointment.doctor.nombre} ${appointment.doctor.paterno} ${appointment.doctor.materno || ''}`.trim()}</span>
                                                                                    ) : !selectedDoctorId && (
                                                                                        <span className="opacity-70">Sin Doctor</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className={`font-bold truncate pr-3 text-[12px] mb-0.5 drop-shadow-sm ${appointment.estado === 'cancelado' ? 'line-through text-red-700' : ''}`} style={appointment.estado !== 'cancelado' ? { color: getContrastTextColor(bgColor || getStatusColor(appointment.estado)) } : {}}>
                                                                                    {appointment.paciente ? (
                                                                                        <span
                                                                                            className="underline underline-offset-2 cursor-pointer hover:opacity-75 transition-opacity"
                                                                                            title={`Ver perfil de ${appointment.paciente.nombre} ${appointment.paciente.paterno}`}
                                                                                            onClick={(e) => { e.stopPropagation(); navigate(`/pacientes/${appointment.paciente!.id}/ficha`); }}
                                                                                        >
                                                                                             <span className="hidden md:inline">
                                                                                                {`${appointment.paciente.nombre} ${appointment.paciente.paterno} ${appointment.paciente.materno || ''} ${appointment.paciente.seguro_medico ? `(${appointment.paciente.seguro_medico})` : ''}`.trim()}
                                                                                             </span>
                                                                                             <span className="md:hidden">
                                                                                                {`${appointment.paciente.nombre} ${appointment.paciente.paterno}`.trim()}
                                                                                             </span>
                                                                                         </span>
                                                                                    ) : (
                                                                                        <span className="italic">
                                                                                            {appointment.tratamiento || 'Bloqueo'}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {appointment.paciente && appointment.tratamiento && (
                                                                                    <div className="text-[11px] italic mt-0.5 truncate opacity-90 max-w-full">
                                                                                        {appointment.tratamiento}
                                                                                    </div>
                                                                                )}
                                                                                {appointment.observacion && (
                                                                                    <div className="text-[10px] mt-0.5 bg-black/10 px-1 py-0.5 rounded border-l-2 border-white/30 truncate max-w-full opacity-80" title={appointment.observacion}>
                                                                                        Obs: {appointment.observacion}
                                                                                    </div>
                                                                                )}
                                                                                {appointment.sucursal && (
                                                                                    <div className={`mt-0.5 text-[10px] font-bold py-0.5 px-0.5 rounded inline-flex items-center gap-1 shadow-sm border border-white/20 w-fit
                                                                                        ${appointment.sucursal?.toLowerCase()?.includes('arce') ? 'bg-indigo-600/60 text-white' :
                                                                                        appointment.sucursal?.toLowerCase()?.includes('miguel') ? 'bg-emerald-600/60 text-white' :
                                                                                        'bg-gray-600/60 text-white'}`}>
                                                                                        <LocationIcon size={8} /> {appointment.sucursal}
                                                                                    </div>
                                                                                )}
                                                                                <div className="text-[9px] mt-1 font-bold uppercase opacity-90 flex items-center gap-1.5">
                                                                                    <select
                                                                                        value={appointment.estado}
                                                                                        disabled={isRestricted}
                                                                                        className={`bg-black/20 hover:bg-black/30 text-white border-none rounded px-1.5 py-0.5 focus:ring-1 focus:ring-white/50 text-[9px] font-bold outline-none appearance-none w-fit ${isRestricted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                        onChange={(e) => handleStatusChange(appointment.id, e.target.value, e)}
                                                                                    >
                                                                                        <option value="agendado" className="bg-blue-600 text-white">AGENDADO</option>
                                                                                        <option value="confirmado" className="bg-green-600 text-white">CONFIRMADO</option>
                                                                                        <option value="atendido" className="bg-gray-600 text-white">ATENDIDO</option>
                                                                                        <option value="no_asistio" className="bg-purple-600 text-white">NO ASISTIÓ</option>
                                                                                        <option value="cancelado" className="bg-red-600 text-white">CANCELADO</option>
                                                                                    </select>
                                                                                    {appointment.doctorDeriva && (
                                                                                        <div className="text-[8px] sm:text-[9px] bg-orange-100/30 dark:bg-orange-900/40 text-white px-1.5 py-0.5 rounded border border-white/20 italic flex items-center gap-1">
                                                                                            <span className="opacity-70 font-bold">Derivado por:</span> 
                                                                                            Dr. {`${appointment.doctorDeriva.nombre} ${appointment.doctorDeriva.paterno} ${appointment.doctorDeriva.materno || ''}`.trim()}
                                                                                        </div>
                                                                                    )}
                                                                                    {isTomorrow && appointment.paciente && appointment.paciente.celular && (
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleEnviarRecordatorioIndividual(appointment); }}
                                                                                            disabled={appointment.recordatorioEnviado}
                                                                                            className={`flex-shrink-0 flex items-center justify-center w-[28px] h-[24px] rounded-lg shadow-md transition-all transform ${appointment.recordatorioEnviado ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:-translate-y-0.5'} text-white border-none`}
                                                                                            title={appointment.recordatorioEnviado ? "Recordatorio ya enviado" : "Enviar recordatorio por WhatsApp"}
                                                                                        >
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                                                                                            </svg>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="h-full w-full flex items-center justify-center opacity-30">
                                                                                <span className="text-gray-400 dark:text-gray-600 text-[10px] italic">Sin cita</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {isFormOpen && (
                    <AgendaForm
                        isOpen={isFormOpen}
                        onClose={handleFormClose}
                        onSave={handleFormSave}
                        initialData={editingAppointment}
                        defaultDate={currentDate}
                        defaultTime={selectedSlot?.time}
                        defaultClinicaId={selectedSlot?.clinicaId}
                        existingAppointments={appointments}
                    />
                )}

                {/* History Modal */}
                {showHistoryModal && selectedPatientForHistory && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
                        <div className="bg-white dark:bg-gray-800 w-[90%] max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white m-0">📅 Historial de Citas: {selectedPatientForHistory.nombre} {selectedPatientForHistory.paterno}</h2>
                            </div>
                            <div className="p-0 overflow-y-auto flex-1 dark:bg-gray-800">
                                {patientHistory.length === 0 ? (
                                    <p className="text-center text-gray-500 dark:text-gray-400 p-8">No hay citas registradas para este paciente.</p>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                            <tr>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Fecha</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Hora</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Doctor</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Tratamiento</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Estado</th>
                                                <th className="p-3 border-b border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-white">Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {patientHistory.map((cita) => (
                                                <tr key={cita.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(cita.fecha)}</td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{cita.hora ? cita.hora.substring(0, 5) : '-'}</td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{cita.doctor ? `Dr. ${cita.doctor.nombre}` : '-'}</td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300">{cita.tratamiento || '-'}</td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ backgroundColor: getStatusColor(cita.estado, !cita.pacienteId && !cita.paciente) }}>
                                                            {cita.estado.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-gray-700 dark:text-gray-300 text-sm">
                                                        {cita.estado === 'cancelado' && cita.motivoCancelacion ? (
                                                            <span className="italic">{cita.motivoCancelacion}</span>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-right">
                                <button
                                    onClick={() => setShowHistoryModal(false)}
                                    className="px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm font-medium transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ManualModal
                    isOpen={showManual}
                    onClose={() => setShowManual(false)}
                    title="Manual de Usuario - Agenda"
                    sections={manualSections}
                />

                <QuienAgendoModal
                    isOpen={showQuienAgendoModal}
                    onClose={() => setShowQuienAgendoModal(false)}
                />

                {/* Mobile Calendar Modal */}
                {showMobileCalendar && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in md:hidden">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-[320px] overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <CalendarIcon size={18} className="text-blue-500" />
                                    Seleccionar Fecha
                                </h3>
                                <button
                                    onClick={() => setShowMobileCalendar(false)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 bg-transparent border-none flex items-center justify-center"
                                >
                                    <CloseIcon size={24} />
                                </button>
                            </div>
                            <div className="p-2 calendar-wrapper mobile-calendar">
                                <Calendar
                                    onChange={handleCalendarChange}
                                    value={dateValue}
                                    locale="es-ES"
                                    className="dark:bg-gray-800 dark:text-white dark:border-none w-full border-none"
                                />
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-center">
                                <button
                                    onClick={() => setShowMobileCalendar(false)}
                                    className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                /* Base Calendar Styles */
                .calendar-wrapper .react-calendar { 
                    border: none; 
                    font-family: inherit;
                    width: 100%;
                    background-color: white;
                    color: #1f2937;
                }
                
                .calendar-wrapper .react-calendar__navigation button {
                    min-width: 44px;
                    background: none;
                    color: #1f2937;
                }
                
                .calendar-wrapper .react-calendar__navigation__label {
                    font-weight: bold;
                }
                
                .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #f3f4f6;
                }
                
                /* Light Mode Day Styles */
                .calendar-wrapper .react-calendar__month-view__days__day {
                    color: #374151;
                }
                
                .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #dc2626;
                }
                
                .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #9ca3af;
                }
                
                .calendar-wrapper .react-calendar__tile:enabled:hover,
                .calendar-wrapper .react-calendar__tile:enabled:focus {
                    background-color: #f3f4f6;
                }
                
                .calendar-wrapper .react-calendar__tile--now {
                    background: #fef3c7;
                    color: #92400e;
                    font-weight: bold;
                }
                
                .calendar-wrapper .react-calendar__tile--now:enabled:hover,
                .calendar-wrapper .react-calendar__tile--now:enabled:focus {
                    background: #fde68a;
                }
                
                .calendar-wrapper .react-calendar__tile--active {
                    background: #3b82f6;
                    color: white;
                    font-weight: bold;
                }
                
                .calendar-wrapper .react-calendar__tile--active:enabled:hover,
                .calendar-wrapper .react-calendar__tile--active:enabled:focus {
                    background: #2563eb;
                }
                
                /* Dark Mode Calendar Styles */
                .dark .calendar-wrapper .react-calendar {
                    background-color: #1f2937;
                    color: white;
                }
                
                .dark .calendar-wrapper .react-calendar__navigation button {
                    color: white;
                }
                
                .dark .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .dark .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #374151;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day {
                    color: #d1d5db;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #f87171;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #6b7280;
                }
                
                .dark .calendar-wrapper .react-calendar__tile:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile:enabled:focus {
                    background-color: #374151;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--now {
                    background: #eab308;
                    color: black;
                    font-weight: bold;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--now:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile--now:enabled:focus {
                    background: #ca8a04;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--active {
                    background: #2563eb;
                    color: white;
                    font-weight: bold;
                }
                
                .dark .calendar-wrapper .react-calendar__tile--active:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile--active:enabled:focus {
                    background: #1d4ed8;
                }

                /* Mobile specific style adjustment */
                .mobile-calendar .react-calendar {
                    border: none !important;
                    width: 100% !important;
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.15s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                .bg-stripe-pattern {
                    background-image: linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent);
                    background-size: 10px 10px;
                }

                @media (max-height: 600px) and (orientation: landscape) {
                    .flex.flex-col.h-\[85vh\] {
                        height: 92vh !important;
                    }
                    h1.text-xl {
                        font-size: 1.1rem !important;
                        margin-bottom: 0 !important;
                    }
                    .mb-2.md\:mb-6 {
                        margin-bottom: 0.25rem !important;
                    }
                    .p-2.sm\:p-4 {
                        padding: 0.25rem 0.5rem !important;
                    }
                }
            `}</style>
            </div>
        </div>
    );
};


export default AgendaView;
