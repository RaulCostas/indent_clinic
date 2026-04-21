import React, { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente } from '../types';
import { getLocalDateString } from '../utils/dateUtils';
import { Plus } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';


interface QuickPacienteFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newPaciente: Paciente) => void;
}

const QuickPacienteForm: React.FC<QuickPacienteFormProps> = ({ isOpen, onClose, onSuccess }) => {
    const { clinicaSeleccionada } = useClinica();
    const [formData, setFormData] = useState({
        nombre: '',
        paterno: '',
        materno: '',
        celular: '',
        sexo: 'Masculino', // Default
        seguro_medico: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Construct payload with defaults for required fields
            const payload = {
                ...formData,
                fecha_nacimiento: getLocalDateString(), // Default to today
                clinicaId: clinicaSeleccionada || undefined,
                fecha: getLocalDateString(), // Registration date
                direccion: '',
                telefono: '',
                email: '',
                casilla: '',
                profesion: '',
                estado_civil: 'Soltero',
                direccion_oficina: '',
                telefono_oficina: '',
                poliza: '',
                recomendado: '',
                responsable: '',
                parentesco: '',
                direccion_responsable: '',
                telefono_responsable: '',
                tipo_paciente: 'Normal',
                nomenclatura: 'Paciente Remitido',
                estado: 'activo',
                clasificacion: 'A0',
                fichaMedica: {
                    alergia_anestesicos: false,
                    alergias_drogas: false,
                    hepatitis: false,
                    asma: false,
                    diabetes: false,
                    dolencia_cardiaca: false,
                    hipertension: false,
                    fiebre_reumatica: false,
                    diatesis_hemorragia: false,
                    sinusitis: false,
                    ulcera_gastroduodenal: false,
                    enfermedades_tiroides: false,
                    observaciones: '',
                    medico_cabecera: '',
                    enfermedad_actual: '',
                    toma_medicamentos: false,
                    medicamentos_detalle: '',
                    tratamiento: '',
                    ultima_consulta: '',
                    frecuencia_cepillado: '',
                    usa_cepillo: false,
                    usa_hilo_dental: false,
                    usa_enjuague: false,
                    mal_aliento: false,
                    causa_mal_aliento: '',
                    sangra_encias: false,
                    dolor_cara: false,
                    comentarios: ''
                }
            };

            const response = await api.post('/pacientes', payload);
            if (response.data) {
                Swal.fire({
                    icon: 'success',
                    title: 'Paciente Registrado',
                    text: 'Paciente registrado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
                onSuccess(response.data);
                onClose();
            }
        } catch (error: any) {
            console.error('Error creating patient:', error);
            const errorMessage = error.response?.data?.message || 'Error al crear paciente';
            Swal.fire({
                icon: 'error',
                title: 'Aviso',
                text: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-lg w-full max-w-[400px] max-h-[95vh] overflow-y-auto shadow-lg text-gray-800 dark:text-white">
                <h3 className="mt-0 text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-white">Nuevo Paciente Rápido</h3>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-3">
                        <div>
                            <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Nombre:</label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                required
                                className="w-full p-2 pl-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Juan"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Paterno:</label>
                                <input
                                    type="text"
                                    name="paterno"
                                    value={formData.paterno}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-2 pl-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: Pérez"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Materno: <span className="text-xs font-normal text-gray-400">(opcional)</span></label>
                                <input
                                    type="text"
                                    name="materno"
                                    value={formData.materno}
                                    onChange={handleChange}
                                    className="w-full p-2 pl-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: Gómez"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Celular:</label>
                            <input
                                type="text"
                                name="celular"
                                value={formData.celular}
                                onChange={handleChange}
                                required
                                className="w-full p-2 pl-4 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: 70012345"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Sexo:</label>
                            <select
                                name="sexo"
                                value={formData.sexo}
                                onChange={handleChange}
                                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-bold text-sm text-gray-700 dark:text-gray-300">Seguro:</label>
                            <select
                                name="seguro_medico"
                                value={formData.seguro_medico}
                                onChange={handleChange}
                                required
                                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Seleccione --</option>
                                {Number(clinicaSeleccionada) === 1 && (
                                    <>
                                        <option value="BISA">BISA</option>
                                        <option value="PRIVADO">PRIVADO</option>
                                    </>
                                )}
                                {Number(clinicaSeleccionada) === 2 && (
                                    <>
                                        <option value="ALIANZA GOLD">ALIANZA GOLD</option>
                                        <option value="ALIANZA SILVER">ALIANZA SILVER</option>
                                        <option value="ALIANZA ODONT.">ALIANZA ODONT.</option>
                                        <option value="PRIVADO">PRIVADO</option>
                                    </>
                                )}
                                {Number(clinicaSeleccionada) === 3 && (
                                    <>
                                        <option value="NACIONAL VIDA">NACIONAL VIDA</option>
                                        <option value="PRIVADO">PRIVADO</option>
                                    </>
                                )}
                                {![1, 2, 3].includes(Number(clinicaSeleccionada)) && (
                                    <option value="PRIVADO">PRIVADO</option>
                                )}
                            </select>
                        </div>
                    </div>
                    {/* Footer Buttons */}
                    <div className="flex justify-start gap-3 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-4 -mb-5 sm:-mx-5 sm:-mb-5">
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 sm:px-4 rounded flex items-center gap-2 transition-colors transform hover:-translate-y-0.5 shadow-sm text-sm sm:text-base"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            Guardar
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 sm:px-4 rounded transition-colors flex items-center gap-2 text-sm sm:text-base"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Unused styles removed

export default QuickPacienteForm;
