import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import type { TrabajoLaboratorio, Paciente, Laboratorio, PrecioLaboratorio, Cubeta, Doctor } from '../types';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import { Plus } from 'lucide-react';
import SearchableSelect from './SearchableSelect';


const TrabajosLaboratoriosForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const { clinicaSeleccionada } = useClinica();

    const getLocalDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [formData, setFormData] = useState<Partial<TrabajoLaboratorio>>({
        idLaboratorio: 0,
        idPaciente: 0,
        idprecios_laboratorios: 0,
        fecha: getLocalDate(),
        pieza: '',
        cantidad: 1,
        fecha_pedido: getLocalDate(),
        color: '',
        estado: 'no terminado',
        cita: 'no',
        observacion: '',
        pagado: 'no',
        precio_unitario: 0,
        total: 0,
        resaltar: 'no',
        fecha_terminado: '',
        clinicaId: clinicaSeleccionada || 0, // Initialize with global clinic or 0
        idDoctor: 0,
        idHistoriaClinica: 0,
    });

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [historiasClinica, setHistoriasClinica] = useState<any[]>([]);
    const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
    const [preciosLaboratorio, setPreciosLaboratorio] = useState<PrecioLaboratorio[]>([]);
    const [cubetas, setCubetas] = useState<Cubeta[]>([]);
    const [doctores, setDoctores] = useState<Doctor[]>([]);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Trabajos de Laboratorio',
            content: 'Registre los trabajos enviados a laboratorios externos. Especifique el tipo de trabajo, piezas dentales, fechas y estado del trabajo.'
        },
        {
            title: 'Cubetas',
            content: 'Asocie una cubeta al trabajo para rastrear su ubicación. El sistema actualiza automáticamente el estado de la cubeta cuando el trabajo se envía o regresa.'
        },
        {
            title: 'Estados del Trabajo',
            content: 'Los trabajos pueden estar: No Terminado, Terminado, o Entregado. El sistema rastrea las fechas de cada cambio de estado.'
        }];

    useEffect(() => {
        fetchDropdowns();
        if (isEditing && id) {
            fetchTrabajo(id);
        }
    }, [id, clinicaSeleccionada]);

    useEffect(() => {
        // Update clinicaId in formData if global selection changes and we are not editing
        if (!isEditing) {
            setFormData(prev => ({ ...prev, clinicaId: clinicaSeleccionada || 0 }));
        }
    }, [clinicaSeleccionada, isEditing]);

    useEffect(() => {
        const total = (Number(formData.cantidad) || 0) * (Number(formData.precio_unitario) || 0);
        setFormData(prev => ({ ...prev, total }));
    }, [formData.cantidad, formData.precio_unitario]);

    useEffect(() => {
        if (formData.idPaciente) {
            fetchHistoriasClinica(Number(formData.idPaciente));
        } else {
            setHistoriasClinica([]);
        }
    }, [formData.idPaciente]);

    const fetchDropdowns = async () => {
        try {
            const clinicaParam = clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : '';
            const [pacResponse, labRes, preciosRes, cubetasRes, docsRes] = await Promise.all([
                api.get('/pacientes?limit=1000'),
                api.get('/laboratorios?limit=100'),
                api.get('/precios-laboratorios?limit=1000'),
                api.get(`/cubetas?dentro_fuera=DENTRO&limit=100${clinicaParam}`),
                api.get('/doctors?limit=100')
            ]);

            const allPacientes = Array.isArray(pacResponse.data.data) ? pacResponse.data.data : pacResponse.data;
            const activePacientes = allPacientes.filter((p: any) => p.estado === 'activo');
            setPacientes(activePacientes);
            const activeLabs = (labRes.data.data || []).filter((lab: any) => lab.estado === 'activo');
            setLaboratorios(activeLabs);
            setPreciosLaboratorio(Array.isArray(preciosRes.data.data) ? preciosRes.data.data : preciosRes.data);
            setCubetas(Array.isArray(cubetasRes.data.data) ? cubetasRes.data.data : cubetasRes.data);
            const allDocs = Array.isArray(docsRes.data) ? docsRes.data : (docsRes.data.data || []);
            const activeDocs = allDocs.filter((d: any) => d.estado === 'activo');
            setDoctores(activeDocs);
        } catch (error) {
            console.error('Error fetching dropdowns:', error);
        }
    };

    const fetchTrabajo = async (workId: string) => {
        try {
            const response = await api.get(`/trabajos-laboratorios/${workId}`);
            setFormData(response.data);
            if (response.data.idPaciente) {
                fetchHistoriasClinica(response.data.idPaciente);
            }
        } catch (error) {
            console.error('Error fetching trabajo:', error);
        }
    };

    const fetchHistoriasClinica = async (pacienteId: number) => {
        try {
            const response = await api.get(`/historia-clinica/paciente/${pacienteId}`);
            setHistoriasClinica(response.data);
        } catch (error) {
            console.error('Error fetching historias clinica:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePrecioSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const precioId = Number(e.target.value);
        const selectedPrecio = preciosLaboratorio.find(p => p.id === precioId);

        setFormData(prev => ({
            ...prev,
            idprecios_laboratorios: precioId,
            precio_unitario: selectedPrecio ? Number(selectedPrecio.precio) : 0,
            idLaboratorio: selectedPrecio ? selectedPrecio.idLaboratorio : prev.idLaboratorio // Auto-select lab if linked
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            idLaboratorio: Number(formData.idLaboratorio),
            idPaciente: Number(formData.idPaciente),
            idHistoriaClinica: (formData.idHistoriaClinica && Number(formData.idHistoriaClinica) !== 0) ? Number(formData.idHistoriaClinica) : null,
            idprecios_laboratorios: Number(formData.idprecios_laboratorios),
            idCubeta: formData.idCubeta ? Number(formData.idCubeta) : null,
            idDoctor: formData.idDoctor ? Number(formData.idDoctor) : null,
            cantidad: Number(formData.cantidad),
            precio_unitario: Number(formData.precio_unitario),
            total: Number(formData.total),
            fecha_terminado: formData.estado === 'terminado' ? formData.fecha_terminado : null,
            ...(!isEditing && { clinicaId: clinicaSeleccionada ? Number(clinicaSeleccionada) : undefined })
        };

        try {
            if (isEditing && id) {
                await api.patch(`/trabajos-laboratorios/${id}`, payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Trabajo Actualizado',
                    text: 'El trabajo ha sido modificado exitosamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/trabajos-laboratorios', payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Trabajo Guardado',
                    text: 'El trabajo ha sido registrado exitosamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            navigate('/trabajos-laboratorios');
        } catch (error) {
            console.error('Error saving trabajo:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al guardar el trabajo.',
            });
        }
    };

    return (
        <div className="content-card max-w-[700px] mx-auto text-gray-800 dark:text-white">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-purple-600 dark:text-purple-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    </span>
                    {isEditing ? 'Editar Trabajo de Laboratorio' : 'Nuevo Trabajo de Laboratorio'}
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

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Fecha Registro (fecha) */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Fecha Registro</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <input
                            type="date"
                            name="fecha"
                            value={formData.fecha}
                            onChange={handleChange}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                        />
                    </div>
                </div>


                {/* Doctor Selector */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Doctor</label>
                        <SearchableSelect
                            options={doctores.map(d => ({
                                id: d.id,
                                label: `Dr. ${d.nombre} ${d.paterno}`,
                                subLabel: d.especialidad?.especialidad
                            }))}
                            value={formData.idDoctor || 0}
                            onChange={(val) => setFormData(prev => ({ ...prev, idDoctor: Number(val) }))}
                            placeholder="Seleccione Doctor"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            }
                        />
                </div>

                {/* 2. Paciente */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Paciente</label>
                        <SearchableSelect
                            options={pacientes.map(p => ({
                                id: p.id,
                                label: `${p.nombre} ${p.paterno} ${p.materno}`,
                                subLabel: p.celular
                            }))}
                            value={formData.idPaciente || 0}
                            onChange={(val) => setFormData(prev => ({ ...prev, idPaciente: Number(val) }))}
                            placeholder="Seleccione Paciente"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            }
                        />
                </div>

                {/* 3. Laboratorio (Active Only) */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Laboratorio</label>
                        <SearchableSelect
                            options={laboratorios.filter(l => l.estado === 'Activo' || l.estado === 'activo').map(l => ({
                                id: l.id,
                                label: l.laboratorio,
                                subLabel: l.celular
                            }))}
                            value={formData.idLaboratorio || 0}
                            onChange={(val) => {
                                setFormData(prev => ({ 
                                    ...prev, 
                                    idLaboratorio: Number(val),
                                    idprecios_laboratorios: 0, 
                                    precio_unitario: 0 
                                }));
                            }}
                            placeholder="Seleccione Laboratorio"
                            icon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18"></path>
                                    <path d="M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14"></path>
                                    <path d="M9 10a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"></path>
                                </svg>
                            }
                        />
                </div>

                {/* 4. Trabajo/Precio (Filtered by Lab) */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Trabajo / Precio</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                            <line x1="7" y1="7" x2="7.01" y2="7"></line>
                        </svg>
                        <select
                            name="idprecios_laboratorios"
                            value={formData.idprecios_laboratorios}
                            onChange={handlePrecioSelect}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                            disabled={!formData.idLaboratorio}
                        ><option value={0}>Seleccione Trabajo</option>
                            {preciosLaboratorio
                                .filter(p => p.idLaboratorio === Number(formData.idLaboratorio))
                                .map(p => (
                                    <option key={p.id} value={p.id}>{p.detalle}</option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* New: Treatment Selection (Historia Clinica) */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Asociar a Tratamiento</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                        </svg>
                        <select
                            name="idHistoriaClinica"
                            value={formData.idHistoriaClinica || 0}
                            onChange={handleChange}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            disabled={!formData.idPaciente}
                        >
                            <option value={0}>Ninguno / Otros</option>
                            {historiasClinica.map(hc => (
                                <option key={hc.id} value={hc.id}>
                                    {hc.tratamiento || 'Sin descripción'} ({hc.pieza ? `Pieza ${hc.pieza}` : 'General'})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 5. Pieza */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Pieza(s)</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                        <input
                            type="text"
                            name="pieza"
                            value={formData.pieza}
                            onChange={handleChange}
                            placeholder="Ej. 11, 12..."
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                </div>

                {/* 6. Cantidad */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Cantidad</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <input
                            type="number"
                            name="cantidad"
                            value={formData.cantidad}
                            onChange={handleChange}
                            placeholder="1"
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            min="1"
                        />
                    </div>
                </div>

                {/* 7. Color */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Color</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                            <path d="M2 12h20"></path>
                        </svg>
                        <input
                            type="text"
                            name="color"
                            value={formData.color}
                            onChange={handleChange}
                            placeholder="Ej: A2, B1"
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                </div>

                {/* 8. Fecha Entrega (fecha_pedido) */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Fecha Entrega</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <input
                            type="date"
                            name="fecha_pedido"
                            value={formData.fecha_pedido}
                            onChange={handleChange}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            required
                        />
                    </div>
                </div>

                {/* 9. Estado */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Estado de Trabajo</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <select
                            name="estado"
                            value={formData.estado}
                            onChange={handleChange}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="" disabled>-- Seleccione --</option><option value="no terminado">No Terminado</option>
                            <option value="terminado">Terminado</option>
                        </select>
                    </div>
                </div>

                {/* 9.5 Fecha Terminado (Conditional) */}
                {formData.estado === 'terminado' && (
                    <div className="form-group">
                        <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Fecha Terminado</label>
                        <div className="relative">
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <input
                                type="date"
                                name="fecha_terminado"
                                value={formData.fecha_terminado || ''}
                                onChange={handleChange}
                                className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>
                )}

                {/* 10. Resaltar */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Resaltar</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <select
                            name="resaltar"
                            value={formData.resaltar}
                            onChange={handleChange}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="" disabled>-- Seleccione --</option><option value="no">No</option>
                            <option value="si">Si</option>
                        </select>
                    </div>
                </div>

                {/* 11. Cita */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Cita</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <select
                            name="cita"
                            value={formData.cita}
                            onChange={handleChange}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="" disabled>-- Seleccione --</option><option value="no">No</option>
                            <option value="si">Si</option>
                        </select>
                    </div>
                </div>

                {/* 12. Cubeta */}
                <div className="form-group">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Cubeta</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"></path>
                            <line x1="12" y1="9" x2="12" y2="15"></line>
                        </svg>
                        <select
                            name="idCubeta"
                            value={formData.idCubeta || ''}
                            onChange={handleChange}
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Seleccione Cubeta (Solo DENTRO)</option>
                            {cubetas.map(c => (
                                <option key={c.id} value={c.id}>{c.codigo} - {c.descripcion}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 12. Observacion */}
                <div className="form-group md:col-span-2">
                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Observaciones</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 text-gray-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <textarea
                            name="observacion"
                            value={formData.observacion}
                            onChange={handleChange}
                            placeholder="Ingrese una descripción..."
                            className="w-full border dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            rows={3}
                        />
                    </div>
                </div>

                {/* Price Display Block */}
                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex justify-end gap-6 items-center border dark:border-gray-600">
                    <div className="text-right">
                        <span className="block text-sm text-gray-600 dark:text-gray-300">Precio Unitario</span>
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">{Number(formData.precio_unitario).toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm text-gray-600 dark:text-gray-300">Total</span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">{Number(formData.total).toFixed(2)}</span>
                    </div>
                </div>



                <div className="md:col-span-2 flex justify-start gap-4 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
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
                        onClick={() => navigate('/trabajos-laboratorios')}
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
                title="Manual - Trabajos de Laboratorio"
                sections={manualSections}
            />
        </div>
    );
};

export default TrabajosLaboratoriosForm;
