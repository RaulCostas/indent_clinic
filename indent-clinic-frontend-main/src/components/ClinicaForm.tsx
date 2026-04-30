import React, { useState, useEffect } from 'react';

import api from '../services/api';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import { getLogoUrl } from '../utils/formatters';

const CODIGOS_PAIS = [
    { code: '+591', label: '🇧🇴 +591' },
    { code: '+54', label: '🇦🇷 +54' },
    { code: '+55', label: '🇧🇷 +55' },
    { code: '+56', label: '🇨🇱 +56' },
    { code: '+51', label: '🇵🇪 +51' },
    { code: '+595', label: '🇵🇾 +595' },
    { code: '+598', label: '🇺🇾 +598' },
    { code: '+57', label: '🇨🇴 +57' },
    { code: '+52', label: '🇲🇽 +52' },
    { code: '+34', label: '🇪🇸 +34' },
    { code: '+1', label: '🇺🇸 +1' },
];

interface ClinicaFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

interface Sucursal {
    id?: number;
    nombre: string;
    direccion: string;
    horario: string;
    telefono: string;
    latitud?: number;
    longitud?: number;
    google_maps_url?: string;
    es_principal?: boolean;
}

const ClinicaForm: React.FC<ClinicaFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const { recargarClinicas } = useClinica();
    const [loading, setLoading] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [nuevaSucursal, setNuevaSucursal] = useState<Sucursal>({ 
        nombre: '', 
        direccion: '', 
        horario: '', 
        telefono: '',
        latitud: 0,
        longitud: 0,
        google_maps_url: ''
    } as Sucursal);
    const [showSucursalForm, setShowSucursalForm] = useState(false);
    const [editingSucursalId, setEditingSucursalId] = useState<number | null>(null);

    const [form, setForm] = useState({
        nombre: '',
        monedaDefault: 'Bs.',
        logo: '',
        qr_pago: '',
    });

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Clínicas',
            content: 'Configure las sucursales o clínicas del sistema. El nombre es obligatorio. Puede agregar dirección, teléfono fijo y celular con código de país.'
        },
        {
            title: 'Selector Global',
            content: 'Una vez creadas las clínicas, aparecerá un selector "🏥" en el header que permite filtrar toda la información del sistema por clínica.'
        }];

    useEffect(() => {
        if (!isOpen) return;

        if (id) {
            api.get(`/clinicas/${id}`)
                .then(res => {
                    const c = res.data;
                    setForm({
                        nombre: c.nombre || '',
                        monedaDefault: c.monedaDefault || 'Bs.',
                        logo: c.logo || '',
                        qr_pago: c.qr_pago || '',
                    });
                    cargarSucursales(id as number);
                })
                .catch(() => {
                    Swal.fire('Error', 'No se pudo cargar la clínica', 'error');
                    onClose();
                });
        } else {
            setSucursales([]);
            setForm({
                nombre: '',
                monedaDefault: 'Bs.',
                logo: '',
                qr_pago: '',
            });
        }
    }, [isOpen, id]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, qr_pago: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[ClinicaForm] Submit intercepted. Form data:', { ...form, logo: form.logo ? 'Present (Base64)' : 'Not present' });
        
        if (!form.nombre.trim()) {
            console.warn('[ClinicaForm] Name is empty, aborting.');
            Swal.fire('Aviso', 'El nombre es obligatorio', 'warning');
            return;
        }
        setLoading(true);
        try {
            console.log(`[ClinicaForm] Sending ${id ? 'PATCH' : 'POST'} request to /clinicas...`);
            if (id) {
                const response = await api.patch(`/clinicas/${id}`, form);
                console.log('[ClinicaForm] PATCH response:', response.data);
                await Swal.fire({ icon: 'success', title: '¡Clínica actualizada!', showConfirmButton: false, timer: 1500 });
            } else {
                const response = await api.post('/clinicas', form);
                console.log('[ClinicaForm] POST response:', response.data);
                await Swal.fire({ icon: 'success', title: '¡Clínica creada!', showConfirmButton: false, timer: 1500 });
            }
            recargarClinicas();
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving clinica:', error);
            const errorMessage = error.response?.data?.message || 'No se pudo guardar la clínica';
            Swal.fire('Aviso', Array.isArray(errorMessage) ? errorMessage[0] : errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    const cargarSucursales = async (clinicaId: number) => {
        try {
            const res = await api.get(`/clinicas/${clinicaId}/sucursales`);
            setSucursales(res.data);
        } catch (error) {
            console.error('Error cargando sucursales:', error);
        }
    };

    const handleSaveSucursal = async () => {
        if (!nuevaSucursal.nombre.trim()) {
            Swal.fire('Aviso', 'El nombre de la sucursal es obligatorio', 'warning');
            return;
        }
        try {
            if (editingSucursalId) {
                await api.patch(`/clinicas/sucursales/${editingSucursalId}`, nuevaSucursal);
            } else {
                await api.post(`/clinicas/${id}/sucursales`, nuevaSucursal);
            }
            cargarSucursales(id as number);
            setShowSucursalForm(false);
            setNuevaSucursal({ 
                nombre: '', 
                direccion: '', 
                horario: '', 
                telefono: '',
                latitud: 0,
                longitud: 0,
                google_maps_url: ''
            } as Sucursal);
            setEditingSucursalId(null);
            Swal.fire({ icon: 'success', title: 'Sucursal guardada', showConfirmButton: false, timer: 1000 });
        } catch (error) {
            Swal.fire('Error', 'No se pudo guardar la sucursal', 'error');
        }
    };

    const handleEditSucursal = (s: Sucursal) => {
        setNuevaSucursal(s);
        setEditingSucursalId(s.id || null);
        setShowSucursalForm(true);
    };

    const handleDeleteSucursal = async (sucursalId: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar sucursal?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/clinicas/sucursales/${sucursalId}`);
                cargarSucursales(id as number);
                Swal.fire('Eliminado', 'La sucursal ha sido eliminada', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la sucursal', 'error');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-[700px] h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </span>
                            {id ? 'Editar Clínica' : 'Nueva Clínica'}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowManual(true)}
                            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Ayuda / Manual"
                        >
                            ?
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Nombre de la Clínica */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre de la Clínica / Empresa
                                </label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pr-3 pl-10 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Clínica Norte"
                                    />
                                </div>
                            </div>

                            {/* Moneda Default */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Moneda por Defecto
                                </label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    <select
                                        name="monedaDefault"
                                        value={form.monedaDefault}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pr-3 pl-10 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    >
                                        <option value="Bs.">Bolivianos (Bs.)</option>
                                        <option value="USD">Dólares (USD)</option>
                                    </select>
                                </div>
                            </div>

                            {/* QR Pago */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Enlace QR Pago (Opcional)
                                </label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    <input
                                        type="text"
                                        name="qr_pago"
                                        value={form.qr_pago}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pr-3 pl-10 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="URL de imagen QR o enlace..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gestión de Sucursales (Solo en edición) */}
                        {id && (
                            <div className="mb-8 border-t dark:border-gray-700 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        Sucursales
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNuevaSucursal({ 
                                                nombre: '', 
                                                direccion: '', 
                                                horario: '', 
                                                telefono: '',
                                                latitud: 0,
                                                longitud: 0,
                                                google_maps_url: ''
                                            } as Sucursal);
                                            setEditingSucursalId(null);
                                            setShowSucursalForm(true);
                                        }}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-4 rounded-lg flex items-center gap-1.5 transform hover:-translate-y-0.5 transition-all shadow-md active:scale-95"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        Añadir Sucursal
                                    </button>
                                </div>

                                {showSucursalForm && (
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl mb-4 border border-blue-100 dark:border-blue-900/30 animate-fade-in">
                                        <h4 className="text-sm font-bold mb-3 text-blue-600 dark:text-blue-400">
                                            {editingSucursalId ? 'Editar Sucursal' : 'Nueva Sucursal'}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Nombre sucursal (Ej: San Miguel)"
                                                value={nuevaSucursal.nombre}
                                                onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, nombre: e.target.value })}
                                                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Teléfono"
                                                value={nuevaSucursal.telefono}
                                                onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, telefono: e.target.value })}
                                                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Dirección completa"
                                                value={nuevaSucursal.direccion}
                                                onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, direccion: e.target.value })}
                                                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Horario de atención"
                                                value={nuevaSucursal.horario}
                                                onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, horario: e.target.value })}
                                                className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                                            />
                                            {/* Campos de Ubicación */}
                                            <div className="md:col-span-2 grid grid-cols-2 gap-3 mt-1">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">LAT</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Latitud"
                                                        value={nuevaSucursal.latitud || ''}
                                                        onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, latitud: parseFloat(e.target.value) })}
                                                        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-10 pr-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">LNG</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Longitud"
                                                        value={nuevaSucursal.longitud || ''}
                                                        onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, longitud: parseFloat(e.target.value) })}
                                                        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-10 pr-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="URL Google Maps (Opcional)"
                                                    value={nuevaSucursal.google_maps_url || ''}
                                                    onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, google_maps_url: e.target.value })}
                                                    className="w-full text-[10px] border border-gray-300 dark:border-gray-600 rounded-lg py-1.5 px-3 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                                                />
                                                <div className="md:col-span-2 flex items-center gap-2 mt-1">
                                                    <input
                                                        type="checkbox"
                                                        id="es_principal"
                                                        checked={nuevaSucursal.es_principal || false}
                                                        onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, es_principal: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <label htmlFor="es_principal" className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                                                        Marcar como Sede Principal
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowSucursalForm(false)}
                                                className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-1.5 rounded-lg font-semibold transform hover:-translate-y-0.5 transition-all hover:bg-gray-300 dark:hover:bg-gray-600 shadow-sm active:scale-95"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveSucursal}
                                                className="text-xs bg-blue-600 text-white px-5 py-1.5 rounded-lg font-bold transform hover:-translate-y-0.5 transition-all hover:bg-blue-700 shadow-md active:scale-95"
                                            >
                                                {editingSucursalId ? 'Actualizar' : 'Añadir'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {sucursales.length === 0 ? (
                                        <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                            No hay sucursales registradas aún.
                                        </p>
                                    ) : (
                                        sucursales.map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-gray-800 dark:text-white">{s.nombre}</p>
                                                            {s.es_principal && (
                                                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Principal</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.direccion}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 transition-all">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditSucursal(s)}
                                                        className="p-2.5 bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-500 dark:hover:text-white rounded-xl transition-all shadow-sm border border-blue-200 dark:border-blue-800 active:scale-90 group/btn"
                                                        title="Editar Sucursal"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSucursal(s.id!)}
                                                        className="p-2.5 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-500 dark:hover:text-white rounded-xl transition-all shadow-sm border border-red-200 dark:border-red-800 active:scale-90 group/btn"
                                                        title="Eliminar Sucursal"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover/btn:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Logo Upload */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Logo de la Clínica
                            </label>
                            <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <div className="w-24 h-24 rounded-lg bg-white dark:bg-gray-700 border dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                    {form.logo ? (
                                        <img src={getLogoUrl(form.logo) || ''} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        Recomendado: PNG o JPG, fondo transparente, máx 2MB.
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        id="logo-upload"
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="logo-upload"
                                        className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 py-1.5 px-4 rounded-lg cursor-pointer inline-flex items-center gap-2 text-sm font-semibold transition-colors border border-blue-200 dark:border-blue-800"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Subir Logo
                                    </label>
                                    {form.logo && (
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, logo: '' })}
                                            className="ml-3 inline-flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors text-xs font-semibold"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* QR Pago Upload */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                QR de Pago (WhatsApp)
                            </label>
                            <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                                <div className="w-24 h-24 rounded-lg bg-white dark:bg-gray-700 border dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                                    {form.qr_pago ? (
                                        <img src={getLogoUrl(form.qr_pago) || ''} alt="QR Preview" className="max-w-full max-h-full object-contain" />
                                    ) : (
                                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        Se enviará por WhatsApp junto con los recordatorios de deuda.
                                    </p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleQrChange}
                                        id="qr-upload"
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="qr-upload"
                                        className="bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 py-1.5 px-4 rounded-lg cursor-pointer inline-flex items-center gap-2 text-sm font-semibold transition-colors border border-blue-200 dark:border-blue-800"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Subir QR
                                    </label>
                                    {form.qr_pago && (
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, qr_pago: '' })}
                                            className="ml-3 inline-flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors text-xs font-semibold"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Eliminar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-start gap-3 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                {loading ? 'Guardando...' : id ? 'Actualizar' : 'Guardar'}
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
                        title="Manual - Clínicas"
                        sections={manualSections}
                    />
                </div>
            </div>
        </div>
    );
};

export default ClinicaForm;
