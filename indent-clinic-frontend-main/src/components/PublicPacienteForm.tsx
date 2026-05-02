import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import api from '../services/api';
import Swal from 'sweetalert2';
import SignatureCanvas from './SignatureCanvas';
import { CheckCircle } from 'lucide-react';
import { getLocalDateString } from '../utils/dateUtils';
import SiNoSelector from './SiNoSelector';

const PublicPacienteForm: React.FC = () => {
    const { idOrSlug } = useParams<{ idOrSlug?: string }>();
    const navigate = useNavigate();

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

    const [resolvedClinicaId, setResolvedClinicaId] = useState<number | null>(null);
    const [clinicaData, setClinicaData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const isEditing = false;
    const [currentStep, setCurrentStep] = useState<'form' | 'signature' | 'success'>('form');
    const [newPatientId, setNewPatientId] = useState<number | null>(null);

    // --- Patient search dedup state ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
        responsable: '',
        parentesco: '',
        direccion_responsable: '',
        telefono_responsable: '',
        fecha_vencimiento: '',

        ci: '',
        lugar_residencia: '',
        estado: 'activo',
        clasificacion: 'A0',
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
        const initClinica = async () => {
            try {
                let matchedClinica = null;
                if (idOrSlug) {
                    const isNumeric = /^\d+$/.test(idOrSlug);
                    if (isNumeric) {
                        const response = await api.get(`/clinicas/${idOrSlug}`);
                        matchedClinica = response.data;
                    } else {
                        const response = await api.get(`/clinicas/slug/${idOrSlug}`);
                        matchedClinica = response.data;
                    }
                }
                
                if (matchedClinica) {
                    setResolvedClinicaId(matchedClinica.id);
                    setClinicaData(matchedClinica);
                } else {
                    setResolvedClinicaId(1);
                }
            } catch (error) {
                console.error('Error resolving clinica:', error);
                setResolvedClinicaId(1);
            } finally {
                setLoading(false);
            }
        };
        initClinica();
    }, [idOrSlug]);

    const handlePatientSearch = async (query: string) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!query.trim() || query.trim().length < 2) {
            setSearchResults([]);
            setShowSearchPanel(false);
            return;
        }
        searchTimeout.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const clinicaParam = resolvedClinicaId ? `&clinicaId=${resolvedClinicaId}` : '';
                const res = await api.get(`/pacientes?page=1&limit=8&search=${encodeURIComponent(query)}${clinicaParam}`);
                const data = Array.isArray(res.data.data) ? res.data.data : [];
                setSearchResults(data);
                setShowSearchPanel(true);
            } catch (_) {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 350);
    };

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const finalCelular = countryCode === '+0' ? localCelular : `${countryCode}${localCelular}`;
            const payload = { 
                ...formData, 
                celular: finalCelular,
                clinicaId: resolvedClinicaId || 1
            };
            
            const response = await api.post('/pacientes', payload);
            const createdId = response.data.id;
            
            if (createdId) {
                setNewPatientId(createdId);
                setCurrentStep('signature');
                window.scrollTo(0, 0);
            } else {
                throw new Error("No se recibió el ID del paciente creado");
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Hubo un error guardando sus datos. Intente nuevamente.';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleSaveSignature = async (signatureData: string) => {
        if (!newPatientId) return;

        try {
            await api.post('/firmas', {
                tipoDocumento: 'paciente',
                documentoId: newPatientId,
                rolFirmante: 'paciente',
                firmaData: signatureData,
                tipoFirma: 'dibujada',
                usuarioId: 1, // Default admin
                timestamp: new Date().toISOString()
            });

            setCurrentStep('success');
            window.scrollTo(0, 0);
        } catch (error: any) {
            console.error("Error salvando firma:", error);
            const errorMsg = error.response?.data?.message || 'No se pudo guardar la firma digital. Intente de nuevo.';
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar Firma',
                text: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (currentStep === 'signature') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
                <div className="w-full max-w-[700px] mb-8">
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
                            <span className="text-gray-400 font-medium line-through">Datos Personales</span>
                        </div>
                        <div className="h-px bg-blue-200 flex-1 mx-4"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                            <span className="text-blue-600 font-bold">Firma Digital</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Casi terminamos</h2>
                            <p className="text-gray-500 mt-2">Por favor, realice su firma digital para completar el registro legal de su ficha.</p>
                        </div>
                        
                        <SignatureCanvas 
                            onSave={handleSaveSignature} 
                            onCancel={() => setCurrentStep('form')} 
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (currentStep === 'success') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-10 px-4">
                <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-xl p-10 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-4">¡Registro Exitoso!</h2>
                    <p className="text-gray-600 text-lg mb-8">
                        Muchas gracias por completar su registro y firmar su ficha médica. <br/>
                        Ya puede pasar a sala de espera, lo llamaremos enseguida.
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg active:scale-95"
                    >
                        Finalizar
                    </button>
                    <p className="mt-6 text-sm text-gray-400">La página se reiniciará automáticamente para el siguiente paciente.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-[700px] bg-white rounded-xl shadow-lg p-6 md:p-8">
            <div className="flex items-start justify-between mb-8">
                <div className="text-center flex-1">
                    {clinicaData?.logo ? (
                        <img src={clinicaData.logo} alt="Logo Clínica" className="h-20 mx-auto mb-4 object-contain" />
                    ) : (
                        <h1 className="text-3xl font-bold text-blue-600 mb-2">{clinicaData?.nombre || 'CLINICA DENTAL'}</h1>
                    )}
                    <p className="text-gray-500">Formulario de Ingreso de Paciente Nuevo</p>
                    {clinicaData?.nombre && clinicaData.logo && (
                        <p className="text-blue-600 font-bold mt-1 text-lg">{clinicaData.nombre}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-6 leading-relaxed italic bg-blue-50/30 p-4 rounded-lg shadow-sm">
                        "Toda la información proporcionada en este documento es confidencial y de uso exclusivo de la clínica <strong>{clinicaData?.nombre || 'la clínica'}</strong> para fines terapéuticos."
                    </p>
                </div>

                <div className="relative flex-shrink-0 ml-4" style={{ minWidth: '220px' }}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">🔍 ¿Ya está registrado?</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handlePatientSearch(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSearchPanel(true)}
                            placeholder="Buscar por nombre o CI..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-blue-300 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {isSearching && (
                            <svg className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        )}
                    </div>

                    {showSearchPanel && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                            {searchResults.length === 0 && !isSearching ? (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">No se encontraron coincidencias</div>
                            ) : (
                                <>
                                    <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100">
                                        <p className="text-xs text-amber-700 font-semibold">⚠️ Pacientes ya registrados</p>
                                    </div>
                                    <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                                        {searchResults.map((p: any) => (
                                            <li key={p.id} className="px-3 py-2.5 hover:bg-blue-50 transition-colors">
                                                <div className="font-semibold text-sm text-gray-800">{p.paterno} {p.materno} {p.nombre}</div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    {p.ci && <span className="text-xs text-gray-500">CI: {p.ci}</span>}
                                                    {p.celular && <span className="text-xs text-gray-500">📱 {p.celular}</span>}
                                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                                        p.estado === 'activo'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-600'
                                                    }`}>{p.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <button
                                onClick={() => { setShowSearchPanel(false); setSearchQuery(''); setSearchResults([]); }}
                                className="w-full py-1.5 text-xs text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border-t border-blue-100 font-semibold"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5">
                 <fieldset className="border border-gray-300 p-4 rounded-lg">
                    <legend className="font-bold px-2 text-gray-600">Datos Personales</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Paterno: <span className="text-red-500">*</span></label>
                             <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="paterno" value={formData.paterno} onChange={handleChange} required placeholder="Ej: Pérez"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Materno: <span className="text-xs font-normal text-gray-400">(opcional)</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="materno" value={formData.materno} onChange={handleChange} placeholder="Ej: Gómez"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Nombre: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Juan"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Fecha Nacimiento: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Sexo: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <select name="sexo" value={formData.sexo} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Estado Civil: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                    <option value="" disabled>-- Seleccione --</option>
                                    <option value="Soltero">Soltero(a)</option>
                                    <option value="Casado">Casado(a)</option>
                                    <option value="Divorciado">Divorciado(a)</option>
                                    <option value="Viudo">Viudo(a)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">C.I. {calculateAge(formData.fecha_nacimiento) >= 18 && <span className="text-red-500">*</span>}:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                </svg>
                                <input type="text" name="ci" value={formData.ci} onChange={handleChange} required={calculateAge(formData.fecha_nacimiento) >= 18} placeholder="Cédula de Identidad..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Seguro: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                </svg>
                                <select 
                                    name="seguro_medico" 
                                    value={formData.seguro_medico} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                >
                                    <option value="">-- Seleccione Seguro --</option>
                                    {Number(resolvedClinicaId) === 1 && (
                                        <>
                                            <option value="BISA">BISA</option>
                                            <option value="PRIVADO">PRIVADO</option>
                                        </>
                                    )}
                                    {Number(resolvedClinicaId) === 2 && (
                                        <>
                                            <option value="ALIANZA GOLD">ALIANZA GOLD</option>
                                            <option value="ALIANZA SILVER">ALIANZA SILVER</option>
                                            <option value="ALIANZA ODONT.">ALIANZA ODONT.</option>
                                            <option value="PRIVADO">PRIVADO</option>
                                        </>
                                    )}
                                    {Number(resolvedClinicaId) === 3 && (
                                        <>
                                            <option value="NACIONAL VIDA">NACIONAL VIDA</option>
                                            <option value="PRIVADO">PRIVADO</option>
                                        </>
                                    )}
                                    {![1, 2, 3].includes(Number(resolvedClinicaId)) && (
                                        <option value="PRIVADO">PRIVADO</option>
                                    )}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Vencimiento Seguro:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleChange} className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                </fieldset>

                 <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-600">Contacto</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className="block mb-1 font-medium text-gray-700">Dirección: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} required placeholder="Dirección completa..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                            <div>
                                 <label className="block mb-1 font-medium text-gray-700">Teléfono:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 4-440000"
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700">Celular: <span className="text-red-500">*</span></label>
                                <div className="flex gap-2">
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="py-2 px-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" disabled>-- Seleccione --</option>
                                        {countryCodes.map(c => (
                                            <option key={c.code} value={c.code}>{c.label}</option>
                                        ))}
                                    </select>
                                    <div className="relative flex-1">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                             <label className="block mb-1 font-medium text-gray-700">Email:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Ej: correo@ejemplo.com"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                         <div>
                            <label className="block mb-1 font-medium text-gray-700">Lugar de Residencia: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="lugar_residencia" value={formData.lugar_residencia} onChange={handleChange} required placeholder="Ej: Cochabamba"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Profesión u ocupación: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                </svg>
                                <input type="text" name="profesion" value={formData.profesion} onChange={handleChange} required placeholder="Ej: Arquitecto"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>

                 <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-600">Responsable <span className="text-sm font-normal text-gray-500 ml-1">(En caso de ser menor de 18 años)</span></legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Nombre Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <input type="text" name="responsable" value={formData.responsable} onChange={handleChange} placeholder="Ej: María Gómez"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Parentesco:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <input type="text" name="parentesco" value={formData.parentesco} onChange={handleChange} placeholder="Ej: Madre"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Dirección Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <input type="text" name="direccion_responsable" value={formData.direccion_responsable} onChange={handleChange} placeholder="Dirección completa..."
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium text-gray-700">Teléfono Responsable:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                </svg>
                                <input type="text" name="telefono_responsable" value={formData.telefono_responsable} onChange={handleChange} placeholder="Ej: 70012345"
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 block"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>

                 <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-600">Consulta</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block mb-1 font-medium text-gray-700">¿Cuándo fue su última visita al odontólogo? <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-gray-400">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <textarea name="fichaMedica.ultima_visita_odontologo" value={formData.fichaMedica.ultima_visita_odontologo} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Ej: Hace 6 meses..."></textarea>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block mb-1 font-medium text-gray-700">Motivo de consulta: <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-gray-400">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                <textarea name="fichaMedica.motivo_consulta" value={formData.fichaMedica.motivo_consulta} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Ingrese una descripción..."></textarea>
                            </div>
                        </div>
                    </div>
                </fieldset>

                <div className="mt-8 mb-2 pb-2 border-b-2 border-blue-500">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-blue-600">
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

                <fieldset className="border border-gray-300 p-4 rounded-lg">
                    <legend className="font-bold px-2 text-gray-700">Antecedentes Patológicos Personales</legend>
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
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.alergia_medicamento_detalle" placeholder="Especifique..." value={formData.fichaMedica.alergia_medicamento_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.medicamento_72h_detalle" placeholder="Medicamento y motivo..." value={formData.fichaMedica.medicamento_72h_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.tratamiento_medico_detalle" placeholder="¿Por qué motivo?..." value={formData.fichaMedica.tratamiento_medico_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                    <input type="text" name="fichaMedica.reaccion_anestesia_detalle" placeholder="Especifique..." value={formData.fichaMedica.reaccion_anestesia_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <p className="font-bold text-gray-700 mb-4">- ¿Padece o ha padecido alguna de las siguientes enfermedades?</p>

                            <div className="grid grid-cols-1 gap-y-2 ml-4">
                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.enf_neurologicas"
                                        value={formData.fichaMedica.enf_neurologicas}
                                        onChange={handleSiNoChange}
                                        label="- ¿Enfermedades neurológicas?"
                                    />
                                    {formData.fichaMedica.enf_neurologicas && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.enf_neurologicas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_neurologicas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.enf_pulmonares"
                                        value={formData.fichaMedica.enf_pulmonares}
                                        onChange={handleSiNoChange}
                                        label="- ¿Enfermedades pulmonares?"
                                    />
                                    {formData.fichaMedica.enf_pulmonares && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.enf_pulmonares_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_pulmonares_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.enf_cardiacas"
                                        value={formData.fichaMedica.enf_cardiacas}
                                        onChange={handleSiNoChange}
                                        label="- ¿Enfermedades cardiacas?"
                                    />
                                    {formData.fichaMedica.enf_cardiacas && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.enf_cardiacas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_cardiacas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.enf_higado"
                                        value={formData.fichaMedica.enf_higado}
                                        onChange={handleSiNoChange}
                                        label="- ¿Enfermedades en el hígado?"
                                    />
                                    {formData.fichaMedica.enf_higado && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.enf_higado_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_higado_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.enf_gastricas"
                                        value={formData.fichaMedica.enf_gastricas}
                                        onChange={handleSiNoChange}
                                        label="- ¿Enfermedades gástricas?"
                                    />
                                    {formData.fichaMedica.enf_gastricas && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.enf_gastricas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_gastricas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.enf_venereas"
                                        value={formData.fichaMedica.enf_venereas}
                                        onChange={handleSiNoChange}
                                        label="- ¿Enfermedades venéreas?"
                                    />
                                    {formData.fichaMedica.enf_venereas && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.enf_venereas_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_venereas_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.enf_renales"
                                        value={formData.fichaMedica.enf_renales}
                                        onChange={handleSiNoChange}
                                        label="- ¿Enfermedades renales?"
                                    />
                                    {formData.fichaMedica.enf_renales && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.enf_renales_detalle" placeholder="Especifique..." value={formData.fichaMedica.enf_renales_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.articulaciones"
                                        value={formData.fichaMedica.articulaciones}
                                        onChange={handleSiNoChange}
                                        label="- ¿Problemas con las articulaciones?"
                                    />
                                    {formData.fichaMedica.articulaciones && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.articulaciones_detalle" placeholder="Especifique..." value={formData.fichaMedica.articulaciones_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.diabetes"
                                        value={formData.fichaMedica.diabetes}
                                        onChange={handleSiNoChange}
                                        label="- ¿Diabetes?"
                                    />
                                    {formData.fichaMedica.diabetes && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.diabetes_detalle" placeholder="Tipo / tratamiento..." value={formData.fichaMedica.diabetes_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.anemia"
                                        value={formData.fichaMedica.anemia}
                                        onChange={handleSiNoChange}
                                        label="- ¿Anemia?"
                                    />
                                    {formData.fichaMedica.anemia && (
                                        <div className="ml-4 mt-2 p-2 bg-blue-50/30 rounded-lg border-l-4 border-blue-500">
                                            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">*Indique cuál:</label>
                                            <input type="text" name="fichaMedica.anemia_detalle" placeholder="Especifique..." value={formData.fichaMedica.anemia_detalle} onChange={handleChange} className="w-full px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <SiNoSelector
                                    name="fichaMedica.hipertension"
                                    value={formData.fichaMedica.hipertension}
                                    onChange={handleSiNoChange}
                                    label="- ¿Hipertensión arterial? (Presión Arterial Alta)"
                                />

                                <SiNoSelector
                                    name="fichaMedica.hipotension"
                                    value={formData.fichaMedica.hipotension}
                                    onChange={handleSiNoChange}
                                    label="- ¿Hipotensión arterial? (Presión Arterial Baja)"
                                />

                                <div className="flex flex-col">
                                    <SiNoSelector
                                        name="fichaMedica.prueba_vih"
                                        value={formData.fichaMedica.prueba_vih}
                                        onChange={handleSiNoChange}
                                        label="- ¿Alguna vez le hicieron la prueba del VIH?"
                                    />
                                    {formData.fichaMedica.prueba_vih && (
                                        <div className="ml-4 mt-2 p-3 bg-blue-50/50 rounded-lg border-l-4 border-blue-500 flex items-center gap-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter">*Resultado de prueba:</label>
                                            <select name="fichaMedica.prueba_vih_resultado" value={formData.fichaMedica.prueba_vih_resultado || ''} onChange={handleChange} className="px-3 py-1 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                                <option value="">-- Seleccione --</option>
                                                <option value="Positivo">Positivo</option>
                                                <option value="Negativo">Negativo</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700">Antecedentes ginecológicos</legend>
                    <div className="space-y-2 mt-2">
                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.anticonceptivo_hormonal"
                                value={formData.fichaMedica.anticonceptivo_hormonal}
                                onChange={handleSiNoChange}
                                label="- ¿Usa algún método anticonceptivo hormonal?"
                            />
                            {formData.fichaMedica.anticonceptivo_hormonal && (
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">*Indique cual:</label>
                                    <input type="text" name="fichaMedica.anticonceptivo_hormonal_detalle" placeholder="Especifique..." value={formData.fichaMedica.anticonceptivo_hormonal_detalle} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        <SiNoSelector
                            name="fichaMedica.posibilidad_embarazo"
                            value={formData.fichaMedica.posibilidad_embarazo}
                            onChange={handleSiNoChange}
                            label="- ¿Existe la posibilidad de que actualmente esté embarazada?"
                        />

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
                                <div className="ml-4 mt-2 p-3 bg-blue-50/50 rounded-lg border-l-4 border-blue-500">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">*Indique semana:</label>
                                    <input type="text" name="fichaMedica.semana_gestacion" placeholder="Semana..." value={formData.fichaMedica.semana_gestacion} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border border-gray-300 p-4 rounded-lg mt-4">
                    <legend className="font-bold px-2 text-gray-700">Hábitos</legend>
                    <div className="space-y-2 mt-2">
                        <div className="py-2 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <label className="text-sm text-gray-700">- ¿Cuántas veces al día se cepilla los dientes?</label>
                            <input type="text" name="fichaMedica.cepillado_veces" value={formData.fichaMedica.cepillado_veces} onChange={handleChange} placeholder="Ej. 2 a 3 veces" className="w-full md:w-48 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <SiNoSelector
                            name="fichaMedica.usa_hilo_dental"
                            value={formData.fichaMedica.usa_hilo_dental}
                            onChange={handleSiNoChange}
                            label="- ¿Usa hilo dental?"
                        />

                        <SiNoSelector
                            name="fichaMedica.usa_enjuague"
                            value={formData.fichaMedica.usa_enjuague}
                            onChange={handleSiNoChange}
                            label="- ¿Usa enjuague bucal?"
                        />

                        <div className="flex flex-col">
                            <SiNoSelector
                                name="fichaMedica.fuma"
                                value={formData.fichaMedica.fuma}
                                onChange={handleSiNoChange}
                                label="- ¿Fuma?"
                            />
                            {formData.fichaMedica.fuma && (
                                <div className="ml-4 mt-2 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400">
                                    <label className="text-xs font-bold text-gray-500 block mb-1 uppercase">*¿Cuántos cigarrillos al día o semana?:</label>
                                    <input type="text" name="fichaMedica.fuma_cantidad" placeholder="Especifique..." value={formData.fichaMedica.fuma_cantidad} onChange={handleChange} className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            )}
                        </div>

                        <SiNoSelector
                            name="fichaMedica.consume_citricos"
                            value={formData.fichaMedica.consume_citricos}
                            onChange={handleSiNoChange}
                            label="- ¿Consume alimentos cítricos/ácidos a diario o más de 3 veces por semana?"
                        />
                    </div>
                </fieldset>

                <div className="mt-4">
                    <label className="block mb-2 font-medium text-gray-700">Observaciones Generales:</label>
                    <textarea name="fichaMedica.observaciones" value={formData.fichaMedica.observaciones} onChange={handleChange} placeholder="Anotar cualquier observación vital que el Doctor deba saber..." className="w-full p-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                </div>

                <div className="flex justify-center mt-8 pt-6 border-t border-gray-200">
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg text-lg w-full md:w-auto transition-transform hover:-translate-y-1 shadow-md">
                        Enviar Datos y Completar Registro
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
};

export default PublicPacienteForm;
