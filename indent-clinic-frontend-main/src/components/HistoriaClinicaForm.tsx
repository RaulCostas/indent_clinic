import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import type { Doctor, Proforma, Arancel, HistoriaClinica } from '../types';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { getLocalDateString } from '../utils/dateUtils';
import SearchableSelect from './SearchableSelect';



interface HistoriaClinicaFormProps {
    pacienteId: number;
    onSuccess: () => void;
    historiaToEdit: HistoriaClinica | null;
    onCancelEdit: () => void;
    // historiaList: HistoriaClinica[]; // Unused
    selectedProformaId: number;
    proformas: Proforma[];

}

const HistoriaClinicaForm: React.FC<HistoriaClinicaFormProps> = ({
    pacienteId,
    onSuccess,
    historiaToEdit,
    onCancelEdit,

    selectedProformaId,
    proformas,

}) => {
    const [formData, setFormData] = useState({
        fecha: getLocalDateString(),
        tratamiento: '',
        diagnostico: '',
        pieza: '',
        cantidad: 1,
        observaciones: '',
        especialidadId: 0,
        doctorId: 0,
        estadoTratamiento: 'no terminado',
        estadoPresupuesto: 'no terminado',
        proformaId: 0,
        proformaDetalleId: 0,

        casoClinico: false,
        pagado: 'NO',
        precio: 0
    });

    const [historiaClinica, setHistoriaClinica] = useState<HistoriaClinica[]>([]);

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [allTreatments, setAllTreatments] = useState<Arancel[]>([]);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Nuevo Seguimiento Clínico',
            content: 'Registre los tratamientos realizados al paciente. Si asocia el tratamiento a un Plan de Tratamiento existente, este se irá completando automáticamente conforme termine las sesiones.'
        },
        {
            title: 'Campos Principales',
            content: 'Fecha: Fecha del tratamiento realizado.\nTratamiento: Seleccione del plan activo o ingrese manualmente.\nPieza(s): Número de pieza dental tratada.\nCantidad: Número de sesiones o unidades del tratamiento.'
        },
        {
            title: 'Estados',
            content: 'Tratamiento: Marque como "Terminado" si completó el tratamiento, o "No Terminado" si requiere más sesiones.\nPlan de Tratamiento: Indica si el tratamiento está completado según el plan de tratamiento original.'
        },
        {
            title: 'Opciones Especiales',
            content: 'Caso Clínico: Marque si este tratamiento es parte de un caso clínico para enseñanza o presentación.'
        }];


    useEffect(() => {
        if (pacienteId) {
            fetchDoctors();
            fetchTreatments();
            fetchHistory();
        }
    }, [pacienteId]);

    // Derive available treatments from the CURRENTLY selected proforma in the form
    // Only include confirmed treatments (posible=false)
    const currentProformaDetails = useMemo(() => {
        if (!formData.proformaId) return [];
        const proforma = proformas.find(p => p.id === formData.proformaId);
        return proforma ? proforma.detalles.filter((d: any) => !d.posible) : [];
    }, [formData.proformaId, proformas]);

    // Update formData when selectedProformaId (from parent props) changes
    useEffect(() => {
        if (!historiaToEdit) { // Only update if not editing, to avoid overwriting edit data
            setFormData(prev => ({
                ...prev,
                proformaId: selectedProformaId,
                proformaDetalleId: 0,
                tratamiento: '',
                precio: 0
            }));
        }
    }, [selectedProformaId, historiaToEdit]);

    useEffect(() => {
        if (historiaToEdit) {
            let initialPrice = historiaToEdit.precio || 0;
            let initialProformaDetalleId = historiaToEdit.proformaDetalleId || 0;

            // Resolve initial details if needed
            // If price is 0 and we have a proforma selected, try to find the price
            if (initialPrice === 0 && historiaToEdit.proformaId) {
                const proforma = proformas.find(p => p.id === historiaToEdit.proformaId);
                const details = proforma ? proforma.detalles : [];

                if (details.length > 0) {
                    // Try to match by proformaDetalleId if available, or by treatment name
                    const detail = details.find(d =>
                        (historiaToEdit.proformaDetalleId && d.id === historiaToEdit.proformaDetalleId) ||
                        (d.arancel?.detalle === historiaToEdit.tratamiento)
                    );

                    if (detail) {
                        initialPrice = Number(detail.precioUnitario) * historiaToEdit.cantidad;
                        initialProformaDetalleId = detail.id;
                    }
                }
            }

            console.log('Form initialized with:', {
                tratamiento: historiaToEdit.tratamiento,
                pieza: historiaToEdit.pieza,
                cantidad: historiaToEdit.cantidad,
                proformaDetalleId: initialProformaDetalleId
            });

            setFormData({
                fecha: historiaToEdit.fecha.split('T')[0],
                tratamiento: historiaToEdit.tratamiento || '',
                diagnostico: historiaToEdit.diagnostico || '',
                pieza: historiaToEdit.pieza || '',
                cantidad: historiaToEdit.cantidad,
                observaciones: historiaToEdit.observaciones || '',
                especialidadId: historiaToEdit.especialidadId || 0,
                doctorId: historiaToEdit.doctorId || 0,
                estadoTratamiento: historiaToEdit.estadoTratamiento,
                estadoPresupuesto: historiaToEdit.estadoPresupuesto,
                proformaId: historiaToEdit.proformaId || 0,
                proformaDetalleId: initialProformaDetalleId,

                casoClinico: historiaToEdit.casoClinico,
                pagado: historiaToEdit.pagado,
                precio: initialPrice
            });
        } else {
            resetForm();
        }
    }, [historiaToEdit, proformas]);

    const fetchDoctors = async () => {
        try {
            const response = await api.get('/doctors?limit=1000');
            const activeDoctors = (response.data.data || []).filter((doctor: any) => doctor.estado === 'activo');
            setDoctors(activeDoctors);
        } catch (error) {
            console.error('Error fetching doctors:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await api.get(`/historia-clinica/paciente/${pacienteId}`);
            setHistoriaClinica(response.data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    const fetchTreatments = async () => {
        try {
            const response = await api.get('/arancel?limit=1000');
            setAllTreatments(response.data.data || []);
        } catch (error) {
            console.error('Error fetching treatments:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'tratamientoSelect') {
            const selectedId = Number(value);

            if (formData.proformaId) {
                // Logic when selecting from Proforma details
                const detail = currentProformaDetails.find(d => d.id === selectedId);
                if (detail) {
                    const unitPrice = Number(detail.precioUnitario);

                    let treatmentName = detail.arancel?.detalle || '';
                    let derivedEspecialidadId = detail.arancel?.idEspecialidad || 0;

                    if (!treatmentName && detail.arancelId) {
                        const arancel = allTreatments.find(a => a.id === detail.arancelId);
                        if (arancel) {
                            treatmentName = arancel.detalle;
                            derivedEspecialidadId = arancel.idEspecialidad;
                        }
                    }

                    const proforma = proformas.find(p => p.id === formData.proformaId);
                    let discountFactor = 1;
                    if (proforma && Number(proforma.sub_total) > 0) {
                        discountFactor = Number(proforma.total) / Number(proforma.sub_total);
                    }

                    setFormData(prev => ({
                        ...prev,
                        tratamiento: treatmentName,
                        pieza: detail.piezas || '',
                        cantidad: detail.cantidad,
                        precio: (unitPrice * detail.cantidad) * discountFactor,
                        proformaDetalleId: detail.id,
                        especialidadId: derivedEspecialidadId
                    }));
                }
            } else {
                // Logic when selecting from All Treatments (Aranceles)
                const arancel = allTreatments.find(a => a.id === selectedId);
                if (arancel) {
                    setFormData(prev => ({
                        ...prev,
                        tratamiento: arancel.detalle,
                        precio: Number(arancel.precio) * formData.cantidad,
                        proformaDetalleId: 0,
                        especialidadId: arancel.idEspecialidad
                    }));
                }
            }
        } else if (name === 'cantidad') {
            const newQuantity = Number(value);
            let newPrice = formData.precio;

            if (formData.proformaId && currentProformaDetails.length > 0) {
                const detail = currentProformaDetails.find(d =>
                    (formData.proformaDetalleId && d.id === formData.proformaDetalleId) ||
                    (d.arancel?.detalle === formData.tratamiento)
                );

                if (detail) {
                    const proforma = proformas.find(p => p.id === formData.proformaId);
                    let discountFactor = 1;
                    if (proforma && Number(proforma.sub_total) > 0) {
                        discountFactor = Number(proforma.total) / Number(proforma.sub_total);
                    }
                    newPrice = (Number(detail.precioUnitario) * newQuantity) * discountFactor;
                }
            } else if (allTreatments.length > 0) {
                const arancel = allTreatments.find(a => a.detalle === formData.tratamiento);
                if (arancel) {
                    newPrice = Number(arancel.precio) * newQuantity;
                }
            }

            setFormData(prev => ({
                ...prev,
                cantidad: newQuantity,
                precio: newPrice
            }));
        } else if (name === 'proformaId') {
            // Handle Proforma Change
            setFormData(prev => ({
                ...prev,
                proformaId: Number(value),
                proformaDetalleId: 0,
                tratamiento: '',
                precio: 0
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : (name.includes('Id') && name !== 'proformaId' ? Number(value) : (name === 'cantidad' || name === 'precio' ? Number(value) : value))
            }));
        }
    };

    const resetForm = () => {
        setFormData({
            fecha: getLocalDateString(),
            tratamiento: '',
            diagnostico: '',
            pieza: '',
            cantidad: 1,
            observaciones: '',
            especialidadId: 0,
            doctorId: 0,
            estadoTratamiento: 'no terminado',
            estadoPresupuesto: 'no terminado',
            proformaId: selectedProformaId || 0,
            proformaDetalleId: 0,

            casoClinico: false,
            pagado: 'NO',
            precio: 0
        });
    };

    const handleSave = async (firmaData?: string) => {
        try {
            const payload: any = {
                ...formData,
                pacienteId: Number(pacienteId),
                especialidadId: formData.especialidadId > 0 ? Number(formData.especialidadId) : null,
                doctorId: formData.doctorId > 0 ? Number(formData.doctorId) : null,
                proformaId: formData.proformaId > 0 ? Number(formData.proformaId) : null,
                proformaDetalleId: formData.proformaDetalleId > 0 ? Number(formData.proformaDetalleId) : null,
                precio: isNaN(Number(formData.precio)) ? 0 : Number(formData.precio),
                cantidad: isNaN(Number(formData.cantidad)) ? 1 : Number(formData.cantidad),
            };

            if (firmaData) {
                payload.firmaPaciente = firmaData;
            }

            if (historiaToEdit) {
                await api.patch(`/historia-clinica/${historiaToEdit.id}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Seguimiento Actualizado',
                    text: 'Seguimiento Clínico actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            } else {
                await api.post('/historia-clinica', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Seguimiento Guardado',
                    text: 'Seguimiento Clínico guardado exitosamente',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
            onSuccess();
            onCancelEdit();
            resetForm();
        } catch (error) {
            console.error('Error saving historia clinica:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.doctorId || formData.doctorId === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Obligatorio',
                text: 'Debe seleccionar un Doctor para este seguimiento.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (!formData.diagnostico || formData.diagnostico.trim() === '') {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Obligatorio',
                text: 'Debe ingresar el Diagnóstico del tratamiento.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (!formData.observaciones || formData.observaciones.trim() === '') {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Obligatorio',
                text: 'Debe ingresar la Descripción/Observaciones del tratamiento realizado.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        // Si intentan poner "terminado" a todo el plan
        if (formData.estadoPresupuesto === 'terminado') {
            if (formData.proformaId && currentProformaDetails.length > 0) {
                const incompleteTreatments: string[] = [];
                
                // Simular el historial con la edición actual o nueva entrada
                let tempHistoria = [...historiaClinica];
                if (historiaToEdit) {
                    tempHistoria = tempHistoria.map(h => h.id === historiaToEdit.id ? { ...h, ...formData } as any : h);
                } else {
                    tempHistoria.push({ ...formData } as any);
                }

                currentProformaDetails.forEach(t => {
                    let isCompleted = false;
                    let missingPiecesText = '';

                    if (t.piezas) {
                        const allPiezas = t.piezas.split(/[-/,\s]+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                        const completedPieces: string[] = [];
                        tempHistoria.forEach(h => {
                            if (h.proformaDetalleId === t.id && h.estadoTratamiento === 'terminado' && h.pieza) {
                                completedPieces.push(...h.pieza.split(/[-/,\s]+/).map(p => p.trim()).filter(p => p.length > 0));
                            }
                        });
                        
                        const missingPieces = allPiezas.filter((p: string) => !completedPieces.includes(p));
                        isCompleted = allPiezas.length > 0 && missingPieces.length === 0;

                        if (!isCompleted && allPiezas.length > 0) {
                            missingPiecesText = `(Pz faltantes: ${missingPieces.join(', ')})`;
                        }
                    } else {
                        isCompleted = tempHistoria.some(h => h.proformaDetalleId === t.id && h.estadoTratamiento === 'terminado');
                    }
                    
                    if (!isCompleted) {
                        incompleteTreatments.push(`- ${t.arancel?.detalle} ${missingPiecesText}`);
                    }
                });

                if (incompleteTreatments.length > 0) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Tratamientos Incompletos',
                        html: `No puede marcar el Plan como terminado porque faltan los siguientes tratamientos:<br><br><div class="text-left text-sm mt-3 ml-4 max-h-40 overflow-y-auto font-mono bg-gray-100 p-2 rounded">${incompleteTreatments.join('<br>')}</div>`,
                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'Entendido'
                    });
                    return; // Detener guardado
                }

                // Todos completos, guardar directamente
                handleSave();
                return;
            } else if (!formData.proformaId) {
                 Swal.fire({
                    icon: 'warning',
                    title: 'Atención',
                    text: 'Para finalizar un Plan de Tratamiento, debe seleccionar un plan asociado.'
                });
                return;
            }
        }

        // Si no está cerrando presupuesto, continuar flujo normal
        handleSave();
    };


    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className={`p-2 rounded-lg ${historiaToEdit ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300' : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </span>
                    {historiaToEdit ? 'Editar Seguimiento Clínico' : 'Nuevo Seguimiento Clínico'}
                </h3>
                <button
                    type="button"
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">

                    {/* Fecha */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <input
                                type="date"
                                name="fecha"
                                value={formData.fecha}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>
                    </div>

                    {/* Tratamiento */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tratamiento</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                </svg>
                            </div>
                            <select
                                name="tratamientoSelect"
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                                value={formData.proformaDetalleId || ""}
                            >
                                <option value="" hidden>-- Seleccione Tratamiento --</option>
                                {formData.proformaId ? (
                                    currentProformaDetails.map(t => {
                                        let isCompleted = false;

                                        if (t.piezas) {
                                            const allPiezas = t.piezas.split(/[-/,\s]+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
                                            const completedPieces: string[] = [];
                                            historiaClinica.forEach(h => {
                                                if (h.proformaDetalleId === t.id &&
                                                    h.estadoTratamiento === 'terminado' &&
                                                    h.pieza) {
                                                    const pieces = h.pieza.split(/[-/,\s]+/).map((p: string) => p.trim()).filter(p => p.length > 0);
                                                    completedPieces.push(...pieces);
                                                }
                                            });
                                            isCompleted = allPiezas.length > 0 && allPiezas.every((p: string) => completedPieces.includes(p));
                                        } else {
                                            isCompleted = historiaClinica.some(h =>
                                                h.proformaDetalleId === t.id &&
                                                h.estadoTratamiento === 'terminado'
                                            );
                                        }

                                        return (
                                            <option
                                                key={t.id}
                                                value={t.id}
                                                style={isCompleted ? {
                                                    color: '#16a34a', // Green
                                                    fontWeight: 'bold'
                                                } : undefined}
                                            >
                                                {t.arancel?.detalle}
                                                {t.piezas ? ` - Piezas: ${t.piezas}` : ''}
                                                {isCompleted ? ' (Completado)' : ''}
                                            </option>
                                        );
                                    })
                                ) : (
                                    <option value="" hidden>Seleccione un Plan de Tratamiento primero</option>
                                )}
                            </select>
                        </div>
                        {historiaToEdit && formData.tratamiento && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 pl-1">Actual: {formData.tratamiento}</div>
                        )}
                    </div>

                    {/* Pieza */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pieza(s)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                </svg>
                            </div>
                            <input
                                type="text"
                                name="pieza"
                                value={formData.pieza}
                                onChange={handleChange}
                                placeholder="Ej. 11, 12..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Cantidad */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="4" y1="9" x2="20" y2="9"></line>
                                    <line x1="4" y1="15" x2="20" y2="15"></line>
                                    <line x1="10" y1="3" x2="8" y2="21"></line>
                                    <line x1="16" y1="3" x2="14" y2="21"></line>
                                </svg>
                            </div>
                            <input
                                type="number"
                                name="cantidad"
                                value={formData.cantidad}
                                onChange={handleChange}
                                min="1"
                                placeholder="1"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>


                    {/* Doctor */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Doctor <span className="text-red-500">*</span></label>
                                <SearchableSelect
                                    options={doctors.map(d => ({
                                        id: d.id,
                                        label: `${d.paterno} ${d.materno} ${d.nombre}`.trim(),
                                        subLabel: d.especialidad?.especialidad
                                    }))}
                                    value={formData.doctorId}
                                    onChange={(val) => setFormData(prev => ({ ...prev, doctorId: Number(val) }))}
                                    placeholder="-- Seleccione Doctor --"
                                    required
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    }
                                />
                    </div>

                    {/* Diagnostico */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Diagnóstico <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                            </div>
                            <input
                                type="text"
                                name="diagnostico"
                                value={formData.diagnostico}
                                onChange={handleChange}
                                placeholder="Escriba un diagnóstico..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>
                    </div>



                    {/* Descripción */}
                    <div className="md:col-span-4">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descripción del Tratamiento Realizado <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                            </div>
                            <textarea
                                name="observaciones"
                                value={formData.observaciones}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Detalle observaciones o procedimientos adicionales..."
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Opciones Checkbox & Radios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-600 mb-6">
                    <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estados</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Tratamiento</span>
                                <div className="flex flex-col gap-2">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="radio" name="estadoTratamiento" value="terminado" checked={formData.estadoTratamiento === 'terminado'} onChange={handleChange} className="form-radio text-green-600 focus:ring-green-500 h-4 w-4" />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Terminado</span>
                                    </label>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="radio" name="estadoTratamiento" value="no terminado" checked={formData.estadoTratamiento === 'no terminado'} onChange={handleChange} className="form-radio text-red-600 focus:ring-red-500 h-4 w-4" />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No Terminado</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Plan de Tratamiento</span>
                                <div className="flex flex-col gap-2">
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="radio" name="estadoPresupuesto" value="terminado" checked={formData.estadoPresupuesto === 'terminado'} onChange={handleChange} className="form-radio text-green-600 focus:ring-green-500 h-4 w-4" />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Terminado</span>
                                    </label>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="radio" name="estadoPresupuesto" value="no terminado" checked={formData.estadoPresupuesto === 'no terminado'} onChange={handleChange} className="form-radio text-red-600 focus:ring-red-500 h-4 w-4" />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">No Terminado</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Opciones</h4>
                        <div className="flex gap-6">

                            <label className="inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="casoClinico"
                                    checked={formData.casoClinico}
                                    onChange={handleChange}
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:bg-gray-700"
                                />
                                <span className="ml-2 text-gray-700 dark:text-gray-300">Caso Clínico</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl mt-6 -mx-6 -mb-6">
                    <button
                        type="submit"
                        className="px-8 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        {historiaToEdit ? 'Actualizar Seguimiento' : 'Guardar Seguimiento'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onCancelEdit();
                            resetForm();
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {historiaToEdit ? 'Cancelar Edición' : 'Cancelar'}
                    </button>
                </div>
            </form >

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Seguimiento Clínico"
                sections={manualSections}
            />

        </div >
    );
};

export default HistoriaClinicaForm;
