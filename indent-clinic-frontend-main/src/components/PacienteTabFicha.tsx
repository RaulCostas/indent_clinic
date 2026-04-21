import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import type { Paciente } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Heart, User, Stethoscope } from 'lucide-react';

const PacienteTabFicha: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        api.get<Paciente>(`/pacientes/${id}`)
            .then(r => setPaciente(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!paciente) return <div className="text-center py-10 text-gray-400">No se pudo cargar la ficha.</div>;

    const ficha = (paciente as any).fichaMedica;

    const calcEdad = (fecha?: string) => {
        if (!fecha) return '—';
        const hoy = new Date(); const nac = new Date(fecha);
        let edad = hoy.getFullYear() - nac.getFullYear();
        const m = hoy.getMonth() - nac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
        return `${edad} años`;
    };

    const Field = ({ label, value }: { label: string; value?: string | null }) => (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
            <span className="text-sm text-gray-800 dark:text-gray-100 font-medium border-b border-dashed border-gray-200 dark:border-gray-700 pb-1 min-h-[22px]">
                {value ?? <span className="text-gray-400 font-normal italic">—</span>}
            </span>
        </div>
    );

    const CheckBadge = ({ label, value }: { label: string; value?: boolean }) => (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${value
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
            : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 border-gray-100 dark:border-gray-700'
        }`}>
            <span>{value ? '☑' : '☐'}</span> {label}
        </div>
    );

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* — Datos Personales ─────────────────────────────────────── */}
                <div>
                    <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <User size={16} className="text-blue-500" /> Datos Personales
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Ap. Paterno" value={paciente.paterno} />
                        <Field label="Ap. Materno" value={paciente.materno} />
                        <Field label="Nombres" value={paciente.nombre} />
                        <Field label="Fecha Nacimiento" value={paciente.fecha_nacimiento ? `${formatDate(paciente.fecha_nacimiento)} (${calcEdad(paciente.fecha_nacimiento)})` : undefined} />
                        <Field label="Sexo" value={paciente.sexo} />
                        <Field label="Estado Civil" value={paciente.estado_civil} />
                        <Field label="C.I. / Documento" value={(paciente as any).ci} />
                        <Field label="Seguro Médico" value={paciente.seguro_medico} />
                    </div>

                    <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mt-6 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <User size={16} className="text-blue-500" /> Contacto
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Dirección" value={paciente.direccion} />
                        <Field label="Teléfono" value={paciente.telefono} />
                        <Field label="Celular" value={paciente.celular} />
                        <Field label="Email" value={paciente.email} />
                        <Field label="Lugar de Residencia" value={(paciente as any).lugar_residencia} />
                        <Field label="Profesión" value={paciente.profesion} />
                    </div>

                    <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mt-6 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <User size={16} className="text-amber-500" /> Responsable
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Nombre Responsable" value={paciente.responsable} />
                        <Field label="Parentesco" value={paciente.parentesco} />
                        <Field label="Dirección Responsable" value={paciente.direccion_responsable} />
                        <Field label="Teléfono Responsable" value={paciente.telefono_responsable} />
                    </div>

                    <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mt-6 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <User size={16} className="text-red-500" /> Consulta
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="¿Cuándo fue la última vez que visitó al odontólogo, y cuál fue el motivo?" value={`${(paciente as any).fichaMedica?.ultima_visita_odontologo || 'No especificado'} - ${(paciente as any).fichaMedica?.motivo_consulta || 'Sin motivo'}`} />
                        <Field label="Motivo de Consulta" value={paciente.motivo} />
                    </div>


                </div>

                {/* — Ficha Médica ─────────────────────────────────────────── */}
                <div>
                    <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                        <Heart size={16} className="text-red-500" /> Ficha Médica
                    </h3>
                    {ficha ? (
                        <div className="space-y-6">
                            {/* Antecedentes Patológicos */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Antecedentes Patológicos</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <CheckBadge label="Bruxismo" value={ficha.bruxismo} />
                                    <CheckBadge label="Alergia a Medicamento" value={ficha.alergia_medicamento} />
                                    <CheckBadge label="Medicamento últimas 72h" value={ficha.medicamento_72h} />
                                    <CheckBadge label="Tratamiento Médico" value={ficha.tratamiento_medico} />
                                    <CheckBadge label="De las Articulaciones" value={ficha.articulaciones} />
                                    <CheckBadge label="Anestesiado Anteriormente" value={ficha.anestesiado_anteriormente} />
                                    <CheckBadge label="Reacción a Anestesia" value={ficha.reaccion_anestesia} />
                                </div>
                            </div>

                            {/* Enfermedades */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Enfermedades</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <CheckBadge label="Neurológicas" value={ficha.enf_neurologicas} />
                                    <CheckBadge label="Pulmonares" value={ficha.enf_pulmonares} />
                                    <CheckBadge label="Cardíacas" value={ficha.enf_cardiacas} />
                                    <CheckBadge label="Hígado" value={ficha.enf_higado} />
                                    <CheckBadge label="Gástricas" value={ficha.enf_gastricas} />
                                    <CheckBadge label="Venéreas" value={ficha.enf_venereas} />
                                    <CheckBadge label="Renales" value={ficha.enf_renales} />
                                    <CheckBadge label="Diabetes" value={ficha.diabetes} />
                                    <CheckBadge label="Hemorragias / Anemia" value={ficha.anemia} />
                                    <CheckBadge label="Presión Alta (Hipertensión)" value={ficha.hipertension} />
                                    <CheckBadge label="Presión Baja (Hipotensión)" value={ficha.hipotension} />
                                </div>
                                <div className="mt-3">
                                    <Field label="¿Requirió o requiere Prueba de VIH?" value={ficha.prueba_vih ? `SÍ (${ficha.prueba_vih_resultado || 'Sin especificar'})` : 'NO'} />
                                </div>
                            </div>

                            {/* Antecedentes Gineco / Obstétricos */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Antecedentes Gineco / Obstétricos</p>
                                {paciente.sexo === 'Femenino' ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        <CheckBadge label="Anticonceptivo Hormonal" value={ficha.anticonceptivo_hormonal} />
                                        <CheckBadge label="Posibilidad Embarazo" value={ficha.posibilidad_embarazo} />
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-500 italic px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">No aplica para este paciente (Sexo: {paciente.sexo})</div>
                                )}
                            </div>

                            {/* Hábitos */}
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Hábitos</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <div className="col-span-1 md:col-span-3">
                                        <Field label="¿Cuántas veces al día se cepilla los dientes?" value={ficha.cepillado_veces} />
                                    </div>
                                    <CheckBadge label="Usa Hilo Dental" value={ficha.usa_hilo_dental} />
                                    <CheckBadge label="Usa Enjuague" value={ficha.usa_enjuague} />
                                    <CheckBadge label="Consume Cítricos" value={ficha.consume_citricos} />
                                    <div className="col-span-1 md:col-span-3">
                                        <CheckBadge label="Fuma" value={ficha.fuma} />
                                        {ficha.fuma && <div className="mt-2"><Field label="Fuma (Cantidad)" value={ficha.fuma_cantidad} /></div>}
                                    </div>
                                </div>
                            </div>

                            {/* Detalles Eliminados a petición del usuario */}
                            {/* Observaciones Generales */}
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Observaciones Generales</p>
                                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap">{ficha.observaciones || <span className="text-gray-400 dark:text-gray-600 font-normal italic">Ninguna observación</span>}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400">
                            <Stethoscope size={36} className="mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No se ha registrado ficha médica.</p>
                            <p className="text-sm mt-1">Edite el paciente para completar la ficha médica.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PacienteTabFicha;
