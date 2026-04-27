import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { useClinica } from '../context/ClinicaContext';
import { 
    Search, Calendar, Trash2, Eye, Filter, RefreshCw, 
    ShoppingCart, User, Tag, Plus, Receipt, Info
} from 'lucide-react';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import type { VentaProducto } from '../types';
import Pagination from './Pagination';
import VentaProductoForm from './VentaProductoForm';
import ManualModal, { type ManualSection } from './ManualModal';

const VentaProductoList: React.FC = () => {
    const { clinicaSeleccionada } = useClinica();
    const [ventas, setVentas] = useState<VentaProducto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(getLocalDateString());
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit] = useState(10);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [viewVenta, setViewVenta] = useState<VentaProducto | null>(null);
    const [total, setTotal] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Historial de Ventas',
            content: 'En esta sección puede ver todas las ventas comerciales realizadas. Puede filtrar por fecha, clínica o búsqueda de texto.'
        },
        {
            title: 'Acciones de Venta',
            content: '• Ver: Muestra el detalle completo de la venta.\n• Editar: Permite modificar una venta existente.\n• Anular: Elimina la venta y restaura automáticamente el stock de los productos.'
        },
        {
            title: 'Estados de Comisión',
            content: 'Las ventas pueden tener comisión "Pendiente" o "Pagada". Si una comisión ya ha sido pagada, la venta no podrá ser editada ni anulada para mantener la integridad financiera.'
        }
    ];

    useEffect(() => {
        fetchVentas();
    }, [page, clinicaSeleccionada, startDate, endDate]);

    const fetchVentas = async (resetPage = false) => {
        try {
            setLoading(true);
            const currentPage = resetPage ? 1 : page;
            if (resetPage) setPage(1);

            const response = await api.get('/ventas-productos', {
                params: {
                    page: currentPage,
                    limit,
                    startDate,
                    endDate,
                    search: searchTerm,
                    clinicaId: clinicaSeleccionada
                }
            });
            setVentas(response.data.data || []);
            setTotalPages(response.data.totalPages || 1);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching sales:', error);
            Swal.fire('Error', 'No se pudo cargar el historial de ventas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (venta: VentaProducto) => {
        if (venta.comision_pagada) {
            Swal.fire('No permitido', 'No se puede eliminar una venta cuya comisión ya ha sido pagada al personal.', 'warning');
            return;
        }

        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "Esta acción anulará la venta, restaurará el stock de los lotes utilizados y eliminará el ingreso asociado.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, anular venta',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/ventas-productos/${venta.id}`);
                Swal.fire('Anulada', 'La venta ha sido anulada con éxito y el stock restaurado.', 'success');
                fetchVentas();
            } catch (error: any) {
                console.error('Error deleting sale:', error);
                Swal.fire('Error', error.response?.data?.message || 'No se pudo anular la venta', 'error');
            }
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchVentas(true);
    };

    const toggleForm = (id: number | null = null) => {
        setEditId(id);
        setIsFormOpen(!isFormOpen);
        if (isFormOpen) {
            // If we are closing the form, refresh the list
            fetchVentas(true);
        }
    };

    if (isFormOpen) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <VentaProductoForm 
                    id={editId || undefined} 
                    onSuccess={() => toggleForm()} 
                    onCancel={() => toggleForm()} 
                />
            </div>
        );
    }

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-all duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="text-blue-600" size={32} />
                        Historial de Ventas
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión y control de ventas comerciales</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>

                    <button
                        onClick={() => toggleForm()}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Plus size={20} />
                        Nueva Venta
                    </button>
                </div>
            </div>

            {/* Filters */}
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Paciente o Personal..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Desde</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Hasta</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-end">
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <Search size={18} />
                        Filtrar Historial
                    </button>
                </div>
            </form>

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} registros
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Venta #</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Fecha</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Paciente / Cliente</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Vendido Por</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total (Bs.)</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Comisión</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500">Cargando ventas...</td></tr>
                        ) : ventas.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-500 italic">No se encontraron ventas en este periodo.</td></tr>
                        ) : (
                            ventas.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-blue-600 dark:text-blue-400">
                                        #{v.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                        {formatDate(v.fecha)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white uppercase">
                                        {v.paciente ? `${v.paciente.nombre} ${v.paciente.paterno} ${v.paciente.materno || ''}` : 'Venta Directa'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {v.personal ? `${v.personal.nombre} ${v.personal.paterno} ${v.personal.materno || ''}` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-gray-900 dark:text-white">
                                        {Number(v.total).toLocaleString()} Bs.
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {v.comision_pagada ? (
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                                                Pagada
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                                                Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => setViewVenta(v)}
                                                className="p-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                title="Ver Detalle"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            </button>
                                            <button
                                                onClick={() => toggleForm(v.id)}
                                                disabled={v.comision_pagada}
                                                className={`p-1.5 rounded-lg text-white shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center ${
                                                    v.comision_pagada 
                                                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50' 
                                                    : 'bg-yellow-400 hover:bg-yellow-500'
                                                }`}
                                                title={v.comision_pagada ? "Comisión pagada: No se puede editar" : "Editar Venta"}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(v)}
                                                disabled={v.comision_pagada}
                                                className={`p-1.5 rounded-lg text-white shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center ${
                                                    v.comision_pagada 
                                                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50' 
                                                    : 'bg-red-500 hover:bg-red-600'
                                                }`}
                                                title={v.comision_pagada ? "Comisión pagada: No se puede anular" : "Anular Venta"}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex justify-end">
                <Pagination 
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            </div>

            {/* Detail Modal */}
            {viewVenta && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/80">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Receipt className="text-blue-500" size={24} />
                                    Detalle de Venta #{viewVenta.id}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Información completa de la transacción</p>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Paciente / Cliente</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white uppercase flex items-center gap-2">
                                        <User size={14} className="text-blue-500" />
                                        {viewVenta.paciente ? `${viewVenta.paciente.nombre} ${viewVenta.paciente.paterno} ${viewVenta.paciente.materno || ''}` : 'Venta Directa'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Fecha de Registro</p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <Calendar size={14} className="text-blue-500" />
                                        {formatDate(viewVenta.fecha)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Personal de Recepción</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {viewVenta.personal ? `${viewVenta.personal.nombre} ${viewVenta.personal.paterno} ${viewVenta.personal.materno || ''}` : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Forma de Pago</p>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <CreditCard size={14} className="text-blue-500" />
                                        {viewVenta.formaPago?.forma_pago || 'No especificada'}
                                    </p>
                                </div>
                            </div>

                            <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                                <Tag size={14} className="text-blue-500" />
                                Productos Incluidos
                            </h4>
                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm mb-6">
                                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400">Producto</th>
                                            <th className="px-4 py-3 text-center font-bold text-gray-500 dark:text-gray-400">Cant.</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400">P. Unit</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        {viewVenta.detalles?.map((d) => (
                                            <tr key={d.id}>
                                                <td className="px-4 py-3 text-gray-800 dark:text-gray-300 font-medium">{d.producto?.nombre}</td>
                                                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">{d.cantidad}</td>
                                                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{Number(d.precio_unitario).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{Number(d.subtotal).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-700/50 font-black">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right text-gray-800 dark:text-white uppercase text-xs">Total Venta:</td>
                                            <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 text-lg">{Number(viewVenta.total).toLocaleString()} Bs.</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {viewVenta.observaciones && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
                                    <Info className="text-amber-500 shrink-0" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Observaciones</p>
                                        <p className="text-xs text-gray-700 dark:text-gray-300">{viewVenta.observaciones}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
                            <button
                                onClick={() => setViewVenta(null)}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <X size={18} />
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Historial de Ventas"
                sections={manualSections}
            />
        </div>
    );
};

// Internal icon fix for the modal close
const X: React.FC<{ size: number }> = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

// Internal icon fix for CreditCard
const CreditCard: React.FC<{ size: number, className?: string }> = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);

export default VentaProductoList;
