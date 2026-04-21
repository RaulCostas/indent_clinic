import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Arancel, Especialidad } from '../types';
import { useClinica } from '../context/ClinicaContext';
import EspecialidadForm from './EspecialidadForm';
import { Stethoscope, FileText, DollarSign, Power, Globe, Plus, Save, X } from 'lucide-react';


interface ArancelFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | null;
    onSaveSuccess: () => void;
}

const ArancelForm: React.FC<ArancelFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        detalle: '',
        precio: '' as string | number,
        precio_sin_seguro: '' as string | number,
        precio_gold: '' as string | number,
        precio_silver: '' as string | number,
        precio_odontologico: '' as string | number,
        moneda: '',
        estado: 'activo',
        idEspecialidad: 0,
        clinicaId: 0
    });
    const { clinicaSeleccionada } = useClinica();
    // Clínica id=2 usa precios especializados (Gold, Silver, Odontológico)
    const isClinica2 = clinicaSeleccionada === 2 || formData.clinicaId === 2;
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

    // Estados para el Modal de Especialidad
    const [isEspecialidadModalOpen, setIsEspecialidadModalOpen] = useState(false);
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

    const puedeCrearEspecialidad = !userPermisos.includes('configuracion');

    useEffect(() => {
        if (isOpen) {
            fetchEspecialidades();
            if (isEditMode) {
                api.get<Arancel>(`/arancel/${id}`)
                    .then(response => {
                        setFormData({
                            detalle: response.data.detalle,
                            precio: response.data.precio?.toString() ?? '',
                            precio_sin_seguro: response.data.precio_sin_seguro ? response.data.precio_sin_seguro.toString() : '',
                            precio_gold: response.data.precio_gold ? response.data.precio_gold.toString() : '',
                            precio_silver: response.data.precio_silver ? response.data.precio_silver.toString() : '',
                            precio_odontologico: response.data.precio_odontologico ? response.data.precio_odontologico.toString() : '',
                            moneda: response.data.moneda || '',
                            estado: response.data.estado,
                            idEspecialidad: Number(response.data.idEspecialidad),
                            clinicaId: Number(response.data.clinicaId || 0)
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching arancel:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Error al cargar el arancel',
                            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                        });
                    });
            } else {
                setFormData({
                    detalle: '',
                    precio: '',
                    precio_sin_seguro: '',
                    precio_gold: '',
                    precio_silver: '',
                    precio_odontologico: '',
                    moneda: '',
                    estado: 'activo',
                    idEspecialidad: 0,
                    clinicaId: clinicaSeleccionada || 0
                });
            }
        }
    }, [id, isEditMode, isOpen, clinicaSeleccionada]);

    const fetchEspecialidades = async () => {
        try {
            const response = await api.get<{ data: Especialidad[] }>('/especialidad?limit=100');
            setEspecialidades(response.data.data);
        } catch (error) {
            console.error('Error fetching especialidades:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'idEspecialidad' || name === 'clinicaId' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave: any = {
            ...formData,
            precio_sin_seguro: formData.precio_sin_seguro !== '' ? Number(formData.precio_sin_seguro) : null,
            precio_gold: formData.precio_gold !== '' ? Number(formData.precio_gold) : null,
            precio_silver: formData.precio_silver !== '' ? Number(formData.precio_silver) : null,
            precio_odontologico: formData.precio_odontologico !== '' ? Number(formData.precio_odontologico) : null,
        };
        // Para clínica id=2, el campo "precio" no es obligatorio; para otras sí.
        if (isClinica2) {
            dataToSave.precio = formData.precio !== '' ? Number(formData.precio) : 0;
        } else {
            dataToSave.precio = Number(formData.precio);
        }
        try {
            if (isEditMode) {
                await api.patch(`/arancel/${id}`, dataToSave);
                await Swal.fire({
                    icon: 'success',
                    title: 'Arancel Actualizado',
                    text: 'Arancel actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            } else {
                await api.post('/arancel', dataToSave);
                await Swal.fire({
                    icon: 'success',
                    title: 'Arancel Creado',
                    text: 'Arancel creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving arancel:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el arancel';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                           <FileText className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {isEditMode ? 'Editar Arancel' : 'Nuevo Arancel'}
                        </h2>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} id="arancel-form">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            
                            {/* Especialidad */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Especialidad</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-grow group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 transition-colors group-focus-within:text-blue-500">
                                            <Stethoscope size={18} />
                                        </div>
                                        <select
                                            name="idEspecialidad"
                                            value={formData.idEspecialidad || ''}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none shadow-sm"
                                        >
                                            <option value="">-- seleccionar especialidad --</option>
                                            {especialidades.map(esp => (
                                                <option key={esp.id} value={esp.id}>
                                                    {esp.especialidad}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    {puedeCrearEspecialidad && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEspecialidadModalOpen(true)}
                                            className="bg-orange-500 hover:bg-orange-600 text-white p-2.5 rounded-xl flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md shadow-orange-500/20"
                                            title="Nueva Especialidad"
                                        >
                                            <Plus size={24} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Detalle/Descripción */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <FileText size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="detalle"
                                        value={formData.detalle}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all shadow-sm"
                                        placeholder="Ingrese una descripción..."
                                    />
                                </div>
                            </div>

                            {/* Precio (solo visible si NO es clínica id=2) */}
                            {!isClinica2 && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Precio</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <DollarSign size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        name="precio"
                                        value={formData.precio}
                                        onChange={handleChange}
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all shadow-sm"
                                        placeholder="Ej: 150.00"
                                        required
                                    />
                                </div>
                            </div>
                            )}

                            {/* Precios especiales para clínica id=2: Gold, Silver, Odontológico, Sin Seguro */}
                            {isClinica2 && (
                                <>
                                    {/* Precio Gold */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Precio Gold</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <DollarSign size={18} />
                                            </div>
                                            <input
                                                type="number"
                                                name="precio_gold"
                                                value={formData.precio_gold}
                                                onChange={handleChange}
                                                step="0.01"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all shadow-sm"
                                                placeholder="Ej: 180.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Precio Silver */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Precio Silver</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <DollarSign size={18} />
                                            </div>
                                            <input
                                                type="number"
                                                name="precio_silver"
                                                value={formData.precio_silver}
                                                onChange={handleChange}
                                                step="0.01"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all shadow-sm"
                                                placeholder="Ej: 160.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Precio Odontológico */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Precio Odontológico</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <DollarSign size={18} />
                                            </div>
                                            <input
                                                type="number"
                                                name="precio_odontologico"
                                                value={formData.precio_odontologico}
                                                onChange={handleChange}
                                                step="0.01"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all shadow-sm"
                                                placeholder="Ej: 140.00"
                                            />
                                        </div>
                                    </div>

                                    {/* Precio sin Seguro */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Precio sin Seguro (Opcional)</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                                <DollarSign size={18} />
                                            </div>
                                            <input
                                                type="number"
                                                name="precio_sin_seguro"
                                                value={formData.precio_sin_seguro}
                                                onChange={handleChange}
                                                step="0.01"
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all shadow-sm"
                                                placeholder="Ej: 200.00"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Precio sin Seguro para otras clínicas */}
                            {!isClinica2 && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Precio sin Seguro (Opcional)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <DollarSign size={18} />
                                    </div>
                                    <input
                                        type="number"
                                        name="precio_sin_seguro"
                                        value={formData.precio_sin_seguro}
                                        onChange={handleChange}
                                        step="0.01"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all shadow-sm"
                                        placeholder="Ej: 200.00"
                                    />
                                </div>
                            </div>
                            )}

                            {/* Moneda */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Moneda (Opcional)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <Globe size={18} />
                                    </div>
                                    <select
                                        name="moneda"
                                        value={formData.moneda}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none shadow-sm"
                                    >
                                        <option value="">Clínica (Por Defecto)</option>
                                        <option value="Bs.">Bolivianos</option>
                                        <option value="USD">Dólares</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Estado */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Estado</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <Power size={18} />
                                    </div>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-all appearance-none shadow-sm"
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <X size={20} />
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="arancel-form"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-8 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-lg shadow-green-600/20"
                    >
                        <Save size={20} />
                        {isEditMode ? 'Actualizar' : 'Guardar'}
                    </button>
                </div>
            </div>

            {/* Modal de Creación Rápida de Especialidad */}
            {puedeCrearEspecialidad && (
                <EspecialidadForm
                    isOpen={isEspecialidadModalOpen}
                    onClose={() => setIsEspecialidadModalOpen(false)}
                    onSaveSuccess={() => {
                        fetchEspecialidades();
                        setIsEspecialidadModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default ArancelForm;
