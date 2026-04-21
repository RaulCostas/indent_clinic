
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Proveedor, Inventario } from '../types';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import ProveedorForm from './ProveedorForm';


interface PedidoDetail {
    idinventario: number;
    cantidad: number;
    precio_unitario: number;
    fecha_vencimiento: string;
    // Helper to display name in table
    inventarioNombre?: string;
}

interface PedidosFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

const PedidosForm: React.FC<PedidosFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const isEditMode = Boolean(id);
    const { clinicaSeleccionada } = useClinica();
    const [providers, setProviders] = useState<Proveedor[]>([]);
    const [inventarioItems, setInventarioItems] = useState<Inventario[]>([]);

    const localDate = getLocalDateString();

    // Master State
    const [fecha, setFecha] = useState(localDate);
    const [idproveedor, setIdProveedor] = useState<number>(0);
    const [observaciones, setObservaciones] = useState('');
    const [subTotal, setSubTotal] = useState(0);
    const [descuento, setDescuento] = useState(0);
    const [total, setTotal] = useState(0);
    const [clinicaId, setClinicaId] = useState<number>(clinicaSeleccionada || 0);

    // Detail State
    const [detalles, setDetalles] = useState<PedidoDetail[]>([]);

    // Temporary Detail Input Fields
    const [tempIdInventario, setTempIdInventario] = useState<number>(0);
    const [tempCantidad, setTempCantidad] = useState<number>(1);
    const [tempPrecio, setTempPrecio] = useState<number>(0);
    const [tempVencimiento, setTempVencimiento] = useState(localDate);
    const [showManual, setShowManual] = useState(false);

    // Modal Proveedor
    const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
    const [userPermisos, setUserPermisos] = useState<string[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (error) {
                console.error('Error parseando usuario:', error);
            }
        }
    }, []);

    const puedeCrearProveedor = !userPermisos.includes('configuracion');

    const manualSections: ManualSection[] = [
        {
            title: 'Pedidos a Proveedores',
            content: 'Registre pedidos de inventario a proveedores. Agregue múltiples ítems con sus cantidades, precios y fechas de vencimiento.'
        },
        {
            title: 'Agregar Ítems',
            content: 'Seleccione productos del inventario y especifique cantidad, precio unitario y fecha de vencimiento. Use el botón "+" para agregar cada ítem al pedido.'
        },
        {
            title: 'Cálculos Automáticos',
            content: 'El sistema calcula automáticamente el subtotal y total del pedido. Puede aplicar descuentos al total general.'
        }];

    useEffect(() => {
        if (isOpen) {
            fetchProviders();
            fetchInventario();
            if (isEditMode) {
                fetchPedidoData();
            } else {
                setFecha(localDate);
                setIdProveedor(0);
                setObservaciones('');
                setSubTotal(0);
                setDescuento(0);
                setTotal(0);
                setDetalles([]);
                setTempPrecio(0);
                setTempVencimiento(localDate);
                setClinicaId(clinicaSeleccionada || 0);
            }
        }
    }, [isOpen, id, clinicaSeleccionada]);

    useEffect(() => {
        calculateTotals();
    }, [detalles, descuento]);

    const fetchPedidoData = async () => {
        try {
            const response = await api.get(`/pedidos/${id}`);
            const pedido = response.data;

            setFecha(pedido.fecha.split('T')[0]);
            setIdProveedor(pedido.idproveedor);
            setObservaciones(pedido.Observaciones);
            setDescuento(Number(pedido.Descuento));

            // Map details
            const mappedDetalles = pedido.detalles.map((d: any) => ({
                idinventario: d.idinventario,
                cantidad: d.cantidad,
                precio_unitario: Number(d.precio_unitario),
                fecha_vencimiento: d.fecha_vencimiento,
                inventarioNombre: d.inventario?.descripcion
            }));
            setDetalles(mappedDetalles);
        } catch (error) {
            console.error('Error fetching pedido:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar datos del pedido'
            });
            onClose();
        }
    };

    const fetchProviders = async () => {
        try {
            const response = await api.get('/proveedores?limit=100');
            setProviders(Array.isArray(response.data) ? response.data : response.data.data);
        } catch (error) {
            console.error('Error fetching providers:', error);
        }
    };

    const fetchInventario = async () => {
        try {
            const url = clinicaId ? `/inventario?limit=9999&clinicaId=${clinicaId}` : '/inventario?limit=9999';
            const response = await api.get<any>(url);
            const items = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setInventarioItems(items.filter((item: any) => item.estado === 'Activo'));
        } catch (error) {
            console.error('Error fetching inventario:', error);
        }
    };

    // Re-fetch inventario when clinicaId changes
    useEffect(() => {
        if (isOpen) {
            fetchInventario();
        }
    }, [clinicaId, isOpen]);

    const calculateTotals = () => {
        const sub = detalles.reduce((acc, curr) => acc + (curr.cantidad * curr.precio_unitario), 0);
        setSubTotal(sub);
        setTotal(sub - descuento);
    };

    const handleAddDetail = () => {
        if (!tempIdInventario || tempCantidad <= 0 || tempPrecio < 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Datos Incompletos',
                text: 'Por favor complete los datos del ítem correctamente'
            });
            return;
        }

        const selectedInventario = inventarioItems.find(i => i.id === tempIdInventario);
        if (!selectedInventario) return;

        const newDetail: PedidoDetail = {
            idinventario: tempIdInventario,
            cantidad: tempCantidad,
            precio_unitario: tempPrecio,
            fecha_vencimiento: tempVencimiento,
            inventarioNombre: selectedInventario.descripcion
        };

        setDetalles([...detalles, newDetail]);

        // Reset detail inputs
        setTempIdInventario(0);
        setTempCantidad(1);
        setTempPrecio(0);
        setTempVencimiento(localDate);
    };

    const handleEditDetail = (index: number) => {
        const detail = detalles[index];
        setTempIdInventario(detail.idinventario);
        setTempCantidad(detail.cantidad);
        setTempPrecio(detail.precio_unitario);
        setTempVencimiento(detail.fecha_vencimiento);

        // Remove from list so it can be re-added
        handleRemoveDetail(index);
    };

    const handleRemoveDetail = (index: number) => {
        const newDetalles = [...detalles];
        newDetalles.splice(index, 1);
        setDetalles(newDetalles);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!idproveedor) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Seleccione un proveedor'
            });
            return;
        }

        if (detalles.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Agregue al menos un ítem al pedido'
            });
            return;
        }

        const payload = {
            fecha,
            idproveedor,
            Sub_Total: subTotal,
            Descuento: descuento,
            Total: total,
            Observaciones: observaciones,
            clinicaId,
            detalles: detalles.map(({ inventarioNombre, ...rest }) => rest)
        };

        try {
            if (isEditMode) {
                await api.patch(`/pedidos/${id}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Pedido Actualizado',
                    text: 'El pedido ha sido actualizado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/pedidos', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Pedido Creado',
                    text: 'El pedido ha sido creado correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving pedido:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el pedido';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-[800px] h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg text-orange-600 dark:text-orange-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </span>
                            {isEditMode ? 'Editar Pedido' : 'Nuevo Pedido'}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowManual(true)}
                            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Ayuda / Manual"
                        >
                            ?
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>

                        <hr className="my-6 border-gray-300 dark:border-gray-600" />

                        {/* Master Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Fecha</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </span>
                                    <input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Proveedor</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                        </span>
                                        <select
                                            value={idproveedor}
                                            onChange={(e) => setIdProveedor(Number(e.target.value))}
                                            className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        >
                                            <option value={0}>Seleccione un proveedor</option>
                                            {providers.map(p => (
                                                <option key={p.id} value={p.id}>{p.proveedor}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {puedeCrearProveedor && (
                                        <button
                                            type="button"
                                            onClick={() => setIsProveedorModalOpen(true)}
                                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                            title="Añadir Proveedor"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>




                        {/* Detail Input Area */}
                        <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300">Agregar Ítems</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 items-end bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-600">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Material / Insumo</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                        </svg>
                                    </span>
                                    <select
                                        value={tempIdInventario}
                                        onChange={(e) => setTempIdInventario(Number(e.target.value))}
                                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-600 dark:text-gray-100"
                                    >
                                        <option value={0}>Seleccione ítem</option>
                                        {inventarioItems.map(i => (
                                            <option key={i.id} value={i.id}>{i.descripcion} (Stock: {i.cantidad_existente})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Cant.</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 3v18h18"></path>
                                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                                        </svg>
                                    </span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={tempCantidad}
                                        onChange={(e) => setTempCantidad(Number(e.target.value))}
                                        placeholder="1"
                                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-600 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Precio Unit.</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="1" x2="12" y2="23"></line>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                        </svg>
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={tempPrecio}
                                        onChange={(e) => setTempPrecio(Number(e.target.value))}
                                        placeholder="Ej: 150.00"
                                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-600 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Vencimiento</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                    </span>
                                    <input
                                        type="date"
                                        value={tempVencimiento}
                                        onChange={(e) => setTempVencimiento(e.target.value)}
                                        className="w-full pl-8 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-600 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-5 flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={handleAddDetail}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                                >
                                    <span>+</span> Agregar
                                </button>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="overflow-x-auto mb-6">
                            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs leading-normal">
                                        <th className="py-3 px-6 text-left">Ítem</th>
                                        <th className="py-3 px-6 text-center">Cant.</th>
                                        <th className="py-3 px-6 text-right">Precio Unit.</th>
                                        <th className="py-3 px-6 text-right">Subtotal</th>
                                        <th className="py-3 px-6 text-center">Venc.</th>
                                        <th className="py-3 px-6 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-600 dark:text-gray-300 text-sm font-light">
                                    {detalles.map((detalle, index) => (
                                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                            <td className="py-3 px-6 text-left whitespace-nowrap font-medium">{detalle.inventarioNombre}</td>
                                            <td className="py-3 px-6 text-center">{detalle.cantidad}</td>
                                            <td className="py-3 px-6 text-right">{detalle.precio_unitario.toFixed(2)}</td>
                                            <td className="py-3 px-6 text-right">{(detalle.cantidad * detalle.precio_unitario).toFixed(2)}</td>
                                            <td className="py-3 px-6 text-center">{formatDate(detalle.fecha_vencimiento)}</td>
                                            <td className="py-3 px-6 text-center">
                                                <div className="flex item-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditDetail(index)}
                                                        className="bg-transparent border-none p-1 text-blue-500 hover:text-blue-700 focus:outline-none focus:ring-0 transition-colors duration-200"
                                                        title="Editar ítem"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveDetail(index)}
                                                        className="bg-transparent border-none p-1 text-red-500 hover:text-red-700 focus:outline-none focus:ring-0 transition-colors duration-200"
                                                        title="Eliminar ítem"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {detalles.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">No hay ítems agregados</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Totals */}
                        <div className="flex justify-end mb-8">
                            <div className="w-full md:w-2/3 pr-8">
                                <div className="mb-6">
                                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">Observaciones</label>
                                    <div className="relative">
                                        <span className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none text-gray-500 dark:text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </span>
                                        <textarea
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                            placeholder="Ingrese una descripción..."
                                            className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="w-full md:w-1/3 space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Sub Total:</span>
                                    <span className="dark:text-white">{subTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Descuento:</span>
                                    <div className="relative w-24">
                                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                            </svg>
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={descuento}
                                            onChange={(e) => setDescuento(Number(e.target.value))}
                                            placeholder="0"
                                            className="w-full pl-6 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-right focus:outline-none focus:ring-1 focus:ring-[#3498db] bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between text-xl font-medium text-sm text-[#2c3e50] dark:text-white border-t border-gray-200 dark:border-gray-600 pt-2">
                                    <span>Total:</span>
                                    <span>{total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-start gap-4 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                            <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {id ? 'Actualizar Pedido' : 'Guardar Pedido'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Cancelar
                            </button>
                        </div>
                    </form>
                    <ManualModal
                        isOpen={showManual}
                        onClose={() => setShowManual(false)}
                        title="Manual - Pedidos"
                        sections={manualSections}
                    />

                    {/* Modal Creación Rápida Proveedor */}
                    {puedeCrearProveedor && (
                        <div style={{ zIndex: 60 }} className="relative">
                            <ProveedorForm
                                isOpen={isProveedorModalOpen}
                                onClose={() => setIsProveedorModalOpen(false)}
                                onSaveSuccess={() => {
                                    fetchProviders();
                                    setIsProveedorModalOpen(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PedidosForm;
