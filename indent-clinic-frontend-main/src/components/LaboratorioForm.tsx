import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { Plus } from 'lucide-react';


interface LaboratorioFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | null;
    onSaveSuccess?: () => void;
}

const LaboratorioForm: React.FC<LaboratorioFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        laboratorio: '',
        celular: '',
        telefono: '',
        direccion: '',
        email: '',
        banco: '',
        numero_cuenta: '',
        estado: 'activo'
    });
    const [celularCode, setCelularCode] = useState('+591');
    const [celularNum, setCelularNum] = useState('');
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Laboratorios',
            content: 'Registre laboratorios externos con los que trabaja la clínica. Incluya información de contacto y datos bancarios para pagos.'
        },
        {
            title: 'Información de Contacto',
            content: 'Registre teléfonos, celular, dirección y email del laboratorio para facilitar la comunicación y seguimiento de trabajos.'
        },
        {
            title: 'Datos Bancarios',
            content: 'Registre banco y número de cuenta para facilitar los pagos a laboratorios. Esta información aparecerá en los registros de pagos.'
        }];

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                fetchLaboratorio();
            } else {
                setFormData({
                    laboratorio: '',
                    celular: '',
                    telefono: '',
                    direccion: '',
                    email: '',
                    banco: '',
                    numero_cuenta: '',
                    estado: 'activo'
                });
                setCelularCode('+591');
                setCelularNum('');
            }
        }
    }, [id, isOpen]);

    const fetchLaboratorio = async () => {
        try {
            const response = await api.get(`/laboratorios/${id}`);
            const data = response.data;
            // Split stored celular into country code + number
            const countryCodes = ['+591', '+54', '+55', '+56', '+51', '+595', '+598', '+57', '+52', '+34', '+1'];
            const matchedCode = countryCodes.find(c => data.celular?.startsWith(c));
            if (matchedCode) {
                setCelularCode(matchedCode);
                setCelularNum(data.celular.substring(matchedCode.length));
            } else {
                setCelularNum(data.celular || '');
            }
            setFormData(data);
        } catch (error) {
            console.error('Error fetching laboratorio:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar el laboratorio'
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const fullCelular = celularNum ? `${celularCode}${celularNum}` : '';
        try {
            if (isEditing) {
                await api.patch(`/laboratorios/${id}`, { ...formData, celular: fullCelular });
                await Swal.fire({
                    icon: 'success',
                    title: 'Laboratorio Actualizado',
                    text: 'Laboratorio actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/laboratorios', { ...formData, celular: fullCelular });
                await Swal.fire({
                    icon: 'success',
                    title: 'Laboratorio Creado',
                    text: 'Laboratorio creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving laboratorio:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el laboratorio';
            Swal.fire({
                icon: 'error',
                title: 'Aviso',
                text: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage
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
                                <span className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg text-pink-600 dark:text-pink-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </span>
                                {isEditing ? 'Editar Laboratorio' : 'Nuevo Laboratorio'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Laboratorio:</label>
                                <div style={{ position: 'relative' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                        <path d="M10 2v7.31"></path>
                                        <path d="M14 2v7.31"></path>
                                        <path d="M8.5 2h7"></path>
                                        <path d="M14 9.3a6.5 6.5 0 1 1-4 0V2"></path>
                                    </svg>
                                    <input
                                        type="text"
                                        name="laboratorio"
                                        value={formData.laboratorio}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ej: LabDent, Laboratorio Silva..."

                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Celular:</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <select
                                            value={celularCode}
                                            onChange={e => setCelularCode(e.target.value)}
                                            className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[80px]"
                                        >
                                            <option value="" disabled>-- Seleccione --</option>
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
                                        <input
                                            type="text"
                                            placeholder="Ej: 70012345"
                                            value={celularNum}
                                            onChange={e => setCelularNum(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Teléfono:</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <input
                                            type="text"
                                            name="telefono"
                                            value={formData.telefono}
                                            onChange={handleChange}
                                            className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            placeholder="Ej: 4-440000"

                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Dirección:</label>
                                <div style={{ position: 'relative' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={formData.direccion}
                                        onChange={handleChange}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ej: Av. Principal #123..."

                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                                <div style={{ position: 'relative' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        placeholder="Ej: correo@ejemplo.com"

                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Banco:</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                            <line x1="3" y1="21" x2="21" y2="21"></line>
                                            <line x1="5" y1="21" x2="5" y2="10"></line>
                                            <line x1="19" y1="21" x2="19" y2="10"></line>
                                            <polyline points="2 6 12 2 22 6"></polyline>
                                        </svg>
                                        <input
                                            type="text"
                                            name="banco"
                                            value={formData.banco}
                                            onChange={handleChange}
                                            className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            placeholder="Ej: Banco Nacional de Bolivia..."

                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Número de Cuenta:</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                            <line x1="4" y1="9" x2="20" y2="9"></line>
                                            <line x1="4" y1="15" x2="20" y2="15"></line>
                                            <line x1="10" y1="3" x2="8" y2="21"></line>
                                            <line x1="16" y1="3" x2="14" y2="21"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            name="numero_cuenta"
                                            value={formData.numero_cuenta}
                                            onChange={handleChange}
                                            className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            placeholder="Ej: 100000123456"

                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Estado:</label>
                                <div style={{ position: 'relative' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                        <line x1="12" y1="2" x2="12" y2="12"></line>
                                    </svg>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        className="w-full pl-10 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="" disabled>-- Seleccione --</option><option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
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
                title="Manual - Laboratorios"
                sections={manualSections}
            />
        </>
    );
};

export default LaboratorioForm;
