import React, { useState, useEffect } from 'react';
import ManualModal, { type ManualSection } from './ManualModal';
import api from '../services/api';
import { useClinica } from '../context/ClinicaContext';
import { TrendingUp } from 'lucide-react';

interface MonthlyData {
    ingresos: number;
    egresos: number;
    utilidad: number;
}

interface UtilidadStat {
    month: number;
    bolivianos: MonthlyData;
    dolares: MonthlyData;
}

const EstadisticasUtilidades: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState<number>(currentYear);
    const [currency, setCurrency] = useState<'Bolivianos' | 'Dólares'>('Bolivianos');
    const [loading, setLoading] = useState<boolean>(false);
    const [stats, setStats] = useState<UtilidadStat[]>([]);
    const [showManual, setShowManual] = useState(false);
    const { clinicaSeleccionada } = useClinica();

    const manualSections: ManualSection[] = [
        {
            title: 'Estadísticas de Utilidades',
            content: 'Visión general financiera del consultorio. Compare Ingresos vs Egresos y vea la Utilidad Neta mensual.'
        },
        {
            title: 'Moneda',
            content: 'Puede alternar la vista entre Bolivianos (Bs) y Dólares ($us) usando los botones superiores.'
        },
        {
            title: 'Interpretación',
            content: 'Las barras verdes representan Ingresos, las rojas Egresos. El punto azul (o rojo si es negativo) indica la Utilidad real del mes.'
        }];

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = { year };
            if (clinicaSeleccionada) {
                params.clinicaId = clinicaSeleccionada;
            }
            const response = await api.get('/utilidades/statistics', {
                params
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
    }, [year, clinicaSeleccionada]);

    const getData = (stat: UtilidadStat) => currency === 'Bolivianos' ? stat.bolivianos : stat.dolares;
    const formatMoney = (amount: number) => amount.toLocaleString('es-BO', { style: 'currency', currency: currency === 'Bolivianos' ? 'BOB' : 'USD' });

    const totalIngresos = stats.reduce((acc, curr) => acc + getData(curr).ingresos, 0);
    const totalEgresos = stats.reduce((acc, curr) => acc + getData(curr).egresos, 0);
    const totalUtilidad = totalIngresos - totalEgresos;

    const maxVal = Math.max(
        ...stats.map(s => getData(s).ingresos),
        ...stats.map(s => getData(s).egresos)
    ) || 1;

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingUp className="text-blue-600" size={32} />
                        Estadísticas de Utilidades
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Visión general financiera: Ingresos vs Egresos</p>
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
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-end gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                        <div className="relative">
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 pl-10 min-w-[100px] h-[42px] bg-white dark:bg-gray-700 text-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            >
                                <option value="" disabled>-- Seleccione --</option>
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg h-[42px]">
                        <button
                            onClick={() => setCurrency('Bolivianos')}
                            className={`px-6 h-full rounded-md text-sm font-bold transition-all duration-200 flex items-center shadow-sm transform hover:-translate-y-0.5 ${currency === 'Bolivianos'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-transparent text-gray-400 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-white'
                                }`}
                        >
                            Bolivianos (Bs)
                        </button>
                        <button
                            onClick={() => setCurrency('Dólares')}
                            className={`px-6 h-full rounded-md text-sm font-bold transition-all duration-200 flex items-center shadow-sm transform hover:-translate-y-0.5 ${currency === 'Dólares'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-transparent text-gray-400 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600 dark:hover:text-white'
                                }`}
                        >
                            Dólares ($us)
                        </button>
                    </div>

                    <div className="flex bg-white dark:bg-gray-800 rounded-lg h-[42px] gap-2">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none flex items-center gap-2 h-full font-bold"
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
                </div>

                <div className="flex gap-6">
                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos Totales</p>
                        <p className="text-xl font-bold text-green-600">{formatMoney(totalIngresos)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Egresos Totales</p>
                        <p className="text-xl font-bold text-red-600">{formatMoney(totalEgresos)}</p>
                    </div>
                    <div className="text-right border-l dark:border-gray-600 pl-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Utilidad Neta</p>
                        <p className={`text-2xl font-bold ${totalUtilidad >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatMoney(totalUtilidad)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart / Table Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Breakdown Table */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow lg:col-span-1 overflow-x-auto">
                    <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-white">Detalle Mensual</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b dark:border-gray-700">
                                <th className="text-left py-2 dark:text-gray-300">Mes</th>
                                <th className="text-right py-2 dark:text-gray-300">Ingreso</th>
                                <th className="text-right py-2 dark:text-gray-300">Egreso</th>
                                <th className="text-right py-2 dark:text-gray-300">Utilidad</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((stat, index) => {
                                const data = getData(stat);
                                return (
                                    <tr key={index} className="border-b last:border-0 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="py-3 font-medium text-gray-600 dark:text-gray-400">{months[index]}</td>
                                        <td className="py-3 text-right text-green-600">{data.ingresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-3 text-right text-red-500">{data.egresos.toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                                        <td className={`py-3 text-right font-bold ${data.utilidad >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {data.utilidad.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Visual Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow lg:col-span-2 flex flex-col justify-end h-[600px]">
                    <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-white">Evolución de Utilidades</h3>
                    <div className="flex items-end justify-between h-full gap-2 pt-10">
                        {stats.map((stat, index) => {
                            const data = getData(stat);
                            const heightIngreso = (data.ingresos / maxVal) * 100;
                            const heightEgreso = (data.egresos / maxVal) * 100;

                            return (
                                <div key={index} className="flex-1 flex flex-col items-center h-full justify-end group">
                                    <div className="w-full flex justify-center gap-1 items-end h-[90%] relative">
                                        {/* Ingreso Bar */}
                                        <div
                                            className="w-3 md:w-6 bg-green-500 rounded-t transition-all duration-500 relative hover:opacity-80"
                                            style={{ height: `${Math.max(heightIngreso, 1)}%` }}
                                            title={`Ingreso: ${data.ingresos}`}
                                        ></div>
                                        {/* Egreso Bar */}
                                        <div
                                            className="w-3 md:w-6 bg-red-400 rounded-t transition-all duration-500 relative hover:opacity-80"
                                            style={{ height: `${Math.max(heightEgreso, 1)}%` }}
                                            title={`Egreso: ${data.egresos}`}
                                        ></div>

                                        {/* Profit Line Point (Simplified as a dot above) */}
                                        <div
                                            className={`absolute w-2 h-2 rounded-full ${data.utilidad >= 0 ? 'bg-blue-600' : 'bg-red-600'}`}
                                            style={{ bottom: `${Math.min(Math.max((data.utilidad / maxVal) * 100, 0), 100)}%`, zIndex: 10 }}
                                            title={`Utilidad: ${data.utilidad}`}
                                        ></div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 rotate-[-45deg] origin-top-left translate-y-4">
                                        {months[index].substring(0, 3)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-8 flex justify-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span className="dark:text-gray-300">Ingresos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-400 rounded"></div>
                            <span className="dark:text-gray-300">Egresos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="dark:text-gray-300">Utilidad</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Estadísticas Utilidades"
                sections={manualSections}
            />
        </div >
    );
};

export default EstadisticasUtilidades;
