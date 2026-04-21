import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import ManualModal, { type ManualSection } from './ManualModal';
import { ShoppingCart } from 'lucide-react';

interface GrupoInventario {
    id: number;
    grupo: string;
}

interface Inventario {
    id: number;
    descripcion: string;
    idgrupo_inventario: number;
}

interface ProductHistory {
    fecha: string;
    proveedor: string;
    cantidad: number;
    precio_unitario: number;
    total: number;
    recibo?: string;
    factura?: string;
}

const EstadisticasProductos: React.FC = () => {
    // Filters
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
    const [selectedProductId, setSelectedProductId] = useState<number | ''>('');

    // Data Lists
    const [grupos, setGrupos] = useState<GrupoInventario[]>([]);
    const [allProducts, setAllProducts] = useState<Inventario[]>([]);
    const [history, setHistory] = useState<ProductHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Historial de Productos',
            content: 'Analice la variación de precios de compra de sus insumos a lo largo del tiempo.'
        },
        {
            title: 'Filtros',
            content: 'Seleccione primero el Año y el Grupo de Inventario, luego elija un Producto específico para ver su gráfico y tabla de historial.'
        },
        {
            title: 'Gráfico y Tabla',
            content: 'El gráfico muestra la tendencia del Precio Unitario. La tabla inferior detalla cada compra con fechas, proveedores y números de recibo/factura.'
        }];

    // Initial Load: Groups and **All** Products
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Load History when Product or Year changes
    useEffect(() => {
        if (selectedProductId && year) {
            fetchHistory();
        } else {
            setHistory([]);
        }
    }, [selectedProductId, year]);

    const fetchInitialData = async () => {
        try {
            const [gruposRes, productosRes] = await Promise.all([
                api.get('/grupo-inventario?limit=100'),
                api.get('/inventario?limit=5000')
            ]);

            const gruposData = Array.isArray(gruposRes.data) ? gruposRes.data : (gruposRes.data.data || []);
            setGrupos(gruposData);

            const productosData = Array.isArray(productosRes.data) ? productosRes.data : (productosRes.data.data || []);
            setAllProducts(productosData);

        } catch (error) {
            console.error('Error loading initial filters:', error);
        }
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/pedidos/history/${selectedProductId}?year=${year}`);
            setHistory(response.data);
        } catch (error) {
            console.error('Error loading history:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    // Derived Products List based on selected Group
    const filteredProducts = allProducts.filter(p =>
        selectedGroupId ? p.idgrupo_inventario === Number(selectedGroupId) : false
    );

    const selectedProductDesc = allProducts.find(p => p.id === Number(selectedProductId))?.descripcion || '';

    // Transform data for chart
    const chartData = history.map(item => ({
        ...item,
        precio_unitario: Number(item.precio_unitario),
        formattedDate: formatDate(item.fecha)
    }));

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="text-blue-600" size={32} />
                        Estadísticas de Productos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis de costos y evolución de precios de insumos</p>
                </div>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm no-print"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 1. Year Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                        <div className="relative">
                            <select
                                value={year}
                                onChange={(e) =>setYear(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
                            >
                                    <option value="" disabled>-- Seleccione --</option>
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                        </div>
                    </div>

                    {/* 2. Group Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grupo Inventario</label>
                        <div className="relative">
                            <select
                                value={selectedGroupId}
                                onChange={(e) =>{
                                    setSelectedGroupId(Number(e.target.value));
                                    setSelectedProductId('');
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
                            >
                                <option value="">-- Seleccione Grupo --</option>
                                {grupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.grupo}</option>
                                ))}
                            </select>
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                            </svg>
                        </div>
                    </div>

                    {/* 3. Product Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Producto / Ítem</label>
                        <div className="relative">
                            <select
                                value={selectedProductId}
                                onChange={(e) =>setSelectedProductId(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white dark:bg-gray-700 text-gray-700 dark:text-white"
                                disabled={!selectedGroupId}
                            >
                                <option value="">-- Seleccione Producto --</option>
                                {filteredProducts.map(p => (
                                    <option key={p.id} value={p.id}>{p.descripcion}</option>
                                ))}
                            </select>
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            {selectedProductId && chartData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300 uppercase">
                            {selectedProductDesc}
                        </h2>
                        {history.length > 0 && (
                            <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-800 shadow-sm">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Precio Promedio:</span>
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                    {(history.reduce((acc, curr) => acc + Number(curr.precio_unitario), 0) / history.length).toFixed(2)} Bs
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={chartData}
                                margin={{
                                    top: 20,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis
                                    dataKey="formattedDate"
                                    tick={{ fontSize: 12 }}
                                    padding={{ left: 30, right: 30 }}
                                />
                                <YAxis
                                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                                    label={{ value: 'Precio Unitario (Bs)', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip
                                    formatter={(value: any) => [`Bs ${Number(value).toFixed(2)}`, 'Precio']}
                                    labelStyle={{ color: '#333' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="precio_unitario"
                                    name="Precio Unitario"
                                    stroke="#00c853"
                                    strokeWidth={3}
                                    activeDot={{ r: 8 }}
                                    dot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center text-gray-700 dark:text-white">
                    <h2 className="font-semibold">Historial de Compras</h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {history.length} compras registradas
                    </span>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700 text-left">
                                <th className="p-3 border-b-2 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-bold">Fecha</th>
                                <th className="p-3 border-b-2 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-bold">Proveedor</th>
                                <th className="p-3 border-b-2 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-bold text-center">Recibo/Factura</th>
                                <th className="p-3 border-b-2 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-bold text-center">Cantidad</th>
                                <th className="p-3 border-b-2 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-bold text-right">Precio Unit. (Bs)</th>
                                <th className="p-3 border-b-2 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white font-bold text-right">Total (Bs)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-5 text-center text-gray-500 dark:text-gray-400">Cargando datos...</td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-5 text-center italic text-gray-500 dark:text-gray-400">
                                        {selectedProductId ? 'No hay compras registradas para este producto en el año seleccionado.' : 'Seleccione un producto para ver el historial y estadística.'}
                                    </td>
                                </tr>
                            ) : (
                                history.map((item, index) => (
                                    <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(item.fecha)}</td>
                                        <td className="p-3 text-gray-900 dark:text-white font-medium">{item.proveedor}</td>
                                        <td className="p-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                                            {item.recibo && `R: ${item.recibo}`}
                                            {item.recibo && item.factura && ' / '}
                                            {item.factura && `F: ${item.factura}`}
                                            {!item.recibo && !item.factura && '-'}
                                        </td>
                                        <td className="p-3 text-center text-gray-800 dark:text-gray-300">{item.cantidad}</td>
                                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{Number(item.precio_unitario).toFixed(2)}</td>
                                        <td className="p-3 text-right text-gray-900 dark:text-gray-300">{Number(item.total).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Estadísticas Productos"
                sections={manualSections}
            />
        </div>
    );
};

export default EstadisticasProductos;
