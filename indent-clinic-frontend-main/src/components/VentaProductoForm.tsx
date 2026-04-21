import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente, ProductoComercial, FormaPago, VentaProductoDetalle, Personal } from '../types';
import SearchableSelect from './SearchableSelect';
import { useClinica } from '../context/ClinicaContext';
import { ShoppingCart, User, Package, Trash2, Plus, Minus, CreditCard, Save, X, Info, Calendar } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';

interface CartItem {
    productoId: number;
    nombre: string;
    precio_unitario: number;
    cantidad: number;
    stock_actual: number;
}

const VentaProductoForm: React.FC = () => {
    const { clinicaSeleccionada, clinicas } = useClinica();
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [productos, setProductos] = useState<ProductoComercial[]>([]);
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [personales, setPersonales] = useState<Personal[]>([]);
    
    const [selectedPacienteId, setSelectedPacienteId] = useState<number | string>('');
    const [selectedPersonalId, setSelectedPersonalId] = useState<number | string>('');
    const [selectedFormaPagoId, setSelectedFormaPagoId] = useState<number | string>('');
    const [fecha, setFecha] = useState(getLocalDateString());
    const [observaciones, setObservaciones] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showManual, setShowManual] = useState(false);

    // Filtered data for SearchableSelect
    const pacienteOptions = useMemo(() => 
        pacientes.map(p => ({
            id: p.id,
            label: `${p.paterno} ${p.materno} ${p.nombre}`.trim(),
        })), [pacientes]);

    const personalOptions = useMemo(() => 
        personales.map(p => ({
            id: p.id,
            label: `${p.paterno} ${p.materno} ${p.nombre}`.trim(),
        })), [personales]);

    const productOptions = useMemo(() => 
        productos
            .filter(p => (p.estado || '').toLowerCase() === 'activo' && Number(p.stock_actual) > 0)
            .map(p => ({
                id: p.id,
                label: p.nombre,
                subLabel: `Stock: ${p.stock_actual} | Precio: ${Number(p.precio_venta).toFixed(2)}`
            })), [productos]);

    useEffect(() => {
        fetchInitialData();
    }, [clinicaSeleccionada]);

    const fetchInitialData = async () => {
        try {
            const [paciRes, prodRes, formRes, persRes] = await Promise.all([
                api.get(`/pacientes?limit=99999${clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : ''}`),
                api.get('/productos-comerciales?limit=1000'),
                api.get('/forma-pago'),
                api.get(`/personal?limit=1000${clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : ''}`)
            ]);

            setPacientes(Array.isArray(paciRes.data.data) ? paciRes.data.data : []);
            setProductos(Array.isArray(prodRes.data.data) ? prodRes.data.data : []);
            setFormasPago(Array.isArray(formRes.data.data) ? formRes.data.data : []);
            setPersonales(Array.isArray(persRes.data.data) ? persRes.data.data : []);

            // Set current user as default receptionist if possible
            const loggedUserStr = localStorage.getItem('user');
            if (loggedUserStr) {
                const loggedUser = JSON.parse(loggedUserStr);
                // The backend user might not have a 1:1 'personalId' linked in localstorage simple user object
                // We'll let the user select or if there's a match by name/email logic... 
                // For now, let's just pre-select first receptionist if available
                const firstReceptionist = persRes.data.data?.find((p: any) => p.personalTipo?.area?.toLowerCase().includes('recep'));
                if (firstReceptionist) setSelectedPersonalId(firstReceptionist.id);
            }

            const formasPagoData = formRes.data.data || [];
            if (formasPagoData.length > 0) {
                const cash = formasPagoData.find((f: any) => f.forma_pago.toLowerCase().includes('efectivo'));
                if (cash) setSelectedFormaPagoId(cash.id);
            }
        } catch (error) {
            console.error('Error fetching data for POS:', error);
        }
    };
    const handleAddFormaPago = async () => {
        const { value: name } = await Swal.fire({
            title: 'Nueva Forma de Pago',
            input: 'text',
            inputLabel: 'Nombre de la forma de pago (Ej: Transferencia, QR)',
            inputPlaceholder: 'Ingrese nombre...',
            showCancelButton: true,
            confirmButtonColor: '#e67e22',
            inputValidator: (value) => {
                if (!value) return '¡Debe ingresar un nombre!';
                return null;
            }
        });

        if (name) {
            try {
                await api.post('/forma-pago', { forma_pago: name });
                Swal.fire('Guardado', 'La forma de pago se registró con éxito', 'success');
                fetchInitialData();
            } catch (error) {
                console.error('Error adding payment method:', error);
                Swal.fire('Error', 'No se pudo registrar la forma de pago', 'error');
            }
        }
    };

    const addToCart = (productId: number | string) => {
        const product = productos.find(p => p.id === Number(productId));
        if (!product) return;

        if (product.stock_actual <= 0) {
            Swal.fire('Sin Stock', 'No hay existencias de este producto.', 'warning');
            return;
        }

        const existing = cart.find(item => item.productoId === product.id);
        if (existing) {
            if (existing.cantidad >= product.stock_actual) {
                Swal.fire('Límite de Stock', 'No puede vender más de lo que hay en inventario.', 'warning');
                return;
            }
            setCart(cart.map(item => 
                item.productoId === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
            ));
        } else {
            setCart([...cart, {
                productoId: product.id,
                nombre: product.nombre,
                precio_unitario: Number(product.precio_venta),
                cantidad: 1,
                stock_actual: product.stock_actual
            }]);
        }
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(cart.map(item => {
            if (item.productoId === productId) {
                const newQty = item.cantidad + delta;
                if (newQty <= 0) return item;
                if (newQty > item.stock_actual) {
                    Swal.fire('Stock Insuficiente', `Máximo disponible: ${item.stock_actual}`, 'warning');
                    return item;
                }
                return { ...item, cantidad: newQty };
            }
            return item;
        }).filter(item => item.cantidad > 0));
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(item => item.productoId !== productId));
    };

    const total = cart.reduce((acc, item) => acc + (Number(item.precio_unitario) * item.cantidad), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPacienteId) return Swal.fire('Error', 'Debe seleccionar un paciente', 'warning');
        if (!selectedPersonalId) return Swal.fire('Error', 'Debe seleccionar quién realiza la venta', 'warning');
        if (!selectedFormaPagoId) return Swal.fire('Error', 'Debe seleccionar forma de pago', 'warning');
        if (cart.length === 0) return Swal.fire('Error', 'El carrito está vacío', 'warning');

        const result = await Swal.fire({
            title: '¿Confirmar Venta?',
            text: `Total: ${total.toFixed(2)} Bs.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, registrar venta'
        });

        if (result.isConfirmed) {
            setIsSubmitting(true);
            try {
                await api.post('/ventas-productos', {
                    pacienteId: Number(selectedPacienteId),
                    personalId: Number(selectedPersonalId),
                    formaPagoId: Number(selectedFormaPagoId),
                    fecha,
                    observaciones,
                    clinicaId: clinicaSeleccionada,
                    total: Number(total.toFixed(2)),
                    detalles: cart.map(item => ({
                        productoId: item.productoId,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario
                    }))
                });

                await Swal.fire({
                    icon: 'success',
                    title: 'Venta Realizada',
                    text: 'Se ha registrado la venta y actualizado el inventario.',
                    timer: 2000,
                    showConfirmButton: false
                });

                // Reset
                setCart([]);
                setObservaciones('');
                setSelectedPacienteId('');
                setSelectedPersonalId('');
                setSelectedFormaPagoId('');
                fetchInitialData(); // Refresh product lists for stock
            } catch (error: any) {
                console.error('Error in sale:', error);
                Swal.fire('Error', error.response?.data?.message || 'No se pudo registrar la venta', 'error');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Punto de Venta (POS)',
            content: 'Utilice este módulo para vender productos comerciales a pacientes existentes.'
        },
        {
            title: 'Proceso de Venta',
            content: '1. Busque y seleccione al paciente.\n2. Busque y agregue productos al carrito.\n3. Defina quién realiza la venta y la forma de pago.\n4. El sistema calcula automáticamente la comisión del 40%.'
        },
        {
            title: 'Control Automático',
            content: 'El sistema bloquea ventas si no hay stock suficiente. Al finalizar, registra automáticamente el ingreso en la Hoja Diaria.'
        }];

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="text-emerald-600" size={32} />
                        Punto de Venta Comercial
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Registro de Ventas y Comisiones</p>
                </div>
                
                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form & Product Search */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Transaction Metadata */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 border-b dark:border-gray-700 pb-3 flex items-center gap-2">
                            <User className="text-blue-500 w-5 h-5" /> Datos de la Venta
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Paciente</label>
                                <SearchableSelect
                                    options={pacienteOptions}
                                    value={selectedPacienteId}
                                    onChange={setSelectedPacienteId}
                                    placeholder="Buscar paciente..."
                                    icon={<User className="w-4 h-4" />}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Vendido por</label>
                                <SearchableSelect
                                    options={personalOptions}
                                    value={selectedPersonalId}
                                    onChange={setSelectedPersonalId}
                                    placeholder="Personal de recepción..."
                                    icon={<User className="w-4 h-4" />}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 ml-1">Fecha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={18} className="text-gray-400" />
                                    </div>
                                    <input 
                                        type="date" 
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="w-full pl-10 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none hover:border-blue-500 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 ml-1">Forma de Pago</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <CreditCard size={18} className="text-gray-400" />
                                        </div>
                                        <select
                                            value={selectedFormaPagoId}
                                            onChange={(e) => setSelectedFormaPagoId(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium transition-all hover:border-blue-500"
                                        >
                                            <option value="">Seleccione Pago</option>
                                            {formasPago.map(f => <option key={f.id} value={f.id}>{f.forma_pago}</option>)}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddFormaPago}
                                        className="p-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-md flex items-center justify-center"
                                        title="Nueva Forma de Pago"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Observaciones</label>
                                <div className="relative">
                                    <textarea
                                        rows={2}
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none hover:border-blue-500 transition-all"
                                        placeholder="Añada notas adicionales aquí..."
                                    />
                                    <Info className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Search & Add */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 border-b dark:border-gray-700 pb-3 flex items-center gap-2">
                            <Package className="text-emerald-500 w-5 h-5" /> Agregar Productos
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Buscar Producto</label>
                                <SearchableSelect
                                    options={productOptions}
                                    value=""
                                    onChange={(id) => {
                                        addToCart(id);
                                    }}
                                    placeholder="Escriba nombre del producto..."
                                    icon={<Package className="w-4 h-4" />}
                                />
                            </div>
                            <p className="text-xs text-gray-400 font-medium italic mb-2">Seleccione un producto para agregarlo automáticamente al carrito.</p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Cart & Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden sticky top-6">
                        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <ShoppingCart className="w-6 h-6" />
                                <span className="font-bold text-lg">Carrito de Venta</span>
                            </div>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-white text-xs font-bold">{cart.length} ítems</span>
                        </div>

                        <div className="p-6">
                            {/* Cart Items List */}
                            <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6 pr-2 scrollbar-thin">
                                {cart.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package className="text-gray-300 w-8 h-8" />
                                        </div>
                                        <p className="text-gray-400 font-medium">Carrito vacío</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.productoId} className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 group">
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-sm text-gray-800 dark:text-white uppercase truncate flex-1">{item.nombre}</span>
                                                <button 
                                                    onClick={() => removeFromCart(item.productoId)} 
                                                    className="p-2 bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-md"
                                                    title="Eliminar del carrito"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-1 border dark:border-gray-700 shadow-inner">
                                                    <button 
                                                        onClick={() => updateQuantity(item.productoId, -1)} 
                                                        className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="font-bold text-sm min-w-[20px] text-center text-gray-700 dark:text-gray-300">{item.cantidad}</span>
                                                    <button 
                                                        onClick={() => updateQuantity(item.productoId, 1)} 
                                                        className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-sm"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400">{item.cantidad} x {item.precio_unitario.toFixed(2)}</div>
                                                    <div className="font-bold text-emerald-600">Bs. {(item.cantidad * item.precio_unitario).toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Summary */}
                            <div className="space-y-4 border-t dark:border-gray-700 pt-6">
                                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 font-medium">
                                    <span>Subtotal</span>
                                    <span>Bs. {total.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xl font-extrabold text-gray-900 dark:text-white">
                                    <span>Total a Pagar</span>
                                    <span className="text-2xl text-emerald-600">Bs. {total.toFixed(2)}</span>
                                </div>

                                <button
                                    disabled={isSubmitting || cart.length === 0}
                                    onClick={handleSubmit}
                                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:transform-none"
                                >
                                    <Save className="w-6 h-6" />
                                    {isSubmitting ? 'Procesando...' : 'FINALIZAR VENTA'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Punto de Venta Comercial"
                sections={manualSections}
            />
        </div>
    );
};

export default VentaProductoForm;
