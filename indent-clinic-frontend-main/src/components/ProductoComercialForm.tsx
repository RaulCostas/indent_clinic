import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { ProductoComercial } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import { Tag, DollarSign, Layers, BarChart, Activity, Home, Save, X, Package } from 'lucide-react';

interface ProductoComercialFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

const ProductoComercialForm: React.FC<ProductoComercialFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const isEditing = Boolean(id);
    const { clinicaSeleccionada, clinicas } = useClinica();

    const [formData, setFormData] = useState<Partial<ProductoComercial>>({
        nombre: '',
        precio_venta: 0,
        costo: 0,
        stock_actual: 0,
        stock_minimo: 0,
        estado: 'activo',
        clinicaId: clinicaSeleccionada || 0
    });

    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Productos Comerciales',
            content: 'Registre productos para la venta directa a pacientes, como cepillos, pastas dentales o hilo dental.'
        },
        {
            title: 'Precios y Costos',
            content: 'Indique el costo de adquisición (para egresos) y el precio de venta al público (para ingresos y cálculo de comisiones).'
        },
        {
            title: 'Stock Mínimo',
            content: 'El sistema le alertará cuando el stock actual sea igual o menor al mínimo definido.'
        }];

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                fetchProducto();
            } else {
                setFormData({
                    nombre: '',
                    precio_venta: 0,
                    costo: 0,
                    stock_actual: 0,
                    stock_minimo: 0,
                    estado: 'activo',
                    clinicaId: clinicaSeleccionada || 0
                });
            }
        }
    }, [id, isOpen, clinicaSeleccionada]);

    const fetchProducto = async () => {
        try {
            const response = await api.get<ProductoComercial>(`/productos-comerciales/${id}`);
            const item = response.data;
            setFormData({
                id: item.id,
                nombre: item.nombre,
                precio_venta: item.precio_venta,
                costo: item.costo,
                stock_actual: item.stock_actual,
                stock_minimo: item.stock_minimo,
                estado: item.estado,
                clinicaId: item.clinicaId
            });
        } catch (error) {
            console.error('Error fetching producto:', error);
            Swal.fire('Error', 'No se pudo cargar el producto', 'error');
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isEditing && (!formData.clinicaId || formData.clinicaId === 0)) {
            Swal.fire('Atención', 'Por favor seleccione una clínica', 'warning');
            return;
        }

        try {
            if (isEditing) {
                await api.patch(`/productos-comerciales/${id}`, formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'El producto ha sido actualizado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/productos-comerciales', formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'El producto ha sido creado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving producto:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el producto';
            Swal.fire({
                icon: 'error',
                title: 'Aviso',
                text: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
                <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                                    <Package size={24} />
                                </span>
                                {isEditing ? 'Editar Producto Comercial' : 'Nuevo Producto Comercial'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Clinic Selector */}
                            {!isEditing && clinicaSeleccionada === null && (
                                <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Home size={16} />
                                        Asignar a Clínica
                                    </h3>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Home size={20} className="text-gray-400" />
                                        </div>
                                        <select
                                            value={formData.clinicaId || 0}
                                            onChange={(e) => setFormData({ ...formData, clinicaId: Number(e.target.value) })}
                                            className="w-full pl-10 pr-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            required
                                        >
                                            <option value={0} disabled>Seleccione una Clínica</option>
                                            {clinicas.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Nombre del Producto</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Tag size={20} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.nombre}
                                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                            placeholder="Ej: Pasta Dental Colgate 100g"
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Costo (Compra)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign size={20} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.costo}
                                            onChange={(e) => setFormData({ ...formData, costo: Number(e.target.value) })}
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Precio de Venta</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Tag size={20} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.precio_venta}
                                            onChange={(e) => setFormData({ ...formData, precio_venta: Number(e.target.value) })}
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Stock Actual</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Layers size={20} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            value={formData.stock_actual}
                                            onChange={(e) => setFormData({ ...formData, stock_actual: Number(e.target.value) })}
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                            disabled={isEditing}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Stock Mínimo</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <BarChart size={20} className="text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            value={formData.stock_minimo}
                                            onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Estado</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Activity size={20} className="text-gray-400" />
                                        </div>
                                        <select
                                            value={formData.estado}
                                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                        >
                                            <option value="activo">Activo</option>
                                            <option value="inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-start gap-3 rounded-b-xl mt-6 -mx-6 -mb-6">
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md active:scale-95"
                                >
                                    <Save size={20} />
                                    {isEditing ? 'Actualizar' : 'Guardar Producto'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 active:scale-95"
                                >
                                    <X size={20} />
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Productos Comerciales"
                sections={manualSections}
            />
        </>
    );
};

export default ProductoComercialForm;
