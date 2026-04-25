import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Agenda, Paciente, Doctor, Proforma } from '../types';

interface AgendaFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    initialData: Agenda | null;
    defaultDate: string;
    defaultTime?: string;
    defaultConsultorio?: number;
    defaultClinicaId?: number | null;
    existingAppointments?: Agenda[];
    defaultPacienteId?: number;
}

import QuickPacienteForm from './QuickPacienteForm';
import Swal from 'sweetalert2';
import { useClinica } from '../context/ClinicaContext';
import SearchableSelect from './SearchableSelect';


const AgendaForm: React.FC<AgendaFormProps> = ({
    isOpen, onClose, onSave, initialData, defaultDate, defaultTime, defaultConsultorio, defaultClinicaId, existingAppointments = [], defaultPacienteId
}) => {
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const { clinicaSeleccionada } = useClinica();
    const [historiaClinica, setHistoriaClinica] = useState<any[]>([]);
    const [tratamientos, setTratamientos] = useState<any[]>([]);
    const [isQuickPatientOpen, setIsQuickPatientOpen] = useState(false);
    const [isNonPatientEvent, setIsNonPatientEvent] = useState(false);

    const [formData, setFormData] = useState({
        fecha: defaultDate,
        hora: defaultTime || '08:00',
        duracion: 60,
        pacienteId: 0,
        doctorId: 0,
        proformaId: 0,
        estado: 'agendado',
        usuarioId: 0,
        tratamiento: '',
        motivoCancelacion: '',
        clinicaId: defaultClinicaId || clinicaSeleccionada || 0,
        observacion: '',
        sucursal: 'San Miguel',
        doctorDerivaId: 0
    });

    const [maxDuration, setMaxDuration] = useState(120); // Default max
    const [durationWarning, setDurationWarning] = useState<string | null>(null);
    const [doctorWarning, setDoctorWarning] = useState<string | null>(null);
    const [isRestricted, setIsRestricted] = useState(false);
    const [horaHastaLocal, setHoraHastaLocal] = useState('');

    // Sync Hora Hasta Local when start time or duration changes
    useEffect(() => {
        if (formData.hora && formData.duracion) {
            setHoraHastaLocal(calculateHoraHasta(formData.hora, formData.duracion));
        }
    }, [formData.hora, formData.duracion]);
 
    // Helper to format time as HH:mm
    const calculateHoraHasta = (start: string, duration: number) => {
        if (!start || !duration) return '';
        const [h, m] = start.split(':').map(Number);
        const totalMins = h * 60 + m + Number(duration);
        const endH = Math.floor(totalMins / 60) % 24;
        const endM = totalMins % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

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

    // Check Global Doctor Availability
    useEffect(() => {
        if (!formData.doctorId || !formData.fecha || !formData.hora || !formData.duracion) {
            setDoctorWarning(null);
            return;
        }

        const checkDoctorAvail = async () => {
            try {
                // Fetch completely across all clinics (no clinicaId passed). Requires backend support.
                const response = await api.get(`/agenda?date=${formData.fecha}&doctorId=${formData.doctorId}`);
                const agendas = response.data || [];
                
                const timeToMinutes = (t: string) => {
                    const [h, m] = t.split(':').map(Number);
                    return h * 60 + m;
                };

                const currentStart = timeToMinutes(formData.hora);
                const currentEnd = currentStart + Number(formData.duracion);

                // Check collisions, ignoring self (initialData.id) and cancelled ones.
                const collision = agendas.find((app: any) => {
                    if (app.id === initialData?.id) return false;
                    if (app.estado === 'cancelado' || app.estado === 'eliminado' || app.estado === 'no_asistio') return false;

                    const appStart = timeToMinutes(app.hora);
                    const appEnd = appStart + (app.duracion || 30);

                    // Strict overlap: start1 < end2 AND end1 > start2
                    return currentStart < appEnd && currentEnd > appStart;
                });

                if (collision) {
                    const clinicaName = collision.clinica?.nombre || 'otra sucursal';
                    const finH = Math.floor((timeToMinutes(collision.hora) + (collision.duracion||30))/60).toString().padStart(2, '0');
                    const finM = ((timeToMinutes(collision.hora) + (collision.duracion||30))%60).toString().padStart(2, '0');
                    setDoctorWarning(`⚠️ Cuidado: Este doctor ya tiene una cita agendada en ${clinicaName} de ${collision.hora.substring(0,5)} a ${finH}:${finM} hrs.`);
                } else {
                    setDoctorWarning(null);
                }
            } catch (error) {
                console.error("Error checking doctor availability", error);
                setDoctorWarning(null);
            }
        };

        // Small debounce to avoid flashing errors while editing
        const timeout = setTimeout(checkDoctorAvail, 500);
        return () => clearTimeout(timeout);

    }, [formData.doctorId, formData.fecha, formData.hora, formData.duracion, initialData?.id]);

    // Get current user
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setFormData(prev => ({ ...prev, usuarioId: user.id }));
            } catch (e) {
                console.error("Error parsing user", e);
            }
        }
    }, []);

    useEffect(() => {
        if (isOpen && !initialData) {
            setFormData(prev => ({
                ...prev,
                fecha: defaultDate,
                hora: defaultTime || '08:00',
                clinicaId: defaultClinicaId || clinicaSeleccionada || 0,
                // Reset other fields for new app
                pacienteId: defaultPacienteId || 0,
                doctorId: 0,
                proformaId: 0,
                tratamiento: '',
                motivoCancelacion: '',
                observacion: '',
                sucursal: 'San Miguel',
                doctorDerivaId: 0
            }));
            setIsNonPatientEvent(false);
            setHoraHastaLocal(calculateHoraHasta(defaultTime || '08:00', 60));
            if (defaultPacienteId) {
                fetchProformasByPaciente(defaultPacienteId);
                fetchHistoriaClinica(defaultPacienteId);
            }
        }
    }, [isOpen, initialData, defaultDate, defaultTime, defaultConsultorio, defaultClinicaId, clinicaSeleccionada, defaultPacienteId]);

    useEffect(() => {
        fetchCatalogs();
    }, [clinicaSeleccionada]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                fecha: initialData.fecha,
                hora: initialData.hora,
                duracion: initialData.duracion,
                pacienteId: initialData.pacienteId || 0,
                doctorId: initialData.doctorId,
                proformaId: initialData.proformaId || 0,
                estado: initialData.estado,
                usuarioId: initialData.usuarioId,
                tratamiento: initialData.tratamiento || '',
                motivoCancelacion: initialData.motivoCancelacion || '',
                clinicaId: initialData.clinicaId || clinicaSeleccionada || 0,
                observacion: initialData.observacion || '',
                sucursal: initialData.sucursal || '',
                doctorDerivaId: initialData.doctorDerivaId || 0
            });

            if (!initialData.pacienteId || initialData.pacienteId === 0) {
                setIsNonPatientEvent(true);
            } else {
                setIsNonPatientEvent(false);
                fetchProformasByPaciente(initialData.pacienteId);
                fetchHistoriaClinica(initialData.pacienteId);
                if (initialData.proformaId) {
                    fetchTratamientosByProforma(initialData.proformaId);
                }
            }
            setHoraHastaLocal(calculateHoraHasta(initialData.hora, initialData.duracion));
        } else {
            // Si es nueva cita y cambia la clínica, reseteamos el paciente seleccionado
            // para evitar que queden pacientes de otra sede en el selector
            setFormData(prev => ({
                ...prev,
                pacienteId: defaultPacienteId || 0,
                proformaId: 0,
                tratamiento: '',
                clinicaId: clinicaSeleccionada || 0,
                observacion: '',
                sucursal: 'San Miguel'
            }));
            if (defaultPacienteId && defaultPacienteId > 0) {
                fetchProformasByPaciente(defaultPacienteId);
                fetchHistoriaClinica(defaultPacienteId);
            } else {
                setProformas([]);
                setHistoriaClinica([]);
                setTratamientos([]);
            }
        }
    }, [initialData, clinicaSeleccionada, defaultPacienteId]);

    const fetchCatalogs = async () => {
        try {
            const patientsUrl = clinicaSeleccionada 
                ? `/pacientes?limit=1000&clinicaId=${clinicaSeleccionada}&estado=activo` 
                : '/pacientes?limit=1000&estado=activo';
            
            const [doctorsRes, pacientesRes] = await Promise.all([
                api.get('/doctors?limit=1000'),
                api.get(patientsUrl)
            ]);
            const activeDoctors = (doctorsRes.data.data || []).filter((doctor: any) => doctor.estado === 'activo');
            const activePatients = (pacientesRes.data.data || []); // Status filter is now in API
            setDoctors(activeDoctors);
            setPacientes(activePatients);
        } catch (error) {
            console.error('Error fetching catalogs:', error);
        }
    };

    const fetchProformasByPaciente = async (pacienteId: number) => {
        try {
            const response = await api.get(`/proformas/paciente/${pacienteId}`);
            setProformas(response.data || []);
        } catch (error) {
            console.error('Error fetching proformas:', error);
            setProformas([]);
        }
    };

    const fetchHistoriaClinica = async (pacienteId: number) => {
        try {
            const response = await api.get(`/historia-clinica/paciente/${pacienteId}`);
            setHistoriaClinica(response.data);
        } catch (error) {
            console.error('Error fetching historia clinica:', error);
        }
    };

    const fetchTratamientosByProforma = async (proformaId: number) => {
        try {
            const response = await api.get(`/proformas/${proformaId}`);
            const proforma = response.data;

            if (proforma.detalles && proforma.detalles.length > 0) {
                // Only include confirmed treatments (posible=false)
                setTratamientos(proforma.detalles.filter((d: any) => !d.posible));
            } else {
                setTratamientos([]);
            }
        } catch (error) {
            console.error('Error fetching tratamientos:', error);
            setTratamientos([]);
        }
    };

    const handlePatientCreated = async (newPaciente: Paciente) => {
        // Refresh the list to ensure we have the latest data
        await fetchCatalogs();

        setFormData(prev => ({
            ...prev,
            pacienteId: newPaciente.id,
            proformaId: 0,
            tratamiento: ''
        }));
        // No proformas for new patient obviously
        setProformas([]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'pacienteId') {
            const newPacienteId = Number(value);
            setFormData(prev => ({
                ...prev,
                pacienteId: newPacienteId,
                proformaId: 0, // Reset proforma when patient changes
                tratamiento: '' // Reset tratamiento
            }));
            if (newPacienteId > 0) {
                fetchProformasByPaciente(newPacienteId);
                fetchHistoriaClinica(newPacienteId);
            } else {
                setProformas([]);
                setHistoriaClinica([]);
                setTratamientos([]);
            }
        } else if (name === 'proformaId') {
            const selectedProformaId = Number(value);

            setFormData(prev => ({
                ...prev,
                proformaId: selectedProformaId,
                tratamiento: ''
            }));

            if (selectedProformaId > 0) {
                fetchTratamientosByProforma(selectedProformaId);
            } else {
                setTratamientos([]);
            }
        } else if (name === 'hora') {
            const newStart = value;
            setFormData(prev => ({
                ...prev,
                hora: newStart
            }));
            // UI effect will handle horaHastaLocal sync
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name.includes('Id') || name === 'duracion' || name === 'consultorio' ? Number(value) : value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate Clínica
        if (!formData.clinicaId || formData.clinicaId <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Por favor seleccione una Sede / Clínica',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }

        // Validate required fields before submitting
        if (!formData.doctorId || formData.doctorId <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Por favor seleccione un doctor',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }

        // Validate patient if not a non-patient event
        if (!isNonPatientEvent && (!formData.pacienteId || formData.pacienteId <= 0)) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Por favor seleccione un paciente o marque como evento sin paciente',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }

        // Validate tratamiento for non-patient events
        if (isNonPatientEvent && !formData.tratamiento.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Por favor ingrese una descripción para el evento',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            return;
        }

        try {
            const payload = {
                ...formData,
                pacienteId: formData.pacienteId > 0 ? formData.pacienteId : undefined,
                proformaId: formData.proformaId > 0 ? formData.proformaId : undefined,
                doctorDerivaId: formData.doctorDerivaId > 0 ? formData.doctorDerivaId : undefined,
                clinicaId: Number(formData.clinicaId)
            };

            // Validate user
            if (!payload.usuarioId || payload.usuarioId <= 0) {
                // Try to get again or warn
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const u = JSON.parse(userStr);
                    payload.usuarioId = u.id;
                }
                if (!payload.usuarioId || payload.usuarioId <= 0) {
                    Swal.fire('Error', 'No se pudo identificar al usuario. Inicie sesión nuevamente.', 'error');
                    return;
                }
            }

            let response;
            if (initialData) {
                response = await api.patch(`/agenda/${initialData.id}`, payload);
            } else {
                response = await api.post('/agenda', payload);
            }

            if (response.data && response.data.error) {
                // If it's a known business logic error, details might be a stack trace which we don't want to show
                throw new Error(response.data.message);
            }

            await Swal.fire({
                icon: 'success',
                title: initialData ? 'Cita Actualizada' : 'Cita Agendada',
                text: initialData ? 'La cita se ha actualizado correctamente' : 'La cita se ha agendado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
            onSave();
        } catch (error: any) {
            console.error('Error saving appointment:', error);
            const msg = error.message || error.response?.data?.message || 'Error al guardar la cita';
            Swal.fire({
                icon: 'error',
                title: 'No se puede agendar',
                text: Array.isArray(msg) ? msg.join(', ') : msg
            });
        }
    };

    const handleDelete = async () => {
        try {
            // ALWAYS get current user from localStorage for the action of deleting
            // formData.usuarioId contains whom created the appointment, not who is deleting it
            let currentUserId = 0;
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    currentUserId = JSON.parse(userStr).id;
                } catch (e) {
                    console.error("Error parsing user", e);
                }
            }

            // Fallback to 0 if not found, but it should be found if logged in
            await api.delete(`/agenda/${initialData?.id}?userId=${currentUserId}`);
            await Swal.fire({
                icon: 'success',
                title: 'Cita Eliminada',
                text: 'La cita ha sido eliminada correctamente',
                timer: 1500,
                showConfirmButton: false
            });
            onSave();
        } catch (error) {
            console.error('Error deleting appointment:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al eliminar la cita'
            });
        }
    }

    const handleHoraHastaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setHoraHastaLocal(newVal); // Actualizar siempre lo que el usuario escribe
 
        if (!newVal || !formData.hora) return;
 
        const [startH, startM] = formData.hora.split(':').map(Number);
        const [endH, endM] = newVal.split(':').map(Number);
        
        // Solo actualizar duracion si es una hora válida y posterior al inicio
        if (!isNaN(startH) && !isNaN(endH)) {
            const startTotal = (startH * 60 + startM);
            const endTotal = (endH * 60 + endM);
            const diff = endTotal - startTotal;
 
            if (diff > 0) {
                setFormData(prev => ({ ...prev, duracion: diff }));
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] max-w-[90%] max-h-[90vh] overflow-y-auto shadow-xl text-gray-800 dark:text-gray-100">
                <h2 className="mt-0 text-xl font-bold mb-4 flex items-center gap-3">
                    <span className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-purple-600 dark:text-purple-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </span>
                    {initialData ? 'Editar Cita' : 'Nueva Cita'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">




                        {/* 1. Fecha / Sucursal */}
                        <div>
                            <label className="block mb-1 font-bold text-sm">Fecha:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    required
                                    disabled={isRestricted}
                                    className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-sm">Sucursal:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <path d="M3 21h18"></path>
                                    <path d="M9 8h1"></path>
                                    <path d="M9 12h1"></path>
                                    <path d="M9 16h1"></path>
                                    <path d="M14 8h1"></path>
                                    <path d="M14 12h1"></path>
                                    <path d="M14 16h1"></path>
                                    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                                </svg>
                                <select
                                    name="sucursal"
                                    value={formData.sucursal}
                                    onChange={handleChange}
                                    disabled={isRestricted}
                                    className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-75 disabled:cursor-not-allowed"
                                >
                                    <option value="">-- Seleccione Sucursal --</option>
                                    <option value="Av. Arce">Av. Arce</option>
                                    <option value="San Miguel">San Miguel</option>
                                </select>
                            </div>
                        </div>


                        {/* 2. Hora / Duracion */}
                        <div>
                            <label className="block mb-1 font-bold text-sm">Hora Desde:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <input
                                    type="time"
                                    name="hora"
                                    value={formData.hora}
                                    onChange={handleChange}
                                    step="900"
                                    required
                                    disabled={isRestricted}
                                    className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-sm">Hora Hasta:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <input
                                    type="time"
                                    name="horaHasta"
                                    value={horaHastaLocal}
                                    onChange={handleHoraHastaChange}
                                    step="900"
                                    required
                                    disabled={isRestricted}
                                    className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                                />
                            </div>
                            {durationWarning && (
                                <div className="text-red-500 text-xs mt-1">
                                    {durationWarning}
                                </div>
                            )}
                        </div>

                        {/* 3. Bloqueo */}
                        {!isRestricted && (
                            <div className="col-span-1 md:col-span-2">
                                <label className="inline-flex items-center cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        checked={isNonPatientEvent}
                                        onChange={(e) => {
                                            setIsNonPatientEvent(e.target.checked);
                                            if (e.target.checked) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    pacienteId: 0,
                                                    proformaId: 0,
                                                    tratamiento: ''
                                                }));
                                                setProformas([]);
                                            }
                                        }}
                                        className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300 font-bold">Bloqueo / Evento (Sin Paciente)</span>
                                </label>
                            </div>
                        )}

                        {/* 4. Paciente */}
                        {!isNonPatientEvent && (
                            <div className="col-span-1 md:col-span-2">
                                <label className="block mb-1 font-bold text-sm">Paciente:</label>
                                <div className="flex gap-2.5">
                                    <SearchableSelect
                                        options={pacientes.map(p => ({
                                            id: p.id,
                                            label: `${p.nombre} ${p.paterno} ${p.materno}`.trim(),
                                            subLabel: p.celular ? `Cel: ${p.celular}` : undefined
                                        }))}
                                        value={formData.pacienteId}
                                        disabled={isRestricted}
                                        onChange={(val) => {
                                            const newPacienteId = Number(val);
                                            setFormData(prev => ({
                                                ...prev,
                                                pacienteId: newPacienteId,
                                                proformaId: 0,
                                                tratamiento: ''
                                            }));
                                            if (newPacienteId > 0) {
                                                fetchProformasByPaciente(newPacienteId);
                                                fetchHistoriaClinica(newPacienteId);
                                            } else {
                                                setProformas([]);
                                                setHistoriaClinica([]);
                                                setTratamientos([]);
                                            }
                                        }}
                                        placeholder="-- Seleccione Paciente --"
                                        required={!isNonPatientEvent}
                                        className="flex-1"
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                        }
                                    />
                                    {!isRestricted && (
                                        <button
                                            type="button"
                                            onClick={() => setIsQuickPatientOpen(true)}
                                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                            title="Nuevo Paciente Rápido"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 5. Doctor */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block mb-1 font-bold text-sm">Doctor:</label>
                                <SearchableSelect
                                    options={doctors.map(d => ({
                                        id: d.id,
                                        label: `${d.nombre} ${d.paterno} ${d.materno || ''}`.trim(),
                                        subLabel: d.especialidad?.especialidad
                                    }))}
                                    value={formData.doctorId}
                                    onChange={(val) => setFormData(prev => ({ ...prev, doctorId: Number(val) }))}
                                    placeholder="-- Seleccione Doctor --"
                                    required
                                    disabled={isRestricted}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    }
                                />
                                {doctorWarning && (
                                    <div className="text-red-600 dark:text-red-400 text-xs mt-1 font-bold animate-pulse">
                                        {doctorWarning}
                                    </div>
                                )}
                        </div>

                        {/* 6. Plan Tratamiento */}
                        {!isNonPatientEvent && (
                            <div className="col-span-1 md:col-span-2">
                                <label className="block mb-1 font-bold text-sm">Plan Tratamiento (Opcional):</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    <select
                                        name="proformaId"
                                        value={formData.proformaId}
                                        onChange={handleChange}
                                        className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:opacity-75 disabled:cursor-not-allowed"
                                        disabled={isRestricted || formData.pacienteId === 0}
                                    >
                                        <option value="" disabled>-- Seleccione --</option><option value={0}>-- Ninguna --</option>
                                        {proformas.map(p => {
                                            const isCompleted = historiaClinica.some(h =>
                                                h.proformaId === p.id && h.estadoPresupuesto === 'terminado'
                                            );

                                            return (
                                                <option
                                                    key={p.id}
                                                    value={p.id}
                                                    style={isCompleted ? {
                                                        color: '#16a34a',
                                                        fontWeight: 'bold'
                                                    } : undefined}
                                                >
                                                    No. {p.numero} - {p.fecha} {isCompleted ? '(Completado)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* 7. Tratamiento */}
                        {isNonPatientEvent ? (
                            <div className="col-span-1 md:col-span-2">
                                <label className="block mb-1 font-bold text-sm">Motivo / Descripción del Evento:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-3 text-gray-400 pointer-events-none">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    <textarea
                                        name="tratamiento"
                                        value={formData.tratamiento}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Ej: Reunión, Viaje, Bloqueo de agenda..."
                                        className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required={isNonPatientEvent}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="col-span-1 md:col-span-2">
                                <label className="block mb-1 font-bold text-sm">Tratamiento:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`absolute left-2.5 text-gray-400 pointer-events-none ${formData.proformaId === 0 ? 'top-4' : 'top-1/2 -translate-y-1/2'}`}>
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>

                                    {formData.proformaId === 0 ? (
                                        <textarea
                                            name="tratamiento"
                                            value={formData.tratamiento}
                                            onChange={handleChange}
                                            className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-[60px] resize-y"
                                            placeholder="Detalle del tratamiento..."
                                        />
                                    ) : (
                                        <select
                                            name="tratamiento"
                                            value={formData.tratamiento}
                                            onChange={handleChange}
                                            className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="">-- Seleccione Tratamiento --</option>
                                            {tratamientos.map((detalle, index) => {
                                                let isCompleted = false;

                                                if (detalle.piezas) {
                                                    const allPiezas = detalle.piezas.split('/').map((p: string) => p.trim());
                                                    const completedPieces: string[] = [];
                                                    historiaClinica.forEach(h => {
                                                        if (h.proformaDetalleId === detalle.id &&
                                                            h.estadoTratamiento === 'terminado' &&
                                                            h.pieza) {
                                                            const pieces = h.pieza.split('/').map((p: string) => p.trim());
                                                            completedPieces.push(...pieces);
                                                        }
                                                    });
                                                    isCompleted = allPiezas.length > 0 && allPiezas.every((p: string) => completedPieces.includes(p));
                                                } else {
                                                    isCompleted = historiaClinica.some(h =>
                                                        h.proformaDetalleId === detalle.id &&
                                                        h.estadoTratamiento === 'terminado'
                                                    );
                                                }

                                                const tratamientoText = detalle.arancel?.detalle || `Tratamiento ${index + 1}`;
                                                const piezasText = detalle.piezas ? ` - Piezas: ${detalle.piezas}` : '';

                                                return (
                                                    <option
                                                        key={index}
                                                        value={tratamientoText}
                                                        style={isCompleted ? {
                                                            color: '#16a34a',
                                                            fontWeight: 'bold'
                                                        } : undefined}
                                                    >
                                                        {tratamientoText}{piezasText} {isCompleted ? '(Completado)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 8. Observacion */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block mb-1 font-bold text-sm">Observación:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-3 text-gray-400 pointer-events-none">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <textarea
                                    name="observacion"
                                    value={formData.observacion}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Notas adicionales..."
                                    className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Derivado por */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block mb-1 font-bold text-sm">Derivado por (opcional):</label>
                                <SearchableSelect
                                    options={doctors.map(d => ({
                                        id: d.id,
                                        label: `${d.nombre} ${d.paterno} ${d.materno || ''}`.trim(),
                                        subLabel: d.especialidad?.especialidad
                                    }))}
                                    value={formData.doctorDerivaId}
                                    onChange={(val) => setFormData(prev => ({ ...prev, doctorDerivaId: Number(val) }))}
                                    placeholder="-- Seleccione Doctor --"
                                    disabled={isRestricted}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    }
                                />
                        </div>

                        {/* 9. Estado */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block mb-1 font-bold text-sm">Estado:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                    <line x1="12" y1="2" x2="12" y2="12"></line>
                                </svg>
                                <select
                                    name="estado"
                                    value={formData.estado}
                                    onChange={handleChange}
                                    disabled={isRestricted}
                                    className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-bold disabled:opacity-75 disabled:cursor-not-allowed"
                                >
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="agendado">Agendado</option>
                                    <option value="confirmado">Confirmado</option>
                                    <option value="atendido">Atendido</option>
                                    <option value="no_asistio">No Asistió</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                            </div>
                        </div>



                        {/* Motivo de Cancelación - Only show when estado is cancelado */}
                        {formData.estado === 'cancelado' && (
                            <div className="col-span-1 md:col-span-2">
                                <label className="block mb-1 font-bold text-sm">Motivo de Cancelación:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-3 text-gray-400 pointer-events-none">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    <textarea
                                        name="motivoCancelacion"
                                        value={formData.motivoCancelacion}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Ingrese el motivo de la cancelación..."
                                        className="w-full pl-9 p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                    </div>

                    <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl mt-6">
                        <button
                            type="submit"
                            disabled={!!doctorWarning}
                            className={`${doctorWarning ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform ${doctorWarning ? '' : 'hover:-translate-y-0.5'} transition-all shadow-md`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {initialData ? 'Actualizar' : 'Guardar'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancelar
                        </button>

                        {initialData && !isRestricted && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="ml-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Eliminar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Quick Patient Modal - Moved outside the form */}
            <QuickPacienteForm
                isOpen={isQuickPatientOpen}
                onClose={() => setIsQuickPatientOpen(false)}
                onSuccess={handlePatientCreated}
            />
        </div>
    );
};

export default AgendaForm;
