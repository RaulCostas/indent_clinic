import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Especialidad, GrupoInventario, Inventario } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import GrupoInventarioForm from './GrupoInventarioForm';
import EspecialidadForm from './EspecialidadForm';


interface InventarioFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

const InventarioForm: React.FC<InventarioFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const isEditing = Boolean(id);
    const { clinicaSeleccionada, clinicas } = useClinica();

    const [formData, setFormData] = useState<Partial<Inventario>>({
        descripcion: '',
        cantidad_existente: 0,
        stock_minimo: 0,
        estado: 'Activo',
        idespecialidad: 0,
        idgrupo_inventario: 0,
        clinicaId: clinicaSeleccionada || 0
    });

    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [grupos, setGrupos] = useState<GrupoInventario[]>([]);
    const [showManual, setShowManual] = useState(false);

    // Estados para el Modal de Grupo Inventario
    const [isGrupoModalOpen, setIsGrupoModalOpen] = useState(false);
    
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

    const puedeCrearGrupo = !userPermisos.includes('configuracion');
    const puedeCrearEspecialidad = !userPermisos.includes('configuracion');

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Inventario',
            content: 'Registre y administre productos del inventario. Especifique descripción, cantidades, stock mínimo, especialidad y grupo.'
        },
        {
            title: 'Stock Mínimo',
            content: 'Defina el stock mínimo para recibir alertas cuando el inventario esté bajo. El sistema resaltará productos con stock crítico.'
        },
        {
            title: 'Organización',
            content: 'Clasifique productos por especialidad y grupo para facilitar la búsqueda y gestión del inventario.'
        }];

    useEffect(() => {
        if (isOpen) {
            fetchDropdowns();
            if (isEditing) {
                fetchInventario();
            } else {
                setFormData({
                    descripcion: '',
                    cantidad_existente: 0,
                    stock_minimo: 0,
                    estado: 'Activo',
                    idespecialidad: 0,
                    idgrupo_inventario: 0,
                    clinicaId: clinicaSeleccionada || 0
                });
            }
        }
    }, [id, isOpen, clinicaSeleccionada]);

    const fetchDropdowns = async () => {
        try {
            const espRes = await api.get<any>('/especialidad?estado=activo&limit=100');
            const grupRes = await api.get<any>('/grupo-inventario?limit=100');

            const especialidadesData = Array.isArray(espRes.data) ? espRes.data : (espRes.data.data || []);
            setEspecialidades(especialidadesData);

            const gruposData = Array.isArray(grupRes.data) ? grupRes.data : (grupRes.data.data || []);
            setGrupos(gruposData);
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    const fetchInventario = async () => {
        try {
            const response = await api.get<Inventario>(`/inventario/${id}`);
            const item = response.data;
            setFormData({
                id: item.id,
                descripcion: item.descripcion,
                cantidad_existente: item.cantidad_existente,
                stock_minimo: item.stock_minimo,
                estado: item.estado,
                idespecialidad: item.idespecialidad,
                idgrupo_inventario: item.idgrupo_inventario,
                clinicaId: item.clinicaId
            });
        } catch (error) {
            console.error('Error fetching inventario:', error);
            Swal.fire('Error', 'No se pudo cargar el ítem', 'error');
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.idespecialidad) {
            Swal.fire('Atención', 'Por favor seleccione una especialidad', 'warning');
            return;
        }
        if (!formData.idgrupo_inventario) {
            Swal.fire('Atención', 'Por favor seleccione un grupo', 'warning');
            return;
        }

        if (!isEditing && (!formData.clinicaId || formData.clinicaId === 0)) {
            Swal.fire('Atención', 'Por favor seleccione una clínica', 'warning');
            return;
        }

        try {
            if (isEditing) {
                await api.patch(`/inventario/${id}`, formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'El ítem ha sido actualizado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/inventario', formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'El ítem ha sido creado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving inventario:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el ítem';
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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </span>
                                {isEditing ? 'Editar Ítem de Inventario' : 'Nuevo Ítem de Inventario'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Clinic Selector (Only for new records when no global clinic is selected) */}
                            {!isEditing && clinicaSeleccionada === null && (
                                <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                        Asignar a Clínica
                                    </h3>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                            </svg>
                                        </div>
                                        <select
                                            value={formData.clinicaId || 0}
                                            onChange={(e) => setFormData({ ...formData, clinicaId: Number(e.target.value) })}
                                            className="w-full pl-10 pr-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            required
                                        >
                                            <option value={0} disabled className="dark:bg-gray-700">Seleccione una Clínica</option>
                                            {clinicas.map(c => (
                                                <option key={c.id} value={c.id} className="dark:bg-gray-700">{c.nombre}</option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Descripción</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.descripcion}
                                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                            placeholder="Ej: Resina 3M"
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Cantidad Existente</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="number"
                                            value={formData.cantidad_existente}
                                            onChange={(e) => setFormData({ ...formData, cantidad_existente: Number(e.target.value) })}
                                            placeholder="0"
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Stock Mínimo</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type="number"
                                            value={formData.stock_minimo}
                                            onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                                            placeholder="0"
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                </div>



                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Especialidad</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                                </svg>
                                            </div>
                                            <select
                                                value={formData.idespecialidad}
                                                onChange={(e) => setFormData({ ...formData, idespecialidad: Number(e.target.value) })}
                                                className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            >
                                                <option value={0} className="dark:bg-gray-700">Seleccione Especialidad</option>
                                                {especialidades.map(e => <option key={e.id} value={e.id} className="dark:bg-gray-700">{e.especialidad}</option>)}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                        {puedeCrearEspecialidad && (
                                            <button
                                                type="button"
                                                onClick={() => setIsEspecialidadModalOpen(true)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                                title="Añadir Especialidad"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Grupo</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <select
                                                value={formData.idgrupo_inventario}
                                                onChange={(e) => setFormData({ ...formData, idgrupo_inventario: Number(e.target.value) })}
                                                className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                            >
                                                <option value={0} className="dark:bg-gray-700">Seleccione Grupo</option>
                                                {grupos.map(g => <option key={g.id} value={g.id} className="dark:bg-gray-700">{g.grupo}</option>)}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                        {puedeCrearGrupo && (
                                            <button
                                                type="button"
                                                onClick={() => setIsGrupoModalOpen(true)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                                title="Añadir Grupo Inventario"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Estado</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <select
                                            value={formData.estado}
                                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                            className="w-full pl-10 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                        >
                                            <option value="" disabled className="dark:bg-gray-700">-- Seleccione --</option>
                                            <option value="Activo" className="dark:bg-gray-700">Activo</option>
                                            <option value="Inactivo" className="dark:bg-gray-700">Inactivo</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-start gap-3 rounded-b-xl mt-6 -mx-6 -mb-6">
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {isEditing ? 'Actualizar' : 'Guardar'}
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
                    </div>
                </div>
            </div>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Inventario"
                sections={manualSections}
            />

            {/* Modal de Creación Rápida de Grupo de Inventario */}
            {puedeCrearGrupo && (
                <div style={{ zIndex: 60 }} className="relative">
                    <GrupoInventarioForm
                        isOpen={isGrupoModalOpen}
                        onClose={() => setIsGrupoModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchDropdowns();
                            setIsGrupoModalOpen(false);
                        }}
                    />
                </div>
            )}
            {/* Modal de Creación Rápida de Especialidad */}
            {puedeCrearEspecialidad && (
                <div style={{ zIndex: 60 }} className="relative">
                    <EspecialidadForm
                        isOpen={isEspecialidadModalOpen}
                        onClose={() => setIsEspecialidadModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchDropdowns();
                            setIsEspecialidadModalOpen(false);
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default InventarioForm;
