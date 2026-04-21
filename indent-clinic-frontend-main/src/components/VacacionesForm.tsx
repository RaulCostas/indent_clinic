import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Personal } from '../types';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { getLocalDateString } from '../utils/dateUtils';
import { useClinica } from '../context/ClinicaContext';

interface VacacionesFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

const VacacionesForm: React.FC<VacacionesFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const { clinicaSeleccionada } = useClinica();
    const isEditing = !!id;

    const [personalList, setPersonalList] = useState<Personal[]>([]);

    // Form State
    const [idpersonal, setIdPersonal] = useState<number | ''>('');
    const [fecha, setFecha] = useState(getLocalDateString());
    const [tipoSolicitud, setTipoSolicitud] = useState('Vacación');
    const [cantidadDias, setCantidadDias] = useState(0);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [autorizado, setAutorizado] = useState('');
    const [observaciones, setObservaciones] = useState('');

    // State regarding vacation balance (Moved to top level to avoid hook errors)
    const [diasTomados, setDiasTomados] = useState(0);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Solicitudes de Vacaciones',
            content: 'Registre solicitudes de vacaciones y permisos del personal. El sistema calcula automáticamente los días disponibles según la antigüedad.'
        },
        {
            title: 'Tipos de Solicitud',
            content: 'Vacación, A cuenta de vacación, Permiso con/sin goce de haber, Compensación, Reemplazo. Cada tipo afecta diferente el saldo de vacaciones.'
        },
        {
            title: 'Saldo de Vacaciones',
            content: 'El sistema muestra los días disponibles, tomados y restantes. Los días se calculan automáticamente según la fecha de ingreso del personal.'
        }];

    const tipoSolicitudOptions = [
        'Vacación',
        'A cuenta de vacación',
        'Permiso con goce de haber',
        'Permiso sin goce de haber',
        'Compensación',
        'Reemplazo'
    ];

    useEffect(() => {
        if (isOpen) {
            fetchPersonal();
            if (isEditing) {
                fetchVacacion();
            } else {
                setIdPersonal('');
                setFecha(getLocalDateString());
                setTipoSolicitud('Vacación');
                setCantidadDias(0);
                setFechaDesde('');
                setFechaHasta('');
                setAutorizado('');
                setObservaciones('');
            }
        }
    }, [id, isOpen, clinicaSeleccionada]);

    // Effect for vacation balance
    useEffect(() => {
        if (idpersonal) {
            api.get(`/vacaciones/dias-tomados/${idpersonal}`)
                .then(res => setDiasTomados(Number(res.data) || 0))
                .catch(console.error);
        } else {
            setDiasTomados(0);
        }
    }, [idpersonal]);

    const fetchPersonal = async () => {
        try {
            const params = new URLSearchParams({ limit: '1000' });
            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }
            const response = await api.get(`/personal?${params}`);
            const activePersonal = (response.data.data || []).filter((person: any) => person.estado === 'activo');
            setPersonalList(activePersonal);
        } catch (error) {
            console.error('Error fetching personal:', error);
        }
    };

    const fetchVacacion = async () => {
        try {
            const response = await api.get(`/vacaciones/${id}`);
            const data = response.data;
            setIdPersonal(data.idpersonal);
            setFecha(data.fecha.split('T')[0]);
            setTipoSolicitud(data.tipo_solicitud);
            setCantidadDias(data.cantidad_dias);
            setFechaDesde(data.fecha_desde.split('T')[0]);
            setFechaHasta(data.fecha_hasta.split('T')[0]);
            setAutorizado(data.autorizado);
            setObservaciones(data.observaciones || '');
        } catch (error) {
            console.error('Error fetching vacacion:', error);
            Swal.fire('Error', 'No se pudo cargar la solicitud', 'error');
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            idpersonal: Number(idpersonal),
            fecha,
            tipo_solicitud: tipoSolicitud,
            cantidad_dias: Number(cantidadDias),
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            autorizado,
            observaciones
        };

        console.log('Sending payload:', payload);

        try {
            if (isEditing) {
                await api.patch(`/vacaciones/${id}`, payload);
                await Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: 'La solicitud ha sido actualizada correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                await api.post('/vacaciones', payload);
                await Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    text: 'La solicitud ha sido creada registradas correctamente',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving vacacion:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Error al guardar la solicitud'
            });
        }
    };

    const renderVacationInfo = () => {
        if (!idpersonal) return null;
        const person = personalList.find(p => p.id === Number(idpersonal));

        if (person && person.fecha_ingreso) {
            // Fix timezone issue by treating string as local or formatting manually
            const fechaParts = person.fecha_ingreso.toString().split('T')[0].split('-');
            const year = parseInt(fechaParts[0]);
            const month = parseInt(fechaParts[1]) - 1; // 0-indexed
            const day = parseInt(fechaParts[2]);

            const ingreso = new Date(year, month, day);
            const hoy = new Date();

            let years = hoy.getFullYear() - ingreso.getFullYear();
            // Check if anniversary has passed this year
            const m = hoy.getMonth() - ingreso.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) {
                years--;
            }

            let diasCorrespondientes = 0;
            for (let i = 1; i <= years; i++) {
                if (i >= 1 && i <= 5) diasCorrespondientes += 15;
                else if (i >= 6 && i <= 10) diasCorrespondientes += 20;
                else if (i >= 11) diasCorrespondientes += 30;
            }

            // Format display date manually to ensure it matches input
            const displayDate = `${day}/${month + 1}/${year}`;
            const saldo = diasCorrespondientes - diasTomados;

            return (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p className="text-sm text-blue-700">
                        <strong>Fecha de Ingreso:</strong> {displayDate}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                        <strong>Antigüedad:</strong> {years} {years === 1 ? 'año' : 'años'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-blue-200">
                        <div className="text-center">
                            <p className="text-xs text-blue-600">Corresponden</p>
                            <p className="font-bold text-lg text-blue-800">{diasCorrespondientes}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-red-600">Tomados</p>
                            <p className="font-bold text-lg text-red-800">-{diasTomados}</p>
                        </div>
                        <div className="text-center bg-white rounded shadow-sm">
                            <p className="text-xs text-green-600 font-bold uppercase">Saldo</p>
                            <p className={`font-bold text-lg ${saldo < 0 ? 'text-red-600' : 'text-green-700'}`}>
                                {saldo}
                            </p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
                <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg text-cyan-600 dark:text-cyan-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </span>
                                {isEditing ? 'Editar Solicitud de Vacación' : 'Nueva Solicitud de Vacación'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Personal */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personal</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    </div>
                                    <select
                                        value={idpersonal}
                                        onChange={(e) => setIdPersonal(Number(e.target.value))}
                                        className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="">Seleccione Personal...</option>
                                        {personalList.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.nombre} {p.paterno} {p.materno}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Vacation Days Info Rendered Here */}
                            {renderVacationInfo()}

                            {/* Fecha Solicitud */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Solicitud</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </div>
                                    <input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Tipo Solicitud */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Solicitud</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                        </svg>
                                    </div>
                                    <select
                                        value={tipoSolicitud}
                                        onChange={(e) => setTipoSolicitud(e.target.value)}
                                        className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        {tipoSolicitudOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Dias */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Días</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                <line x1="4" y1="9" x2="20" y2="9"></line>
                                                <line x1="4" y1="15" x2="20" y2="15"></line>
                                                <line x1="10" y1="3" x2="8" y2="21"></line>
                                                <line x1="16" y1="3" x2="14" y2="21"></line>
                                            </svg>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={cantidadDias}
                                            onChange={(e) => setCantidadDias(Number(e.target.value))}
                                            className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                </div>
                                {/* Desde */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                        </div>
                                        <input
                                            type="date"
                                            value={fechaDesde}
                                            onChange={(e) => setFechaDesde(e.target.value)}
                                            className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                </div>
                                {/* Hasta */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                        </div>
                                        <input
                                            type="date"
                                            value={fechaHasta}
                                            onChange={(e) => setFechaHasta(e.target.value)}
                                            className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Autorizado */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autorizado por</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={autorizado}
                                        onChange={(e) => setAutorizado(e.target.value)}
                                        className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Nombre de quien autoriza..."

                                    />
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                            <path d="M12 20h9"></path>
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                                        </svg>
                                    </div>
                                    <textarea
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="w-full pl-10 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex justify-start gap-3 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
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
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
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
                title="Manual - Vacaciones"
                sections={manualSections}
            />
        </>
    );
};

export default VacacionesForm;
