
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import Pagination from './Pagination';
import type { Pedidos } from '../types';

const DeudasPedidos: React.FC = () => {
    const navigate = useNavigate();
    const [deudas, setDeudas] = useState<Pedidos[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchDeudas();
    }, []);

    const fetchDeudas = async () => {
        try {
            // Fetch all pedidos
            const response = await api.get('/pedidos');
            const allPedidos = Array.isArray(response.data) ? response.data : (response.data.data || []);

            // Filter for unpaid pedidos
            // Assuming 'Pagado' is a boolean or equivalent truthy value
            const unpaidPedidos = allPedidos.filter((p: any) => !p.Pagado);

            // Sort by date descending
            unpaidPedidos.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            setDeudas(unpaidPedidos);
        } catch (error) {
            console.error('Error fetching deudas pedidos:', error);
            Swal.fire('Error', 'No se pudieron cargar las deudas de pedidos', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredDeudas = deudas.filter(pedido => {
        const term = searchTerm.toLowerCase();
        const proveedorName = pedido.proveedor?.proveedor.toLowerCase() || '';
        return proveedorName.includes(term);
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredDeudas.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredDeudas.length / itemsPerPage);

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="content-card">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                    Deudas a Proveedores
                </h2>
                <button
                    onClick={() => navigate('/pedidos')}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                >
                    Volver
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Buscar por Proveedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
            </div>

            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 no-print">
                Mostrando {filteredDeudas.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredDeudas.length)} de {filteredDeudas.length} registros
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sub Total</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descuento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total (Bs)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentItems.map((pedido, index) => (
                            <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-700 dark:text-gray-300">{indexOfFirstItem + index + 1}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(pedido.fecha)}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">
                                    {pedido.proveedor ? pedido.proveedor.proveedor : '-'}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">
                                    {Number(pedido.Sub_Total).toFixed(2)}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">
                                    {Number(pedido.Descuento).toFixed(2)}
                                </td>
                                <td className="p-3 text-green-600 dark:text-green-400 font-bold">
                                    {Number(pedido.Total).toFixed(2)}
                                </td>
                                <td className="p-3">
                                    <button
                                        onClick={() => navigate(`/pagos-pedidos/create?pedidoId=${pedido.id}`)}
                                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Pagar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                            <line x1="1" y1="10" x2="23" y2="10"></line>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {currentItems.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-5 text-center text-gray-500 dark:text-gray-400">
                                    No se encontraron deudas pendientes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Total Sum */}
            <div className="mt-4 flex justify-end">
                <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-400 rounded-lg px-6 py-3">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Total de Deudas:
                        </span>
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            Bs {filteredDeudas.reduce((sum, pedido) => sum + (Number(pedido.Total) || 0), 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default DeudasPedidos;
