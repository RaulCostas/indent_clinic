import React, { useState, useEffect } from 'react';
import ManualModal, { type ManualSection } from './ManualModal';
import api from '../services/api';
import { useClinica } from '../context/ClinicaContext';
import { User } from 'lucide-react';

interface DoctorStat {
    id: number;
    nombreCompleto: string;
    totalGenerado: number;
}

const EstadisticasDoctores: React.FC = () => {
    const { clinicaSeleccionada } = useClinica();
    // Get first and last day of current month as default
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [fechaInicio, setFechaInicio] = useState<string>(formatDate(firstDay));
    const [fechaFinal, setFechaFinal] = useState<string>(formatDate(lastDay));
    const [status, setStatus] = useState<string>('activo');
    const [loading, setLoading] = useState<boolean>(false);
    const [stats, setStats] = useState<DoctorStat[]>([]);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Estadísticas de Doctores',
            content: 'Este reporte muestra el total de ingresos generados por cada doctor en el periodo seleccionado.'
        },
        {
            title: 'Filtros',
            content: 'Puede filtrar por rango de fechas (Fecha Inicio y Fecha Final) y Estado del doctor (Activo/Inactivo) para refinar los resultados.'
        },
        {
            title: 'Gráfico',
            content: 'La barra de color indica visualmente el porcentaje de contribución de cada doctor respecto al total máximo generado en el periodo.'
        }];



    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/doctors/statistics', {
                params: { fechaInicio, fechaFinal, status, clinicaId: clinicaSeleccionada || 0 }
            });
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching statistics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clinicaSeleccionada]);

    const maxTotal = Math.max(...stats.map(s => s.totalGenerado), 0);

    // Color palette for charts
    const colors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#6366F1',
        '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#06B6D4'
    ];

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <User className="text-blue-600" size={32} />
                        Estadísticas de Doctores
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Ingresos generados por el personal médico</p>
                </div>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm no-print"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 pl-10 min-w-[180px] w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Final</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={fechaFinal}
                            onChange={(e) => setFechaFinal(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 pl-10 min-w-[180px] w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado Doctor</label>
                    <div className="relative">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 pl-10 min-w-[150px] w-full appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="" disabled>-- Seleccione --</option>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                            <option value="ambos">Ambos</option>
                        </select>
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none h-[42px] flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generando...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Generar Estadística
                        </>
                    )}
                </button>
            </div>

            {/* Chart Area */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                {stats.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay datos para los filtros seleccionados.</p>
                ) : (
                    <div className="space-y-4">
                        {stats.map((stat, index) => {
                            const percentage = maxTotal > 0 ? (stat.totalGenerado / maxTotal) * 100 : 0;
                            const color = colors[index % colors.length];

                            return (
                                <div key={stat.id} className="flex items-center">
                                    <div className="w-48 text-right pr-4 font-medium text-gray-700 dark:text-gray-300 truncate" title={stat.nombreCompleto}>
                                        {stat.nombreCompleto}
                                    </div>
                                    <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative group">
                                        <div
                                            className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                            style={{ width: `${Math.max(percentage, 0.5)}%`, backgroundColor: color }}
                                        >
                                            {/* Hover tooltip could go here if needed */}
                                        </div>
                                    </div>
                                    <div className="w-32 pl-4 text-gray-800 dark:text-white font-bold">
                                        {stat.totalGenerado.toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>


            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Estadísticas Doctores"
                sections={manualSections}
            />
        </div >
    );
};

export default EstadisticasDoctores;
