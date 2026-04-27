import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Personal, PersonalTipo } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import PersonalTipoForm from './PersonalTipoForm';


interface PersonalFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | null;
    onSaveSuccess?: () => void;
}

const PersonalForm: React.FC<PersonalFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const { clinicaSeleccionada } = useClinica();
    const [formData, setFormData] = useState({
        paterno: '',
        materno: '',
        nombre: '',
        ci: '',
        direccion: '',
        telefono: '',
        celular: '',
        fecha_nacimiento: '',
        fecha_ingreso: '',
        estado: 'activo',
        fecha_baja: '',
        personalTipoId: '' as any,
        clinicaId: '' as any
    });
    const [showManual, setShowManual] = useState(false);
    const [celularCode, setCelularCode] = useState('+591');
    const [celularNum, setCelularNum] = useState('');
    const [personalTipos, setPersonalTipos] = useState<PersonalTipo[]>([]);

    // Estados para el Modal de PersonalTipo (Área)
    const [isPersonalTipoModalOpen, setIsPersonalTipoModalOpen] = useState(false);
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

    const puedeCrearArea = !userPermisos.includes('configuracion');

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Personal',
            content: 'Registre la información del personal que trabaja en la clínica. Incluya datos personales, contacto, fechas de ingreso y estado laboral.'
        },
        {
            title: 'Fechas Importantes',
            content: 'Registre la fecha de nacimiento, fecha de ingreso y fecha de baja (si aplica). Estas fechas son importantes para cálculos de antigüedad y vacaciones.'
        },
        {
            title: 'Estado del Personal',
            content: 'El personal puede estar activo o inactivo. El personal inactivo no aparecerá en las opciones de selección para nuevas asignaciones.'
        }];

    useEffect(() => {
        if (isOpen) {
            fetchPersonalTipos();
            if (id) {
                api.get<Personal>(`/personal/${id}`)
                    .then(response => {
                        const data = response.data;
                        // Split celular into code + number
                        const codes = ['+591', '+54', '+55', '+56', '+51', '+595', '+598', '+57', '+52', '+34', '+1'];
                        const matchedCode = codes.find(c => data.celular?.startsWith(c));
                        if (matchedCode) {
                            setCelularCode(matchedCode);
                            setCelularNum(data.celular.substring(matchedCode.length));
                        } else {
                            setCelularNum(data.celular || '');
                            setCelularCode('+591');
                        }
                        setFormData({
                            ...data,
                            fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : '',
                            fecha_ingreso: data.fecha_ingreso ? data.fecha_ingreso.split('T')[0] : '',
                            fecha_baja: data.fecha_baja ? data.fecha_baja.split('T')[0] : '',
                            personalTipoId: data.personal_tipo_id || '',
                            clinicaId: data.clinicaId || ''
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching personal:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Error al cargar el personal'
                        });
                    });
            } else {
                setFormData({
                    paterno: '',
                    materno: '',
                    nombre: '',
                    ci: '',
                    direccion: '',
                    telefono: '',
                    celular: '',
                    fecha_nacimiento: '',
                    fecha_ingreso: '',
                    estado: 'activo',
                    fecha_baja: '',
                    personalTipoId: '' as any,
                    clinicaId: clinicaSeleccionada || ''
                });
                setCelularCode('+591');
                setCelularNum('');
            }
        }
    }, [id, isOpen]);

    const fetchPersonalTipos = async () => {
        try {
            const response = await api.get('/personal-tipo');
            // Check if response is array or paginated object
            const areas = Array.isArray(response.data) ? response.data :
                (response.data.data ? response.data.data : []);
            // Filter only active areas
            setPersonalTipos(areas.filter((a: PersonalTipo) => a.estado === 'activo' || a.estado === 'Activo'));
        } catch (error) {
            console.error('Error fetching areas:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullCelular = celularNum ? `${celularCode}${celularNum}` : '';
        try {
            // Convert personalTipoId to number or null
            let personalTipoIdValue: number | null = null;
            if (formData.personalTipoId && formData.personalTipoId !== '') {
                personalTipoIdValue = Number(formData.personalTipoId);
            }

            const submitData = {
                ...formData,
                celular: fullCelular,
                fecha_baja: formData.estado === 'inactivo' && formData.fecha_baja ? formData.fecha_baja : undefined,
                personalTipoId: personalTipoIdValue,
                clinicaId: clinicaSeleccionada ? Number(clinicaSeleccionada) : undefined
            };

            console.log('=== FRONTEND SUBMIT DEBUG ===');
            console.log('FormData.personalTipoId:', formData.personalTipoId);
            console.log('Converted personalTipoIdValue:', personalTipoIdValue);
            console.log('Final submitData:', submitData);
            console.log('=== END DEBUG ===');

            if (id) {
                await api.patch(`/personal/${id}`, submitData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Personal Actualizado',
                    text: 'Personal actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/personal', submitData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Personal Creado',
                    text: 'Personal creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving personal:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el personal';
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
                                <span className="p-2 bg-teal-100 dark:bg-teal-900 rounded-lg text-teal-600 dark:text-teal-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </span>
                                {id ? 'Editar Personal' : 'Nuevo Personal'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Apellido Paterno:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            type="text"
                                            name="paterno"
                                            value={formData.paterno}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: Pérez"

                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Apellido Materno:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            type="text"
                                            name="materno"
                                            value={formData.materno}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: Gómez"

                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Nombre:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: Juan"

                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">CI:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                            <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="12" x2="16" y2="12"></line>
                                            <line x1="8" y1="16" x2="12" y2="16"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            name="ci"
                                            value={formData.ci}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: 1234567"

                                        />
                                    </div>
                                </div>
                                <div className="mb-4 md:col-span-2">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Dirección:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <input
                                            type="text"
                                            name="direccion"
                                            value={formData.direccion}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Dirección completa..."

                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Teléfono:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <input
                                            type="text"
                                            name="telefono"
                                            value={formData.telefono}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: 4-440000"

                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Celular:</label>
                                    <div className="relative flex gap-2 w-full">
                                        <select
                                            value={celularCode}
                                            onChange={e => setCelularCode(e.target.value)}
                                            className="w-1/3 py-2 px-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="" disabled>-- seleccionar --</option>
                                            <option value="+591">🇧🇴 +591</option>
                                            <option value="+54">🇦🇷 +54</option>
                                            <option value="+55">🇧🇷 +55</option>
                                            <option value="+56">🇨🇱 +56</option>
                                            <option value="+51">🇵🇪 +51</option>
                                            <option value="+595">🇵🇾 +595</option>
                                            <option value="+598">🇺🇾 +598</option>
                                            <option value="+57">🇨🇴 +57</option>
                                            <option value="+52">🇲🇽 +52</option>
                                            <option value="+34">🇪🇸 +34</option>
                                            <option value="+1">🇺🇸 +1</option>
                                        </select>
                                        <div className="relative w-2/3">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                                <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                            </svg>
                                            <input
                                                type="text"
                                                placeholder="Ej: 70012345"
                                                value={celularNum}
                                                onChange={e => setCelularNum(e.target.value)}
                                                required
                                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Fecha Nacimiento:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        <input
                                            type="date"
                                            name="fecha_nacimiento"
                                            value={formData.fecha_nacimiento}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Área:</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                            <select
                                                name="personalTipoId"
                                                value={formData.personalTipoId}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                            >
                                                <option value="">-- seleccionar --</option>
                                                {personalTipos.map(tipo => (
                                                    <option key={tipo.id} value={tipo.id}>
                                                        {tipo.area}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400 dark:text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                        {puedeCrearArea && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPersonalTipoModalOpen(true)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                                title="Añadir Área de Personal"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Fecha Ingreso:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        <input
                                            type="date"
                                            name="fecha_ingreso"
                                            value={formData.fecha_ingreso}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Estado:</label>
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                            <line x1="12" y1="2" x2="12" y2="12"></line>
                                        </svg>
                                        <select
                                            name="estado"
                                            value={formData.estado}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="" disabled>-- seleccionar --</option><option value="activo">Activo</option>
                                            <option value="inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                                {formData.estado === 'inactivo' && (
                                    <div className="mb-4">
                                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Fecha Baja:</label>
                                        <div className="relative">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                            <input
                                                type="date"
                                                name="fecha_baja"
                                                value={formData.fecha_baja}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Footer Buttons */}
                            <div className="flex justify-start gap-3 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {id ? 'Actualizar' : 'Guardar'}
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
                title="Manual - Personal"
                sections={manualSections}
            />

            {/* Modal de Creación Rápida de Área de Personal */}
            {puedeCrearArea && (
                <div style={{ zIndex: 60 }} className="relative">
                    <PersonalTipoForm
                        isOpen={isPersonalTipoModalOpen}
                        onClose={() => setIsPersonalTipoModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchPersonalTipos();
                            setIsPersonalTipoModalOpen(false);
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default PersonalForm;
