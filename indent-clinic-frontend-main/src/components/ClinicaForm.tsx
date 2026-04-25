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

const ClinicaForm: React.FC<ClinicaFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const { recargarClinicas } = useClinica();
    const [loading, setLoading] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const [form, setForm] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        codigoPaisCelular: '+591',
        celular: '',
        monedaDefault: 'Bs.',
        horario_atencion: '',
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
                        direccion: c.direccion || '',
                        telefono: c.telefono || '',
                        codigoPaisCelular: c.codigoPaisCelular || '+591',
                        celular: c.celular || '',
                        monedaDefault: c.monedaDefault || 'Bs.',
                        horario_atencion: c.horario_atencion || '',
                        logo: c.logo || '',
                        qr_pago: c.qr_pago || '',
                    });
                })
                .catch(() => {
                    Swal.fire('Error', 'No se pudo cargar la clínica', 'error');
                    onClose();
                });
        } else {
            setForm({
                nombre: '',
                direccion: '',
                telefono: '',
                codigoPaisCelular: '+591',
                celular: '',
                monedaDefault: 'Bs.',
                horario_atencion: '',
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
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre
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
                                        required
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pr-3 pl-10 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Clínica Norte"

                                    />
                                </div>
                            </div>
                            {/* Dirección */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Dirección
                                </label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={form.direccion}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pr-3 pl-10 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Av. Principal #123..."

                                    />
                                </div>
                            </div>
                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Teléfono fijo
                                </label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <input
                                        type="text"
                                        name="telefono"
                                        value={form.telefono}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pr-3 pl-10 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: 4-440000"

                                    />
                                </div>
                            </div>
                            {/* Celular con código de país */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Celular
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        name="codigoPaisCelular"
                                        value={form.codigoPaisCelular}
                                        onChange={handleChange}
                                        className="py-2 px-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        {CODIGOS_PAIS.map(p => (
                                            <option key={p.code} value={p.code}>
                                                {p.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="relative flex-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                            <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            name="celular"
                                            value={form.celular}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-colors"
                                            placeholder="Ej: 70012345"

                                        />
                                    </div>
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
                                        <option value="Bs.">Bolivianos</option>
                                        <option value="USD">Dólares</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                            {/* Horario Atención */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Horario de Atención
                                </label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        name="horario_atencion"
                                        value={form.horario_atencion}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2 pr-3 pl-10 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Lunes a Viernes de 08:00 a 18:00"
                                    />
                                </div>
                            </div>
                        </div>

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
