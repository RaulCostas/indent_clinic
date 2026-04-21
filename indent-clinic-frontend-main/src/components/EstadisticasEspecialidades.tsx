import React, { useState, useEffect } from 'react';
import ManualModal, { type ManualSection } from './ManualModal';
import api from '../services/api';
import { Stethoscope } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';

interface EspecialidadStat {
    id: number;
    nombre: string;
    cantidad: number;
}

const EstadisticasEspecialidades: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const { clinicaSeleccionada } = useClinica();
    const [year, setYear] = useState<number>(currentYear);
    const [month, setMonth] = useState<number>(currentMonth);
    const [loading, setLoading] = useState<boolean>(false);
    const [stats, setStats] = useState<EspecialidadStat[]>([]);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Tratamientos por Especialidad',
            content: 'Gráfico de barras que muestra la cantidad de tratamientos realizados por especialidad.'
        },
        {
            title: 'Análisis',
            content: 'Permite identificar qué áreas o especialidades tienen mayor demanda en la clínica.'
        }];

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
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
        { value: 12, label: 'Diciembre' },
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/especialidad/statistics', {
                params: { year, month, clinicaId: clinicaSeleccionada }
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

    const totalTratamientos = stats.reduce((acc, curr) => acc + curr.cantidad, 0);
    const maxCantidad = Math.max(...stats.map(s => s.cantidad), 0);

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
                        <Stethoscope className="text-blue-600" size={32} />
                        Estadísticas de Especialidades
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis de demanda por especialidad médica</p>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                    <div className="relative">
                        <select
                            value={year}
                            onChange={(e) =>setYear(Number(e.target.value))}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 pl-10 min-w-[100px] w-full appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                                    <option value="" disabled>-- Seleccione --</option>
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mes</label>
                    <div className="relative">
                        <select
                            value={month}
                            onChange={(e) =>setMonth(Number(e.target.value))}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 pl-10 min-w-[150px] w-full appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                                    <option value="" disabled>-- Seleccione --</option>
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
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

                <div className="flex-1 text-right self-center">
                    <span className="text-lg font-bold text-gray-700 dark:text-white">Total: {totalTratamientos}</span>
                </div>
            </div>

            {/* Chart Area - Bar Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                {stats.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay datos para los filtros seleccionados.</p>
                ) : (
                    <div className="space-y-4">
                        {stats.map((stat, index) => {
                            const percentage = maxCantidad > 0 ? (stat.cantidad / maxCantidad) * 100 : 0;
                            const totalPercent = totalTratamientos > 0 ? ((stat.cantidad / totalTratamientos) * 100).toFixed(1) : '0';
                            const color = colors[index % colors.length];

                            return (
                                <div key={stat.id} className="flex items-center">
                                    <div className="w-48 text-right pr-4 font-medium text-gray-700 dark:text-gray-300 truncate" title={stat.nombre}>
                                        {stat.nombre}
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative flex items-center">
                                            <div
                                                className="h-full rounded-lg transition-all duration-500"
                                                style={{ width: `${Math.max(percentage, 1)}%`, backgroundColor: color }}
                                            >
                                            </div>
                                            <span className="ml-2 text-sm font-semibold text-gray-700 absolute left-2 text-white drop-shadow-md">
                                                {stat.cantidad} ({totalPercent}%)
                                            </span>
                                        </div>
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
                title="Manual de Usuario - Estadísticas Especialidades"
                sections={manualSections}
            />
        </div >
    );
};

export default EstadisticasEspecialidades;
