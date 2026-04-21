import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Personal, Paciente } from '../types';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { getLocalDateString } from '../utils/dateUtils';
import { useClinica } from '../context/ClinicaContext';

interface CalificacionFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

const CalificacionForm: React.FC<CalificacionFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const { clinicaSeleccionada } = useClinica();
    const isEditing = Boolean(id);

    const [formData, setFormData] = useState({
        personalId: 0,
        pacienteId: 0,
        consultorio: 1,
        calificacion: 'Bueno' as 'Malo' | 'Regular' | 'Bueno',
        fecha: getLocalDateString(),
        observaciones: '',
        evaluadorId: 0
    });

    const [personal, setPersonal] = useState<Personal[]>([]);
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Calificaciones de Personal',
            content: 'Registre evaluaciones del personal por parte de pacientes. Califique el servicio como Malo, Regular o Bueno para seguimiento de calidad.'
        },
        {
            title: 'Consultorio y Fecha',
            content: 'Indique el consultorio (1-5) donde se brindó el servicio y la fecha de la evaluación para análisis estadístico.'
        },
        {
            title: 'Observaciones',
            content: 'Agregue comentarios adicionales para proporcionar contexto sobre la calificación y mejorar el servicio.'
        }];

    useEffect(() => {
        if (isOpen) {
            fetchPersonal();
            fetchPacientes();
            getCurrentUser();
            if (isEditing) {
                fetchCalificacion();
            } else {
                setFormData({
                    personalId: 0,
                    pacienteId: 0,
                    consultorio: 1,
                    calificacion: 'Bueno',
                    fecha: getLocalDateString(),
                    observaciones: '',
                    evaluadorId: 0
                });
                // After resetting form data, ensure current user is set again
                getCurrentUser();
            }
        }
    }, [id, isOpen, clinicaSeleccionada]);

    const getCurrentUser = () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setFormData(prev => ({ ...prev, evaluadorId: user.id }));
        }
    };

    const fetchPersonal = async () => {
        try {
            const params = new URLSearchParams({ limit: '1000' });
            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }
            const response = await api.get(`/personal?${params}`);
            const activePersonal = (response.data.data || []).filter((person: any) => person.estado === 'activo');
            setPersonal(activePersonal);
        } catch (error) {
            console.error('Error fetching personal:', error);
        }
    };

    const fetchPacientes = async () => {
        try {
            const response = await api.get('/pacientes?limit=1000');
            setPacientes(response.data.data || []);
        } catch (error) {
            console.error('Error fetching pacientes:', error);
        }
    };

    const fetchCalificacion = async () => {
        try {
            const response = await api.get(`/calificacion/${id}`);
            const cal = response.data;
            setFormData({
                personalId: cal.personalId,
                pacienteId: cal.pacienteId,
                consultorio: cal.consultorio,
                calificacion: cal.calificacion,
                fecha: cal.fecha.split('T')[0],
                observaciones: cal.observaciones || '',
                evaluadorId: cal.evaluadorId
            });
        } catch (error) {
            console.error('Error fetching calificacion:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la calificación'
            });
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.personalId || formData.personalId === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo requerido',
                text: 'Por favor seleccione el personal'
            });
            return;
        }

        if (!formData.pacienteId || formData.pacienteId === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo requerido',
                text: 'Por favor seleccione el paciente'
            });
            return;
        }

        try {
            if (isEditing) {
                await api.patch(`/calificacion/${id}`, formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Calificación actualizada exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                await api.post('/calificacion', formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: 'Calificación guardada exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving calificacion:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo guardar la calificación'
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'personalId' || name === 'pacienteId' || name === 'consultorio' || name === 'evaluadorId'
                ? Number(value)
                : value
        }));
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
                <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                                {isEditing ? 'Editar Calificación' : 'Nueva Calificación'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Personal */}
                                <div>
                                    <label className="block font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        Personal
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <select
                                            name="personalId"
                                            value={formData.personalId}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        ><option value={0}>-- Seleccione Personal --</option>
                                            {personal.filter(p => p.estado === 'activo').map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} {p.paterno} {p.materno}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Paciente */}
                                <div>
                                    <label className="block font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        Paciente
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <select
                                            name="pacienteId"
                                            value={formData.pacienteId}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        ><option value={0}>-- Seleccione Paciente --</option>
                                            {pacientes.filter(p => p.estado === 'activo').map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} {p.paterno} {p.materno}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Consultorio */}
                                <div>
                                    <label className="block font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        Consultorio
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <input
                                            type="number"
                                            name="consultorio"
                                            value={formData.consultorio}
                                            onChange={handleChange}
                                            min={1}
                                            max={5}
                                            required
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Ingrese número de consultorio (1-5)"

                                        />
                                    </div>
                                </div>

                                {/* Fecha */}
                                <div>
                                    <label className="block font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        Fecha
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="date"
                                            name="fecha"
                                            value={formData.fecha}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Calificación */}
                            <div>
                                <label className="block font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Calificación
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="calificacion"
                                            value="Malo"
                                            checked={formData.calificacion === 'Malo'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        <span className="px-4 py-2 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 font-semibold">
                                            Malo
                                        </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="calificacion"
                                            value="Regular"
                                            checked={formData.calificacion === 'Regular'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        <span className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 font-semibold">
                                            Regular
                                        </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="calificacion"
                                            value="Bueno"
                                            checked={formData.calificacion === 'Bueno'}
                                            onChange={handleChange}
                                            className="mr-2"
                                        />
                                        <span className="px-4 py-2 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 font-semibold">
                                            Bueno
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                                    Observaciones
                                </label>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Comentarios adicionales..."

                                />
                            </div>

                            {/* Buttons */}
                            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-start gap-3 rounded-b-xl mt-6">
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {isEditing ? 'Actualizar' : 'Guardar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Calificaciones"
                sections={manualSections}
            />
        </>
    );
};

export default CalificacionForm;

