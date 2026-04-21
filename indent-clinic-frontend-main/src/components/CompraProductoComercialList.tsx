import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { useClinica } from '../context/ClinicaContext';
import type { CompraProducto, FormaPago } from '../types';
import { Truck, Plus, CheckCircle, Clock, Eye, DollarSign, Filter, Search, Calendar, ChevronRight, X, CreditCard } from 'lucide-react';
import CompraProductoForm from './CompraProductoForm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ManualModal, { type ManualSection } from './ManualModal';

const CompraProductoComercialList: React.FC = () => {
    const { clinicaSeleccionada } = useClinica();
    const [compras, setCompras] = useState<CompraProducto[]>([]);
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');

    // Details Modal
    const [viewingCompra, setViewingCompra] = useState<CompraProducto | null>(null);
    const [showManual, setShowManual] = useState(false);

    useEffect(() => {
        fetchCompras();
        fetchFormasPago();
    }, [clinicaSeleccionada]);

    const fetchCompras = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/compras-productos?${clinicaSeleccionada ? `clinicaId=${clinicaSeleccionada}` : ''}`);
            setCompras(response.data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFormasPago = async () => {
        try {
            const response = await api.get('/forma-pago');
            setFormasPago(response.data.data || []);
        } catch (error) {
            console.error('Error fetching payment methods:', error);
        }
    };

    const handlePagar = async (compra: CompraProducto) => {
        // Find cash as default
        const cash = formasPago.find(f => f.forma_pago.toLowerCase().includes('efectivo'));
        
        const { value: formaPagoId } = await Swal.fire({
            title: 'Confirmar Pago',
            html: `¿Está seguro de pagar la compra a <b>${compra.proveedor?.proveedor}</b> por un total de <b>${Number(compra.total).toFixed(2)} Bs.</b>?<br/><br/>Se generará un registro automático en Egresos.`,
            icon: 'question',
            input: 'select',
            inputOptions: Object.fromEntries(formasPago.map(f => [f.id, f.forma_pago])),
            inputValue: cash?.id || '',
            inputPlaceholder: 'Seleccione forma de pago',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar pago',
            confirmButtonColor: '#10b981',
            inputValidator: (value) => {
                if (!value) return '¡Debe seleccionar una forma de pago!';
                return null;
            }
        });

        if (formaPagoId) {
            try {
                await api.post(`/compras-productos/${compra.id}/pagar`, { formaPagoId: Number(formaPagoId) });
                Swal.fire({
                    icon: 'success',
                    title: 'Pago Registrado',
                    text: 'Se ha actualizado el estado de la compra y registrado el egreso.',
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchCompras();
            } catch (error: any) {
                Swal.fire('Error', error.response?.data?.message || 'No se pudo registrar el pago', 'error');
            }
        }
    };

    const filteredCompras = compras.filter(c => {
        const matchesSearch = c.proveedor?.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.id.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' ? true : 
                              statusFilter === 'paid' ? c.pagada : !c.pagada;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Truck className="text-blue-600" size={32} />
                        Compras Comerciales
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de abastecimiento y pagos a proveedores</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Plus size={20} /> Nueva Compra
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex gap-2 w-full md:w-[450px]">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por proveedor o #..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                        />
                    </div>
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <div className="flex gap-1 p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    {(['all', 'pending', 'paid'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${
                                statusFilter === s 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-transparent text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {s === 'all' && 'Todos'}
                            {s === 'pending' && 'Pendientes'}
                            {s === 'paid' && 'Pagados'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proveedor</th>
                            <th className="p-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                            <th className="p-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="p-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-bold animate-pulse">
                                            <Clock className="animate-spin" size={20} />
                                            Cargando compras...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCompras.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-gray-400 dark:text-gray-500">
                                            <Truck size={64} className="opacity-10" />
                                            <p className="text-xl font-bold">No se encontraron registros</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCompras.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-3 text-gray-800 dark:text-gray-300">
                                            {c.id}
                                        </td>
                                        <td className="p-3 text-gray-800 dark:text-gray-300">
                                            {format(new Date(c.fecha), 'dd/MM/yyyy', { locale: es })}
                                        </td>
                                        <td className="p-3 text-gray-800 dark:text-gray-300">{c.proveedor?.proveedor}</td>
                                        <td className="p-3 text-right text-gray-800 dark:text-gray-300">
                                            {Number(c.total).toFixed(2)} Bs.
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded text-sm ${c.pagada ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'}`}>
                                                {c.pagada ? 'Pagado' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="p-3 flex justify-end gap-2">
                                            {!c.pagada && (
                                                <button
                                                    onClick={() => handlePagar(c)}
                                                    className="p-2.5 bg-[#16a34a] text-white rounded-lg hover:bg-green-700 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                    title="Registrar Pago"
                                                >
                                                    <DollarSign size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setViewingCompra(c)}
                                                className="p-2.5 bg-[#3498db] text-white rounded-lg hover:bg-blue-600 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                                title="Ver Detalle"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            {/* Nueva Compra Modal */}
            <CompraProductoForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchCompras}
            />

            {viewingCompra && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-lg shadow-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                                    <Truck size={24} />
                                </span>
                                Detalle de Compra Comercial #{viewingCompra.id}
                            </h3>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fecha Registro</p>
                                    <p className="font-bold text-gray-800 dark:text-white">{format(new Date(viewingCompra.fecha), "eeee, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado Financiero</p>
                                    <div className="flex items-center gap-2">
                                        {viewingCompra.pagada ? (
                                            <span className="text-emerald-500 font-black text-sm uppercase flex items-center gap-1.5"><CheckCircle size={16}/> PAGADO</span>
                                        ) : (
                                            <span className="text-orange-500 font-black text-sm uppercase flex items-center gap-1.5"><Clock size={16}/> PENDIENTE DE PAGO</span>
                                        )}
                                    </div>
                                    {viewingCompra.fecha_pago && (
                                        <p className="text-[10px] text-gray-500 mt-1 font-medium">Pagado el: {format(new Date(viewingCompra.fecha_pago), 'dd/MM/yyyy HH:mm')}</p>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors mb-6">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Producto</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Costo Un.</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {(viewingCompra.detalles || []).map((det) => (
                                            <tr key={det.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-3 text-gray-800 dark:text-gray-300">{det.producto?.nombre}</td>
                                                <td className="p-3 text-center text-gray-800 dark:text-gray-300">{det.cantidad}</td>
                                                <td className="p-3 text-right text-gray-800 dark:text-gray-300">{Number(det.costo_unitario).toFixed(2)}</td>
                                                <td className="p-3 text-right text-gray-800 dark:text-gray-300">{Number(det.subtotal).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100/50 dark:bg-gray-900">
                                            <td colSpan={3} className="px-5 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Total Compra</td>
                                            <td className="px-5 py-4 text-right text-xl font-black text-emerald-600">Bs. {Number(viewingCompra.total).toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {viewingCompra.observaciones && (
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observaciones</p>
                                    <p className="text-sm bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-xl text-gray-600 dark:text-gray-400 border border-blue-100 dark:border-blue-900/30 italic">
                                        "{viewingCompra.observaciones}"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                            <button 
                                onClick={() => setViewingCompra(null)}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            >
                                <X size={20} /> Cerrar
                            </button>
                            {!viewingCompra.pagada && (
                                <button 
                                    onClick={() => handlePagar(viewingCompra)}
                                    className="bg-[#16a34a] hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                                >
                                    <DollarSign size={20} /> Registrar Pago
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Gestión de Compras"
                sections={[
                    {
                        title: 'Gestión de Compras',
                        content: 'Registre y supervise las compras de productos comerciales a sus proveedores.'
                    },
                    {
                        title: 'Filtros de Estado',
                        content: 'Utilice los botones superiores para filtrar entre compras pendientes y pagadas. Las compras pagadas generan automáticamente un egreso en caja.'
                    },
                    {
                        title: 'Detalle de Compra',
                        content: 'Haga clic en el ojo para ver los productos, cantidades y costos históricos de cada lote comprado.'
                    }
                ]}
            />
        </div>
    );
};

export default CompraProductoComercialList;
