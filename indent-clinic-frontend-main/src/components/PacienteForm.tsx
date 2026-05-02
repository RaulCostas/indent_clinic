import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import SignatureModal from './SignatureModal';

import { getLocalDateString } from '../utils/dateUtils';
import { Plus } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';
import SiNoSelector from './SiNoSelector';


const PacienteForm: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [showManual, setShowManual] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    useEffect(() => {
        if (location.state?.openSignature) {
            setShowSignatureModal(true);
            // Clear state so it doesn't reopen on manual refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const manualSections: ManualSection[] = [
        {
            title: 'Registro de Pacientes',
            content: 'Complete los datos personales, de contacto y médicos del paciente. Use las pestañas para organizar la información. El formulario cuenta con 2 pestañas: Datos Personales y Ficha Médica.'
        },
        {
            title: 'Ficha Médica',
            content: 'Registre el historial médico del paciente, incluyendo alergias, enfermedades crónicas y medicamentos. Esta información es crucial para la atención odontológica segura.'
        },

        {
            title: 'Guardado de Datos',
            content: 'Use el botón "Guardar" al final del formulario para guardar los datos personales y la ficha médica. Puede cancelar en cualquier momento con el botón "Cancelar".'
        },
        {
            title: 'Novedades y Atajos',
            content: '• En la tabla principal (pantalla anterior) ahora tiene botones de atajo para ver e imprimir directamente el listado de pacientes.\n• Ahora los campos con listas desplegables irán actualizándose progresivamente para permitirle crear opciones nuevas sin salir de este formulario (botón +).'
        }
    ];

    const [formData, setFormData] = useState({
        fecha: getLocalDateString(),
        paterno: '',
        materno: '',
        nombre: '',
        direccion: '',
        telefono: '',
        celular: '',
        email: '',
        casilla: '',
        profesion: '',
        estado_civil: '',
        direccion_oficina: '',
        telefono_oficina: '',
        fecha_nacimiento: '',
        sexo: '',
        seguro_medico: '',
        poliza: '',
        fecha_vencimiento: '',
        responsable: '',
        parentesco: '',
        direccion_responsable: '',
        telefono_responsable: '',

        ci: '',
        lugar_residencia: '',
        estado: 'activo',
        clasificacion: 'A0',
        clinicaId: null,
        // Ficha Medica
        fichaMedica: {
            ultima_visita_odontologo: '',
            motivo_consulta: '',
            bruxismo: false,
            alergia_medicamento: false,
            alergia_medicamento_detalle: '',
            medicamento_72h: false,
            medicamento_72h_detalle: '',
            tratamiento_medico: false,
            tratamiento_medico_detalle: '',
            anestesiado_anteriormente: false,
            reaccion_anestesia: false,
            reaccion_anestesia_detalle: '',
            enf_neurologicas: false,
            enf_neurologicas_detalle: '',
            enf_pulmonares: false,
            enf_pulmonares_detalle: '',
            enf_cardiacas: false,
            enf_cardiacas_detalle: '',
            enf_higado: false,
            enf_higado_detalle: '',
            enf_gastricas: false,
            enf_gastricas_detalle: '',
            enf_venereas: false,
            enf_venereas_detalle: '',
            enf_renales: false,
            enf_renales_detalle: '',
            articulaciones: false,
            articulaciones_detalle: '',
            diabetes: false,
            diabetes_detalle: '',
            hipertension: false,
            hipotension: false,
            anemia: false,
            anemia_detalle: '',
            prueba_vih: false,
            prueba_vih_resultado: '',
            anticonceptivo_hormonal: false,
            anticonceptivo_hormonal_detalle: '',
            posibilidad_embarazo: false,
            semana_gestacion: '',
            cepillado_veces: '',
            usa_hilo_dental: false,
            usa_enjuague: false,
            fuma: false,
            fuma_cantidad: '',
            consume_citricos: false,
            observaciones: ''
        }
    });

    // New state for phone country code
    const [countryCode, setCountryCode] = useState('+591');
    const [localCelular, setLocalCelular] = useState('');

    const countryCodes = [
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

    useEffect(() => {
        if (isEditing) {
            fetchPaciente();
        }
    }, [id]);

    const fetchPaciente = async () => {
        try {
            const response = await api.get(`/pacientes/${id}`);
            const data = response.data;
            console.log('Fetched paciente data:', data);

            // Ensure idCategoria is set correctly
            // if (data.categoria && !data.idCategoria) {
            //     data.idCategoria = data.categoria.id;
            // }
            // if (!data.idCategoria) {
            //     data.idCategoria = 0;
            // }

            // Initialize fichaMedica if missing
            if (!data.fichaMedica) {
                data.fichaMedica = { ...formData.fichaMedica };
            }

            // Safety fallback for classification to prevent crash
            if (!data.clasificacion) {
                data.clasificacion = 'A0';
            }

            setFormData(data);

            // Handle splitting celular into code and number
            if (data.celular) {
                // Check if it starts with any known code
                const foundCode = countryCodes.find(c => data.celular.startsWith(c.code));
                if (foundCode && foundCode.code !== '+0') {
                    setCountryCode(foundCode.code);
                    setLocalCelular(data.celular.substring(foundCode.code.length));
                } else {
                    // Try to guess or just set generic
                    if (data.celular.startsWith('+')) {
                        // It has a code but maybe not in our list, or is custom
                        setCountryCode('+0');
                        setLocalCelular(data.celular);
                    } else {
                        // Assuming default or old data without code
                        setCountryCode('+591');
                        setLocalCelular(data.celular);
                    }
                }
            } else {
                setCountryCode('+591');
                setLocalCelular('');
            }
        } catch (error) {
            console.error('Error fetching paciente:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar el paciente'
            });
        }
    };

    // const [categorias, setCategorias] = useState<any[]>([]);

    // useEffect(() => {
    //     fetchCategorias();
    // }, []);

    // const fetchCategorias = async () => {
    //     try {
    //         const response = await api.get('/categoria-paciente?limit=100');
    //         const activeCategorias = (response.data.data || []).filter((cat: any) => cat.estado === 'activo');
    //         setCategorias(activeCategorias);
    //     } catch (error) {
    //         console.error('Error fetching categorias:', error);
    //     }
    // };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (name.startsWith('fichaMedica.')) {
            const field = name.split('.')[1];
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({
                ...prev,
                fichaMedica: {
                    ...prev.fichaMedica,
                    [field]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSiNoChange = (name: string, value: boolean) => {
        if (name.startsWith('fichaMedica.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                fichaMedica: {
                    ...prev.fichaMedica,
                    [field]: value
                }
            }));
        }
    };

    const handleSaveAndSign = async () => {
        try {
            const finalCelular = countryCode === '+0' ? localCelular : `${countryCode}${localCelular}`;
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const payload = { 
                ...formData, 
                celular: finalCelular,
                clinicaId: isEditing ? formData.clinicaId : (clinicaSeleccionada || undefined),
                usuarioId: user.id,
                fichaMedica: {
                    ...formData.fichaMedica,
                    usuarioId: user.id
                }
            };

            if (isEditing) {
                await api.patch(`/pacientes/${id}`, payload);
                setShowSignatureModal(true);
            } else {
                const response = await api.post('/pacientes', payload);
                const newId = response.data.id;

                await Swal.fire({
                    icon: 'success',
                    title: 'Paciente Guardado',
                    text: 'Se procedrerá con la firma de la ficha.',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Navigate to edit mode and signal to open signature
                navigate(`/pacientes/edit/${newId}`, { state: { openSignature: true }, replace: true });
            }
        } catch (error: any) {
            console.error('Error saving before signature:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el paciente';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalCelular = countryCode === '+0' ? localCelular : `${countryCode}${localCelular}`;

            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const payload = {
                ...formData,
                celular: finalCelular,
                clinicaId: isEditing ? formData.clinicaId : (clinicaSeleccionada || undefined),
                usuarioId: user.id,
                fichaMedica: {
                    ...formData.fichaMedica,
                    usuarioId: user.id
                }
            };
            console.log('Submitting payload:', payload);

            if (isEditing) {
                await api.patch(`/pacientes/${id}`, payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Paciente Actualizado',
                    text: 'Paciente actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/pacientes', payload);


                await Swal.fire({
                    icon: 'success',
                    title: 'Paciente Creado',
                    text: 'Paciente creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            navigate('/pacientes');
        } catch (error: any) {
            console.error('Error saving paciente:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el paciente';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
            });
        }
    };

    return (
        <div className="content-card max-w-[700px] mx-auto text-gray-800 dark:text-white">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </span>
                    {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed italic bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-lg">
                "Toda la información proporcionada en este documento es confidencial y de uso exclusivo de la clínica <strong>{clinicaActual?.nombre || 'la clínica'}</strong> para fines terapéuticos."
            </p>

            <form onSubmit={handleSubmit} className="grid gap-5">
                {/* Datos Personales */}
                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Datos Personales</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Paterno: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="paterno" value={formData.paterno} onChange={handleChange} required placeholder="Ej: Pérez"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Materno: <span className="text-xs font-normal text-gray-400">(opcional)</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="materno" value={formData.materno} onChange={handleChange} placeholder="Ej: Gómez"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Nombre: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Juan"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Fecha Nacimiento: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Sexo: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <select name="sexo" value={formData.sexo} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Estado Civil: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="Soltero">Soltero(a)</option>
                                    <option value="Casado">Casado(a)</option>
                                    <option value="Divorciado">Divorciado(a)</option>
                                    <option value="Viudo">Viudo(a)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
                                C.I. {calculateAge(formData.fecha_nacimiento) >= 18 && <span className="text-red-500">*</span>}:
                            </label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                </svg>
                                <input type="text" name="ci" value={formData.ci} onChange={handleChange} required={calculateAge(formData.fecha_nacimiento) >= 18} placeholder="Cédula de Identidad..."
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Seguro: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                                <select 
                                    name="seguro_medico" 
                                    value={formData.seguro_medico} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                >
                                    <option value="">-- Seleccione Seguro --</option>
                                    {Number(clinicaSeleccionada) === 1 && (
                                        <>
                                            <option value="BISA">BISA</option>
                                            <option value="PRIVADO">PRIVADO</option>
                                        </>
                                    )}
                                    {Number(clinicaSeleccionada) === 2 && (
                                        <>
                                            <option value="ALIANZA GOLD">ALIANZA GOLD</option>
                                            <option value="ALIANZA SILVER">ALIANZA SILVER</option>
                                            <option value="ALIANZA ODONT.">ALIANZA ODONT.</option>
                                            <option value="PRIVADO">PRIVADO</option>
                                        </>
                                    )}
                                    {Number(clinicaSeleccionada) === 3 && (
                                        <>
                                            <option value="NACIONAL VIDA">NACIONAL VIDA</option>
                                            <option value="PRIVADO">PRIVADO</option>
                                        </>
                                    )}
                                    {![1, 2, 3].includes(Number(clinicaSeleccionada)) && (
                                        <option value="PRIVADO">PRIVADO</option>
                                    )}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Vencimiento Seguro:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleChange} className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* Contacto */}
                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Contacto</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Dirección: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} required placeholder="Dirección completa..."
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Teléfono:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 4-440000"
                                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Celular: <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="py-2 px-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        {countryCodes.map(c => (
                                            <option key={c.code} value={c.code}>{c.label}</option>
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
                                            value={localCelular}
                                            onChange={(e) => setLocalCelular(e.target.value)}
                                            required
                                            placeholder="Ej: 70012345"
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Email:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Ej: correo@ejemplo.com"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Lugar de Residencia: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="lugar_residencia" value={formData.lugar_residencia} onChange={handleChange} required placeholder="Ej: Cochabamba"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Profesión u ocupación <span className="text-red-500">*</span>:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                </svg>
                                <input type="text" name="profesion" value={formData.profesion} onChange={handleChange} required placeholder="Ej: Arquitecto"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>



                {/* Responsable */}
                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Responsable <span className="text-sm font-normal text-gray-500 ml-1">(En caso de ser menor de 18 años)</span></legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Nombre Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="responsable" value={formData.responsable} onChange={handleChange} placeholder="Ej: María Gómez"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Parentesco:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <input type="text" name="parentesco" value={formData.parentesco} onChange={handleChange} placeholder="Ej: Madre"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Dirección Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="direccion_responsable" value={formData.direccion_responsable} onChange={handleChange} placeholder="Dirección completa..."
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Teléfono Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                <input type="text" name="telefono_responsable" value={formData.telefono_responsable} onChange={handleChange} placeholder="Ej: 70012345"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block dark:placeholder-gray-400"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>


                {/* Historial y Motivo de Consulta */}
                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Consulta</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">¿Cuándo fue su última visita al odontólogo? <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <textarea name="fichaMedica.ultima_visita_odontologo" value={formData.fichaMedica.ultima_visita_odontologo} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Ej: Hace 6 meses..."></textarea>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">Motivo de consulta: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                <textarea name="fichaMedica.motivo_consulta" value={formData.fichaMedica.motivo_consulta} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Ingrese una descripción..."></textarea>
                            </div>
                        </div>

                        {/* Clasificación moved here */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
                                        Clasificación del Paciente (Letra):
                                    </label>
                                    <div className="flex gap-4">
                                        {['A', 'B', 'C'].map((cat) => (
                                            <label key={cat} className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg border-2 cursor-pointer transition-all ${formData.clasificacion.charAt(0) === cat
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-300'
                                                }`}>
                                                <input
                                                    type="radio"
                                                    name="clasificacion_letra"
                                                    value={cat}
                                                    checked={formData.clasificacion.charAt(0) === cat}
                                                    onChange={(e) => {
                                                        const num = formData.clasificacion.substring(1) || '0';
                                                        setFormData(prev => ({ ...prev, clasificacion: e.target.value + num }));
                                                    }}
                                                    className="hidden"
                                                />
                                                <span className="text-lg font-bold">{cat}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                        <span>Nivel (0-10):</span>
                                        <span className="text-lg font-bold px-3 py-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                            {formData.clasificacion.substring(1)} / 10
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        name="clasificacion_numero"
                                        min="0"
                                        max="10"
                                        step="1"
                                        value={formData.clasificacion.substring(1)}
                                        onChange={(e) => {
                                            const letra = formData.clasificacion.charAt(0) || 'A';
                                            setFormData(prev => ({ ...prev, clasificacion: letra + e.target.value }));
                                        }}
                                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* Ficha Medica Title */}
                <div className="mt-8 mb-2 pb-2 border-b-2 border-blue-500">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        Ficha Médica
                    </h3>
                </div>
                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Antecedentes Patológicos Personales</legend>
                    <div className="space-y-4 mt-2">
                        {/* Bruxismo */}
                        <SiNoSelector
                            name="fichaMedica.bruxismo"
                            value={formData.fichaMedica.bruxismo}
                            onChange={handleSiNoChange}
                            label="- ¿Ha sido diagnosticado antes con bruxismo? (Acto repetitivo de apretar y/o rechinar los dientes)."
                        />

                        {/* Alergias */}
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.alergia_medicamento"
                                value={formData.fichaMedica.alergia_medicamento}
                                onChange={handleSiNoChange}
                                label="- ¿Tiene alergia a algún medicamento?"
                            />
                            {formData.fichaMedica.alergia_medicamento && (
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.alergia_medicamento_detalle" placeholder="Especifique..." value={formData.fichaMedica.alergia_medicamento_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        {/* Medicamento 72h */}
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.medicamento_72h"
                                value={formData.fichaMedica.medicamento_72h}
                                onChange={handleSiNoChange}
                                label="- ¿Ha tomado algún medicamento en las últimas 72 horas?"
                            />
                            {formData.fichaMedica.medicamento_72h && (
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.medicamento_72h_detalle" placeholder="Medicamento y motivo..." value={formData.fichaMedica.medicamento_72h_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        {/* Tratamiento Médico */}
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.tratamiento_medico"
                                value={formData.fichaMedica.tratamiento_medico}
                                onChange={handleSiNoChange}
                                label="- ¿Actualmente está con algún tratamiento médico?"
                            />
                            {formData.fichaMedica.tratamiento_medico && (
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.tratamiento_medico_detalle" placeholder="¿Por qué motivo?..." value={formData.fichaMedica.tratamiento_medico_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        {/* Anestesia Anterior */}
                        <SiNoSelector
                            name="fichaMedica.anestesiado_anteriormente"
                            value={formData.fichaMedica.anestesiado_anteriormente}
                            onChange={handleSiNoChange}
                            label="- ¿Ha sido anestesiado anteriormente en consultorio odontológico?"
                        />

                        {/* Reacción Anestesia */}
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.reaccion_anestesia"
                                value={formData.fichaMedica.reaccion_anestesia}
                                onChange={handleSiNoChange}
                                label="- ¿Tuvo alguna reacción desfavorable al ser anestesiado?"
                            />
                            {formData.fichaMedica.reaccion_anestesia && (
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.reaccion_anestesia_detalle" placeholder="Especifique..." value={formData.fichaMedica.reaccion_anestesia_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Enfermedades</legend>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Marque y especifique si padece de alguna de las siguientes:</p>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="font-bold text-gray-700 dark:text-gray-300 mb-4">- ¿Padece o ha padecido alguna de las siguientes enfermedades?</p>

                        <div className="grid grid-cols-1 gap-y-2 ml-4">
                            {/* Neurológicas */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.enf_neurologicas"
                                    value={formData.fichaMedica.enf_neurologicas}
                                    onChange={handleSiNoChange}
                                    label="- ¿Enfermedades neurológicas?"
                                />
                                {formData.fichaMedica.enf_neurologicas && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.enf_neurologicas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_neurologicas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Pulmonares */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.enf_pulmonares"
                                    value={formData.fichaMedica.enf_pulmonares}
                                    onChange={handleSiNoChange}
                                    label="- ¿Enfermedades pulmonares?"
                                />
                                {formData.fichaMedica.enf_pulmonares && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.enf_pulmonares_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_pulmonares_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Cardíacas */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.enf_cardiacas"
                                    value={formData.fichaMedica.enf_cardiacas}
                                    onChange={handleSiNoChange}
                                    label="- ¿Enfermedades cardiacas?"
                                />
                                {formData.fichaMedica.enf_cardiacas && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.enf_cardiacas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_cardiacas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Hígado */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.enf_higado"
                                    value={formData.fichaMedica.enf_higado}
                                    onChange={handleSiNoChange}
                                    label="- ¿Enfermedades en el hígado?"
                                />
                                {formData.fichaMedica.enf_higado && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.enf_higado_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_higado_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Gástricas */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.enf_gastricas"
                                    value={formData.fichaMedica.enf_gastricas}
                                    onChange={handleSiNoChange}
                                    label="- ¿Enfermedades gástricas?"
                                />
                                {formData.fichaMedica.enf_gastricas && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.enf_gastricas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_gastricas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Venéreas */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.enf_venereas"
                                    value={formData.fichaMedica.enf_venereas}
                                    onChange={handleSiNoChange}
                                    label="- ¿Enfermedades venéreas?"
                                />
                                {formData.fichaMedica.enf_venereas && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.enf_venereas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_venereas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Renales */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.enf_renales"
                                    value={formData.fichaMedica.enf_renales}
                                    onChange={handleSiNoChange}
                                    label="- ¿Enfermedades renales?"
                                />
                                {formData.fichaMedica.enf_renales && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.enf_renales_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_renales_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Articulaciones */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.articulaciones"
                                    value={formData.fichaMedica.articulaciones}
                                    onChange={handleSiNoChange}
                                    label="- ¿Problemas con las articulaciones?"
                                />
                                {formData.fichaMedica.articulaciones && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.articulaciones_detalle" placeholder="Especifique..." value={formData.fichaMedica.articulaciones_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Diabetes */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.diabetes"
                                    value={formData.fichaMedica.diabetes}
                                    onChange={handleSiNoChange}
                                    label="- ¿Diabetes?"
                                />
                                {formData.fichaMedica.diabetes && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.diabetes_detalle" placeholder="Tipo / tratamiento..." value={formData.fichaMedica.diabetes_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Anemia */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.anemia"
                                    value={formData.fichaMedica.anemia}
                                    onChange={handleSiNoChange}
                                    label="- ¿Anemia?"
                                />
                                {formData.fichaMedica.anemia && (
                                    <div className="ml-4 mt-2 p-2 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500">
                                        <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cuál:</label>
                                        <input type="text" name="fichaMedica.anemia_detalle" placeholder="Especifique..." value={formData.fichaMedica.anemia_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                )}
                            </div>

                            {/* Hipertensión */}
                            <SiNoSelector
                                name="fichaMedica.hipertension"
                                value={formData.fichaMedica.hipertension}
                                onChange={handleSiNoChange}
                                label="- ¿Hipertensión arterial? (Presión Arterial Alta)"
                            />

                            {/* Hipotensión */}
                            <SiNoSelector
                                name="fichaMedica.hipotension"
                                value={formData.fichaMedica.hipotension}
                                onChange={handleSiNoChange}
                                label="- ¿Hipotensión arterial? (Presión Arterial Baja)"
                            />

                            {/* VIH */}
                            <div className="flex flex-col">
                                <SiNoSelector
                                    name="fichaMedica.prueba_vih"
                                    value={formData.fichaMedica.prueba_vih}
                                    onChange={handleSiNoChange}
                                    label="- ¿Alguna vez le hicieron la prueba del VIH?"
                                />
                                {formData.fichaMedica.prueba_vih && (
                                    <div className="ml-4 mt-2 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500 flex items-center gap-4">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">*Resultado de prueba:</label>
                                        <select name="fichaMedica.prueba_vih_resultado" value={formData.fichaMedica.prueba_vih_resultado || ''} onChange={handleChange} className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- Seleccione --</option>
                                            <option value="Positivo">Positivo</option>
                                            <option value="Negativo">Negativo</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Antecedentes ginecológicos</legend>
                    <div className="space-y-2 mt-2">
                        {/* Anticonceptivo */}
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.anticonceptivo_hormonal"
                                value={formData.fichaMedica.anticonceptivo_hormonal}
                                onChange={handleSiNoChange}
                                label="- ¿Usa algún método anticonceptivo hormonal?"
                            />
                            {formData.fichaMedica.anticonceptivo_hormonal && (
                                <div className="ml-4 mt-2 p-3 bg-pink-50/50 dark:bg-pink-900/10 rounded-lg border-l-4 border-pink-500">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique cual:</label>
                                    <input type="text" name="fichaMedica.anticonceptivo_hormonal_detalle" placeholder="Especifique..." value={formData.fichaMedica.anticonceptivo_hormonal_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        {/* Embarazo */}
                        <SiNoSelector
                            name="fichaMedica.posibilidad_embarazo"
                            value={formData.fichaMedica.posibilidad_embarazo}
                            onChange={handleSiNoChange}
                            label="- ¿Existe la posibilidad de que actualmente esté embarazada?"
                        />

                        {/* Semana Gestación */}
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.esta_gestando"
                                value={!!formData.fichaMedica.semana_gestacion}
                                onChange={(name, val) => {
                                    if (!val) setFormData(prev => ({ ...prev, fichaMedica: { ...prev.fichaMedica, semana_gestacion: '' } }));
                                    else setFormData(prev => ({ ...prev, fichaMedica: { ...prev.fichaMedica, semana_gestacion: '1' } }));
                                }}
                                label="- ¿En qué semana de gestación se encuentra?"
                            />
                            {formData.fichaMedica.semana_gestacion && (
                                <div className="ml-4 mt-2 p-3 bg-pink-50/50 dark:bg-pink-900/10 rounded-lg border-l-4 border-pink-500">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*Indique semana:</label>
                                    <input type="text" name="fichaMedica.semana_gestacion" placeholder="Semana..." value={formData.fichaMedica.semana_gestacion} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border border-gray-300 dark:border-gray-700 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700 dark:text-gray-300">Hábitos</legend>
                    <div className="space-y-2 mt-2">
                        {/* Cepillado */}
                        <div className="py-2 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <label className="text-sm text-gray-700 dark:text-gray-300">- ¿Cuántas veces al día se cepilla los dientes?</label>
                            <input type="text" name="fichaMedica.cepillado_veces" value={formData.fichaMedica.cepillado_veces} onChange={handleChange} placeholder="Ej. 2 a 3 veces" className="w-full md:w-48 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        {/* Hilo Dental */}
                        <SiNoSelector
                            name="fichaMedica.usa_hilo_dental"
                            value={formData.fichaMedica.usa_hilo_dental}
                            onChange={handleSiNoChange}
                            label="- ¿Usa hilo dental?"
                        />

                        {/* Enjuague */}
                        <SiNoSelector
                            name="fichaMedica.usa_enjuague"
                            value={formData.fichaMedica.usa_enjuague}
                            onChange={handleSiNoChange}
                            label="- ¿Usa enjuague bucal?"
                        />

                        {/* Fuma */}
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.fuma"
                                value={formData.fichaMedica.fuma}
                                onChange={handleSiNoChange}
                                label="- ¿Fuma?"
                            />
                            {formData.fichaMedica.fuma && (
                                <div className="ml-4 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-gray-400">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1 uppercase">*¿Cuántos cigarrillos al día o semana?:</label>
                                    <input type="text" name="fichaMedica.fuma_cantidad" placeholder="Especifique..." value={formData.fichaMedica.fuma_cantidad} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        {/* Cítricos */}
                        <SiNoSelector
                            name="fichaMedica.consume_citricos"
                            value={formData.fichaMedica.consume_citricos}
                            onChange={handleSiNoChange}
                            label="- ¿Consume alimentos cítricos/ácidos a diario o más de 3 veces por semana?"
                        />
                    </div>
                </fieldset>

                <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Observaciones Generales:</label>
                    <textarea name="fichaMedica.observaciones" value={formData.fichaMedica.observaciones} onChange={handleChange} placeholder="Anotar cualquier observación vital que el Doctor deba saber..." className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSaveAndSign}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 text-lg rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {isEditing ? 'Firmar Ficha' : 'Guardar y Firmar Ficha'}
                    </button>
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
                        {isEditing ? 'Actualizar' : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/pacientes')}
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
                title="Manual - Pacientes"
                sections={manualSections}
            />

            {/* Signature Modal */}
            {showSignatureModal && id && (
                <SignatureModal
                    isOpen={showSignatureModal}
                    onClose={() => setShowSignatureModal(false)}
                    tipoDocumento="historia_clinica"
                    documentoId={parseInt(id || '0')}
                    rolFirmante="paciente"
                    hideHistory={true}
                    closeOnSuccess={true}
                    onSuccess={() => navigate('/pacientes')}
                />
            )}
        </div>
    );
};

export default PacienteForm;
