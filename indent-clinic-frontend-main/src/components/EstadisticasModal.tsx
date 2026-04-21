import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Personal } from '../types';
import Swal from 'sweetalert2';
import { X } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';

interface EstadisticasModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface EstadisticasData {
    Malo: number;
    Regular: number;
    Bueno: number;
    total: number;
}

const EstadisticasModal: React.FC<EstadisticasModalProps> = ({ isOpen, onClose }) => {
    const { clinicaSeleccionada } = useClinica();
    const [personal, setPersonal] = useState<Personal[]>([]);
    const [selectedPersonal, setSelectedPersonal] = useState<number>(0);
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [estadisticas, setEstadisticas] = useState<EstadisticasData | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchPersonal();
        }
    }, [isOpen, clinicaSeleccionada]);

    const fetchPersonal = async () => {
        try {
            const params = new URLSearchParams({ limit: '1000' });
            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }
            const response = await api.get(`/personal?${params}`);
            setPersonal(response.data.data || []);
        } catch (error) {
            console.error('Error fetching personal:', error);
        }
    };

    const handleConsultar = async () => {
        if (!selectedPersonal || selectedPersonal === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Seleccione Personal',
                text: 'Por favor seleccione un miembro del personal'
            });
            return;
        }

        try {
            const response = await api.get(`/calificacion/estadisticas/${selectedPersonal}/${selectedYear}/${selectedMonth}`);
            setEstadisticas(response.data);
        } catch (error) {
            console.error('Error fetching estadisticas:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las estadísticas'
            });
        }
    };

    const renderPieChart = () => {
        if (!estadisticas || estadisticas.total === 0) {
            return (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No hay datos para mostrar
                </div>
            );
        }

        const total = estadisticas.total;
        const malo = (estadisticas.Malo / total) * 100;
        const regular = (estadisticas.Regular / total) * 100;
        const bueno = (estadisticas.Bueno / total) * 100;

        let currentAngle = 0;
        const createSlice = (percentage: number) => {
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            currentAngle = endAngle;

            const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;

            return `M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
        };

        return (
            <div className="flex flex-col items-center gap-6">
                <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-lg">
                    {estadisticas.Malo > 0 && (
                        <path d={createSlice(malo)} fill="#ef4444" stroke="white" strokeWidth="2" />
                    )}
                    {estadisticas.Regular > 0 && (
                        <path d={createSlice(regular)} fill="#eab308" stroke="white" strokeWidth="2" />
                    )}
                    {estadisticas.Bueno > 0 && (
                        <path d={createSlice(bueno)} fill="#22c55e" stroke="white" strokeWidth="2" />
                    )}
                </svg>

                <div className="grid grid-cols-3 gap-4 w-full">
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{estadisticas.Malo}</div>
                        <div className="text-sm text-red-700 dark:text-red-300">Malo</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{malo.toFixed(1)}%</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{estadisticas.Regular}</div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">Regular</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{regular.toFixed(1)}%</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{estadisticas.Bueno}</div>
                        <div className="text-sm text-green-700 dark:text-green-300">Bueno</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{bueno.toFixed(1)}%</div>
                    </div>
                </div>

                <div className="text-center text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Total de calificaciones:</span> {estadisticas.total}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    const months = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
                        Estadísticas de Calificaciones
                    </h3>
                    <button
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 text-sm sm:text-base flex items-center gap-2 shadow-md">
                        <X size={18} />
                        Cerrar
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Personal
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <select
                                    value={selectedPersonal}
                                    onChange={(e) =>setSelectedPersonal(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value={0}>-- Seleccione --</option>
                                    {personal.filter(p => p.estado === 'activo').map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre} {p.paterno}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Mes
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) =>setSelectedMonth(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="" disabled>-- Seleccione --</option>
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Año
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <select
                                    value={selectedYear}
                                    onChange={(e) =>setSelectedYear(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="" disabled>-- Seleccione --</option>
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-3 sm:mt-4">
                        <button
                            onClick={handleConsultar}
                            className="w-auto px-6 sm:px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 sm:py-3 rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Consultar Estadísticas
                        </button>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
                        {renderPieChart()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EstadisticasModal;
