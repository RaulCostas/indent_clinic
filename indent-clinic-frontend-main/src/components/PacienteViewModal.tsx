import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Paciente } from '../types';
import { formatDate } from '../utils/dateUtils';
import { User, FileText, Phone, MapPin, Shield, Heart, AlertCircle } from 'lucide-react';

interface PacienteViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    pacienteId: number | null;
}

const PacienteViewModal: React.FC<PacienteViewModalProps> = ({ isOpen, onClose, pacienteId }) => {
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'medica'>('personal');

    useEffect(() => {
        if (isOpen && pacienteId) {
            setLoading(true);
            setActiveTab('personal');
            api.get<Paciente>(`/pacientes/${pacienteId}`)
                .then(res => setPaciente(res.data))
                .catch(err => console.error('Error loading patient:', err))
                .finally(() => setLoading(false));
        } else {
            setPaciente(null);
        }
    }, [isOpen, pacienteId]);

    if (!isOpen) return null;

    const ficha = (paciente as any)?.fichaMedica;

    const calcularEdad = (fecha: string | undefined) => {
        if (!fecha) return '';
        const hoy = new Date();
        const nac = new Date(fecha);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return `${edad} años`;
    };

    const Field = ({ label, value }: { label: string; value?: string | null }) => (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 dark:text-gray-100 font-medium border-b border-dashed border-gray-200 dark:border-gray-700 pb-1 min-h-[22px]">
                {value || <span className="text-gray-400 dark:text-gray-600 font-normal italic">—</span>}
            </span>
        </div>
    );

    const CheckItem = ({ label, value }: { label: string; value: boolean | undefined }) => (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            value
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700'
        }`}>
            <span className="text-base">{value ? '☑' : '☐'}</span>
            {label}
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex items-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <User size={22} />
                        </div>
                        <div>
                            {loading ? (
                                <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
                            ) : (
                                <>
                                    <h2 className="text-lg font-bold leading-tight">
                                        {paciente ? `${paciente.paterno} ${paciente.materno} ${paciente.nombre}` : '...'}
                                    </h2>
                                    {paciente?.fecha_nacimiento && (
                                        <p className="text-blue-100 text-sm">{calcularEdad(paciente.fecha_nacimiento)}</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'personal'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                                : 'border-transparent bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        <User size={16} />
                        Datos Personales
                    </button>
                    <button
                        onClick={() => setActiveTab('medica')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
                            activeTab === 'medica'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                                : 'border-transparent bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Heart size={16} />
                        Ficha Médica
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="flex flex-col items-center gap-3 text-gray-400">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm">Cargando información...</span>
                            </div>
                        </div>
                    ) : paciente ? (
                        activeTab === 'personal' ? (
                            <div className="space-y-6">
                                {/* Identificación */}
                                <section>
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                                        <User size={14} /> Datos Personales
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <Field label="Ap. Paterno" value={paciente.paterno} />
                                        <Field label="Ap. Materno" value={paciente.materno} />
                                        <Field label="Nombres" value={paciente.nombre} />
                                        <Field label="Fecha Nacimiento" value={paciente.fecha_nacimiento ? `${formatDate(paciente.fecha_nacimiento)} (${calcularEdad(paciente.fecha_nacimiento)})` : undefined} />
                                        <Field label="Sexo" value={paciente.sexo} />
                                        <Field label="Estado Civil" value={paciente.estado_civil} />
                                        <Field label="C.I. / Documento" value={(paciente as any).ci} />
                                        <Field label="Seguro Médico" value={paciente.seguro_medico} />
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Estado</span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold w-fit mt-0.5 ${
                                                paciente.estado === 'activo'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                            }`}>
                                                {paciente.estado}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                {/* Contacto */}
                                <section>
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                                        <Phone size={14} /> Contacto
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <Field label="Dirección" value={paciente.direccion} />
                                        <Field label="Teléfono" value={paciente.telefono} />
                                        <Field label="Celular" value={paciente.celular} />
                                        <Field label="Email" value={paciente.email} />
                                        <Field label="Lugar de Residencia" value={(paciente as any).lugar_residencia} />
                                        <Field label="Profesión" value={paciente.profesion} />
                                    </div>
                                </section>

                                {/* Responsable */}
                                <section>
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                                        <User size={14} /> Responsable
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <Field label="Nombre Responsable" value={paciente.responsable} />
                                        <Field label="Parentesco" value={paciente.parentesco} />
                                        <Field label="Dirección Responsable" value={paciente.direccion_responsable} />
                                        <Field label="Teléfono Responsable" value={paciente.telefono_responsable} />
                                    </div>
                                </section>

                                {/* Consulta */}
                                <section>
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                                        <FileText size={14} /> Consulta
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="¿Cuándo fue la última vez que visitó al odontólogo, y cuál fue el motivo?" value={`${(paciente as any).fichaMedica?.ultima_visita_odontologo || 'No especificado'} - ${(paciente as any).fichaMedica?.motivo_consulta || 'Sin motivo'}`} />
                                        <Field label="Motivo de Consulta" value={paciente.motivo} />
                                    </div>
                                </section>
                            </div>
                        ) : (
                            /* TAB: Ficha Médica */
                            ficha ? (
                                <div className="space-y-6">
                                    {/* Antecedentes Patológicos */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-3">
                                            <AlertCircle size={14} /> Antecedentes Patológicos
                                        </h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                            <CheckItem label="Bruxismo" value={ficha.bruxismo} />
                                            <CheckItem label="Alergia a Medicamento" value={ficha.alergia_medicamento} />
                                            <CheckItem label="Medicamento últimas 72h" value={ficha.medicamento_72h} />
                                            <CheckItem label="Tratamiento Médico" value={ficha.tratamiento_medico} />
                                            <CheckItem label="De las Articulaciones" value={ficha.articulaciones} />
                                            <CheckItem label="Anestesiado Anteriormente" value={ficha.anestesiado_anteriormente} />
                                            <CheckItem label="Reacción a Anestesia" value={ficha.reaccion_anestesia} />
                                        </div>
                                    </section>

                                    {/* Enfermedades */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-3">
                                            <Heart size={14} /> Enfermedades
                                        </h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                            <CheckItem label="Neurológicas" value={ficha.enf_neurologicas} />
                                            <CheckItem label="Pulmonares" value={ficha.enf_pulmonares} />
                                            <CheckItem label="Cardíacas" value={ficha.enf_cardiacas} />
                                            <CheckItem label="Hígado" value={ficha.enf_higado} />
                                            <CheckItem label="Gástricas" value={ficha.enf_gastricas} />
                                            <CheckItem label="Venéreas" value={ficha.enf_venereas} />
                                            <CheckItem label="Renales" value={ficha.enf_renales} />
                                            <CheckItem label="Diabetes" value={ficha.diabetes} />
                                            <CheckItem label="Hemorragias / Anemia" value={ficha.anemia} />
                                            <CheckItem label="Presión Alta (Hipertensión)" value={ficha.hipertension} />
                                            <CheckItem label="Presión Baja (Hipotensión)" value={ficha.hipotension} />
                                        </div>
                                        <div className="mt-3">
                                            <Field label="¿Requirió o requiere Prueba de VIH?" value={ficha.prueba_vih ? `SÍ (${ficha.prueba_vih_resultado || 'Sin especificar'})` : 'NO'} />
                                        </div>
                                    </section>

                                    {/* Antecedentes Gineco / Obstétricos */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                                            <Heart size={14} /> Antecedentes Gineco / Obstétricos
                                        </h3>
                                        {paciente.sexo === 'Femenino' ? (
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                <CheckItem label="Antic. Hormonal" value={ficha.anticonceptivo_hormonal} />
                                                <CheckItem label="Posible Embarazo" value={ficha.posibilidad_embarazo} />
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 italic px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                No aplica para este paciente (Sexo: {paciente.sexo})
                                            </div>
                                        )}
                                    </section>

                                    {/* Hábitos */}
                                    <section>
                                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                                            <AlertCircle size={14} /> Hábitos
                                        </h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                            <div className="col-span-2 lg:col-span-3">
                                                <Field label="¿Cuántas veces al día se cepilla los dientes?" value={ficha.cepillado_veces} />
                                            </div>
                                            <CheckItem label="Usa Hilo Dental" value={ficha.usa_hilo_dental} />
                                            <CheckItem label="Usa Enjuague" value={ficha.usa_enjuague} />
                                            <CheckItem label="Consume Cítricos" value={ficha.consume_citricos} />
                                            <div className="col-span-2 lg:col-span-3">
                                                <CheckItem label="Fuma" value={ficha.fuma} />
                                                {ficha.fuma && <div className="mt-2"><Field label="Fuma (Cantidad)" value={ficha.fuma_cantidad} /></div>}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Detalles Adicionales Eliminados Por Usuario */}
                                    
                                    {/* Observaciones Generales */}
                                    <section className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                            <FileText size={14} /> Observaciones Generales
                                        </h3>
                                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap">{ficha.observaciones || <span className="text-gray-400 dark:text-gray-600 font-normal italic">Ninguna observación</span>}</p>
                                    </section>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                                    <Heart size={40} className="opacity-30 mb-3" />
                                    <p className="text-sm font-medium">No hay ficha médica registrada para este paciente.</p>
                                </div>
                            )
                        )
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-5 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-all transform hover:-translate-y-0.5 shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PacienteViewModal;
