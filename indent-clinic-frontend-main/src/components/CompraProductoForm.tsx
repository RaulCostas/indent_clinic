import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Proveedor, ProductoComercial, CompraProductoDetalle } from '../types';
import SearchableSelect from './SearchableSelect';
import { useClinica } from '../context/ClinicaContext';
import { ShoppingCart, Truck, Package, Trash2, Plus, Minus, Save, X, Info, Calendar, DollarSign } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';

interface CartItem {
    productoId: number;
    nombre: string;
    costo_unitario: number;
    cantidad: number;
    numero_lote: string;
    fecha_vencimiento: string;
}

const CompraProductoForm: React.FC<{ isOpen: boolean; onClose: () => void; onSuccess: () => void; editId?: number | null }> = ({ isOpen, onClose, onSuccess, editId }) => {
    const { clinicaSeleccionada } = useClinica();
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [productos, setProductos] = useState<ProductoComercial[]>([]);
    
    const [selectedProveedorId, setSelectedProveedorId] = useState<number | string>('');
    const [fecha, setFecha] = useState(getLocalDateString());
    const [observaciones, setObservaciones] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const proveedorOptions = useMemo(() => 
        proveedores.map(p => ({
            id: p.id,
            label: p.proveedor,
        })), [proveedores]);

    const productOptions = useMemo(() => 
        productos
            .filter(p => (p.estado || '').toLowerCase() === 'activo')
            .map(p => ({
                id: p.id,
                label: p.nombre,
                subLabel: `Stock Actual: ${p.stock_actual} | Último Costo: ${Number(p.costo).toFixed(2)}`
            })), [productos]);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen, clinicaSeleccionada, editId]);

    const fetchInitialData = async () => {
        try {
            const [provRes, prodRes] = await Promise.all([
                api.get('/proveedores?limit=1000'),
                api.get('/productos-comerciales?limit=1000')
            ]);

            setProveedores(Array.isArray(provRes.data.data) ? provRes.data.data : []);
            setProductos(Array.isArray(prodRes.data.data) ? prodRes.data.data : []);

            if (editId) {
                const editRes = await api.get(`/compras-productos/${editId}`);
                const comp = editRes.data;
                setSelectedProveedorId(comp.proveedorId);
                setFecha(comp.fecha ? comp.fecha.split('T')[0] : getLocalDateString());
                setObservaciones(comp.observaciones || '');
                setCart((comp.detalles || []).map((det: any) => ({
                    productoId: det.productoId,
                    nombre: det.producto?.nombre || 'Producto',
                    costo_unitario: Number(det.costo_unitario),
                    cantidad: det.cantidad,
                    numero_lote: det.numero_lote || '',
                    fecha_vencimiento: det.fecha_vencimiento || ''
                })));
            } else {
                // Reset form for new purchase
                setCart([]);
                setObservaciones('');
                setSelectedProveedorId('');
                setFecha(getLocalDateString());
            }
        } catch (error) {
            console.error('Error fetching data for Compras:', error);
        }
    };

    const addToCart = (productId: number | string) => {
        const product = productos.find(p => p.id === Number(productId));
        if (!product) return;

        const existing = cart.find(item => item.productoId === product.id);
        if (existing) {
            setCart(cart.map(item => 
                item.productoId === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
            ));
        } else {
            setCart([...cart, {
                productoId: product.id,
                nombre: product.nombre,
                costo_unitario: Number(product.costo),
                cantidad: 1,
                numero_lote: '',
                fecha_vencimiento: ''
            }]);
        }
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(cart.map(item => {
            if (item.productoId === productId) {
                const newQty = item.cantidad + delta;
                if (newQty <= 0) return item;
                return { ...item, cantidad: newQty };
            }
            return item;
        }).filter(item => item.cantidad > 0));
    };

    const updateCosto = (productId: number, newCosto: number) => {
        setCart(cart.map(item => 
            item.productoId === productId ? { ...item, costo_unitario: newCosto } : item
        ));
    };

    const updateBatchInfo = (productId: number, field: 'numero_lote' | 'fecha_vencimiento', value: string) => {
        setCart(cart.map(item => 
            item.productoId === productId ? { ...item, [field]: value } : item
        ));
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(item => item.productoId !== productId));
    };

    const total = cart.reduce((acc, item) => acc + (Number(item.costo_unitario) * item.cantidad), 0);

    const handleSubmit = async () => {
        if (!selectedProveedorId) return Swal.fire('Error', 'Debe seleccionar un proveedor', 'warning');
        if (cart.length === 0) return Swal.fire('Error', 'Debe añadir al menos un producto', 'warning');

        const result = await Swal.fire({
            title: '¿Registrar Compra?',
            text: `Se incrementará el stock de los productos. Total: ${total.toFixed(2)} Bs.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar'
        });

        if (result.isConfirmed) {
            setIsSubmitting(true);
            try {
                const payload = {
                    proveedorId: Number(selectedProveedorId),
                    fecha,
                    observaciones,
                    clinicaId: clinicaSeleccionada,
                    total: Number(total.toFixed(2)),
                    detalles: cart.map(item => ({
                        productoId: item.productoId,
                        cantidad: item.cantidad,
                        costo_unitario: item.costo_unitario,
                        numero_lote: item.numero_lote,
                        fecha_vencimiento: item.fecha_vencimiento
                    }))
                };

                if (editId) {
                    await api.patch(`/compras-productos/${editId}`, payload);
                } else {
                    await api.post('/compras-productos', payload);
                }

                await Swal.fire({
                    icon: 'success',
                    title: editId ? 'Compra Actualizada' : 'Compra Registrada',
                    text: editId ? 'Se ha actualizado la compra y el stock.' : 'El stock ha sido actualizado correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                });

                setCart([]);
                setObservaciones('');
                setSelectedProveedorId('');
                onSuccess();
                onClose();
            } catch (error: any) {
                console.error('Error in purchase:', error);
                Swal.fire('Error', error.response?.data?.message || 'No se pudo registrar la compra', 'error');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (!isOpen) return null;

    const manualSections: ManualSection[] = [
        {
            title: 'Registro de Compras',
            content: 'Utilice este formulario para registrar la entrada de mercadería de sus proveedores.'
        },
        {
            title: 'Impacto en Stock',
            content: 'Al finalizar la compra, el stock de cada producto seleccionado se incrementará automáticamente en el catálogo.'
        },
        {
            title: 'Estado de Pago',
            content: 'Todas las compras se registran inicialmente como PENDIENTES. Puede registrar el pago posteriormente desde el listado principal para generar el egreso en caja.'
        }];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 w-[95%] max-w-6xl max-h-[95vh] overflow-y-auto p-6 rounded-lg shadow-xl outline-none">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                            <Truck size={24} />
                        </span>
                        {editId ? `Editar Compra #${editId}` : 'Nueva Compra de Productos Comerciales'}
                    </h3>
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: General Data */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                                <Truck className="text-blue-500 w-5 h-5" /> Información del Proveedor
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Proveedor</label>
                                    <SearchableSelect
                                        options={proveedorOptions}
                                        value={selectedProveedorId}
                                        onChange={setSelectedProveedorId}
                                        placeholder="Seleccione un proveedor..."
                                        icon={<Truck className="w-4 h-4" />}
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Fecha de Compra</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <Calendar size={18} />
                                        </div>
                                        <input 
                                            type="date" 
                                            value={fecha}
                                            onChange={(e) => setFecha(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Observaciones</label>
                                    <textarea
                                        rows={2}
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        placeholder="Notas adicionales..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                                <Package className="text-emerald-500 w-5 h-5" /> Selección de Productos
                            </h4>
                            <div className="space-y-4">
                                <SearchableSelect
                                    options={productOptions}
                                    value=""
                                    onChange={(id) => addToCart(id)}
                                    placeholder="Buscar producto comercial..."
                                    icon={<Package className="w-4 h-4" />}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Cart Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-blue-100 dark:border-blue-900/30 overflow-hidden sticky top-0 shadow-lg">
                            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5" />
                                    <span className="font-bold">Items de Compra</span>
                                </div>
                                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-black">{cart.length}</span>
                            </div>

                            <div className="p-6">
                                <div className="space-y-4 mb-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            <Package className="mx-auto mb-3 opacity-20" size={48} />
                                            <p className="text-sm font-medium tracking-tight">Cero productos seleccionados</p>
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.productoId} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="font-bold text-xs text-gray-800 dark:text-white uppercase leading-tight">{item.nombre}</span>
                                                    <button 
                                                        onClick={() => removeFromCart(item.productoId)}
                                                        className="text-red-500 hover:text-red-700 transition-colors p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-inner">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateQuantity(item.productoId, -1);
                                                            }} 
                                                            className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm"
                                                            type="button"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="font-bold text-sm min-w-[20px] text-center text-gray-700 dark:text-gray-300">{item.cantidad}</span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateQuantity(item.productoId, 1);
                                                            }} 
                                                            className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm"
                                                            type="button"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">Bs.</span>
                                                            <input 
                                                                type="number"
                                                                value={item.costo_unitario}
                                                                onChange={(e) => updateCosto(item.productoId, Number(e.target.value))}
                                                                className="w-full pl-6 pr-2 py-1 text-xs font-bold bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                                                placeholder="Costo"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Batch Fields */}
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nº Lote</label>
                                                        <input 
                                                            type="text"
                                                            value={item.numero_lote}
                                                            onChange={(e) => updateBatchInfo(item.productoId, 'numero_lote', e.target.value)}
                                                            className="w-full px-2 py-1 text-[10px] bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                                            placeholder="Lote #"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Vencimiento</label>
                                                        <input 
                                                            type="date"
                                                            value={item.fecha_vencimiento}
                                                            onChange={(e) => updateBatchInfo(item.productoId, 'fecha_vencimiento', e.target.value)}
                                                            className="w-full px-2 py-1 text-[10px] bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-right font-black text-sm text-blue-600">
                                                    Bs. {(item.cantidad * item.costo_unitario).toFixed(2)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="pt-6 border-t dark:border-gray-700 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">Monto Total</span>
                                        <span className="text-3xl font-black text-gray-900 dark:text-white">Bs. <span className="text-blue-600">{total.toFixed(2)}</span></span>
                                    </div>
                                    
                                    <div className="flex justify-start gap-3 pt-4 border-t dark:border-gray-700">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || cart.length === 0}
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                            ) : (
                                                <>
                                                    <Save size={20} /> Guardar Compra
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                        >
                                            <X size={20} /> Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Nueva Compra"
                sections={manualSections}
            />
        </div>
    );
};

export default CompraProductoForm;
