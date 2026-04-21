import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente, Arancel } from '../types';
import { useClinica, type Clinica } from '../context/ClinicaContext';
import ManualModal, { type ManualSection } from './ManualModal';
import ArancelForm from './ArancelForm';
import SearchableSelect from './SearchableSelect';
import { formatDate } from '../utils/dateUtils';

interface DetalleItem {
    id?: number;
    letra: string;
    arancelId: number;
    codigo: string;
    tratamiento: string;
    precioUnitario: number;
    piezas: string;
    cantidad: number;
    total: number;
    posible: boolean;
    tipoPrecio?: 'normal' | 'sin_seguro' | 'gold' | 'silver' | 'odontologico';
}

const PropuestasForm: React.FC = () => {
    const { id, propuestaId } = useParams<{ id: string; propuestaId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isReadOnly = location.pathname.includes('/view/');

    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [aranceles, setAranceles] = useState<Arancel[]>([]);
    const [detalles, setDetalles] = useState<DetalleItem[]>([]);
    const [nota, setNota] = useState('');
    const [letraHeader, setLetraHeader] = useState(''); // Optional header label
    const [fecha, setFecha] = useState(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    // const [numero, setNumero] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('A'); // Default tab

    // Form state for new item
    const [selectedArancelId, setSelectedArancelId] = useState<number>(0);
    const [piezas, setPiezas] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [posible, setPosible] = useState(false);
    const [tipoPrecio, setTipoPrecio] = useState<'normal' | 'sin_seguro' | 'gold' | 'silver' | 'odontologico'>('normal');
    const [showManual, setShowManual] = useState(false);
    const [isArancelModalOpen, setIsArancelModalOpen] = useState(false);

    const { clinicaSeleccionada, clinicas } = useClinica();
    const [clinicaId, setClinicaId] = useState<number>(clinicaSeleccionada || 0);
    const isClinica2 = clinicaId === 2;

    // Determine patient's insurance type for Selec Dental price filtering
    const seguroMedico = (paciente?.seguro_medico || '').toUpperCase();
    const isAlianzaGold = seguroMedico.includes('GOLD');
    const isAlianzaSilver = seguroMedico.includes('SILVER');
    const isAlianzaOdonto = seguroMedico.includes('ODONTOLOGICO') || seguroMedico.includes('ODONTOLÓGICO');
    const hasAlianza = isAlianzaGold || isAlianzaSilver || isAlianzaOdonto;

    // Global discounts per tab are removed as per user request
    // Global discounts per tab are removed as per user request
    const tabs = ['A', 'B', 'C', 'D', 'E', 'F'];

    const manualSections: ManualSection[] = [
        {
            title: 'Propuestas de Tratamiento',
            content: 'Las propuestas permiten crear múltiples opciones de tratamiento (A-F) para que el paciente elija. Cada opción puede tener diferentes tratamientos y precios.'
        },
        {
            title: 'Pestañas A-F',
            content: 'Use las pestañas para organizar hasta 6 propuestas diferentes. Agregue tratamientos a cada pestaña según las opciones que desea ofrecer al paciente.'
        },
        {
            title: 'Pasar a Plan de Tratamiento',
            content: 'Una vez que el paciente elija una propuesta, puede convertirla en plan de tratamiento oficial usando el botón "Pasar a Plan de Tratamiento".'
        }];

    // State for editing an item
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!isClinica2 || !hasAlianza || !selectedArancelId) return;
        // Auto-select the patient's insurance price when a treatment is selected
        if (isAlianzaGold) setTipoPrecio('gold');
        else if (isAlianzaSilver) setTipoPrecio('silver');
        else if (isAlianzaOdonto) setTipoPrecio('odontologico');
    }, [selectedArancelId, isClinica2, hasAlianza]);

    useEffect(() => {
        if (id) {
            fetchPaciente(Number(id));
            fetchAranceles(clinicaId);
        }
        if (propuestaId) {
            fetchPropuesta(Number(propuestaId));
        }
    }, [id, propuestaId, clinicaId]);

    useEffect(() => {
        if (!propuestaId && clinicaSeleccionada !== null) {
            setClinicaId(clinicaSeleccionada);
        }
    }, [clinicaSeleccionada, propuestaId]);

    const fetchPropuesta = async (propuestaId: number) => {
        try {
            const response = await api.get(`/propuestas/${propuestaId}`);
            const data = response.data;
            setNota(data.nota);
            setLetraHeader(data.letra || '');
            setFecha(data.fecha.split('T')[0]);

            // Discounts are no longer used

            // setNumero(data.numero);

            if (data.detalles) {
                const mappedDetalles = data.detalles.map((d: any) => ({
                    id: d.id,
                    letra: d.letra || 'A', // Default to A if missing
                    arancelId: d.arancel.id,
                    codigo: d.arancel.id.toString(),
                    tratamiento: d.arancel.detalle,
                    precioUnitario: Number(d.precioUnitario),
                    piezas: d.piezas,
                    cantidad: Number(d.cantidad),
                    total: Number(d.total),
                    posible: d.posible
                }));
                setDetalles(mappedDetalles);
            }
        } catch (error) {
            console.error('Error fetching propuesta:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo cargar la propuesta',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const fetchPaciente = async (pacienteId: number) => {
        try {
            const response = await api.get(`/pacientes/${pacienteId}`);
            setPaciente(response.data);
        } catch (error) {
            console.error('Error fetching paciente:', error);
        }
    };

    const fetchAranceles = async (cid?: number) => {
        try {
            const url = cid ? `/arancel?limit=1000&clinicaId=${cid}` : '/arancel?limit=1000';
            const response = await api.get(url);
            setAranceles(response.data.data || []);
        } catch (error) {
            console.error('Error fetching aranceles:', error);
        }
    };

    const handleAddItem = () => {
        if (!selectedArancelId) return;

        const arancel = aranceles.find(a => a.id === Number(selectedArancelId));
        if (!arancel) return;

        // Calcular precio según el tipo seleccionado
        let precioUsar: number;
        if (tipoPrecio === 'gold' && arancel.precio_gold != null) {
            precioUsar = Number(arancel.precio_gold);
        } else if (tipoPrecio === 'silver' && arancel.precio_silver != null) {
            precioUsar = Number(arancel.precio_silver);
        } else if (tipoPrecio === 'odontologico' && arancel.precio_odontologico != null) {
            precioUsar = Number(arancel.precio_odontologico);
        } else if (tipoPrecio === 'sin_seguro' && arancel.precio_sin_seguro != null) {
            precioUsar = Number(arancel.precio_sin_seguro);
        } else {
            precioUsar = Number(arancel.precio) || 0;
        }
            
        const total = precioUsar * cantidad;

        const newItem: DetalleItem = {
            id: editingIndex !== null ? detalles[editingIndex].id : undefined,
            letra: activeTab,
            arancelId: arancel.id,
            codigo: arancel.id.toString(),
            tratamiento: arancel.detalle,
            precioUnitario: precioUsar,
            piezas,
            cantidad,
            total,
            posible,
            tipoPrecio
        };

        if (editingIndex !== null) {
            const updatedDetalles = [...detalles];
            updatedDetalles[editingIndex] = newItem;
            setDetalles(updatedDetalles);
            setEditingIndex(null);
        } else {
            setDetalles([...detalles, newItem]);
        }

        // Reset form
        setSelectedArancelId(0);
        setPiezas('');
        setCantidad(1);
        setPosible(false);
        setTipoPrecio('normal');
    };

    const handleRemoveItem = (index: number) => {
        const newDetalles = [...detalles];
        newDetalles.splice(index, 1);
        setDetalles(newDetalles);

        if (editingIndex === index) {
            cancelEdit();
        } else if (editingIndex !== null && index < editingIndex) {
            setEditingIndex(editingIndex - 1);
        }
    };

    const handleEditItem = (index: number) => {
        // realIndex is the index in the filtered array, index is in the main array?
        // Wait, handleEditItem should receive the index in the 'detalles' array

        const item = detalles[index];
        setEditingIndex(index);

        // When editing, ensure we are on the correct tab (though we should strictly be editing visible items)
        if (item.letra !== activeTab) {
            setActiveTab(item.letra);
        }

        setSelectedArancelId(item.arancelId);
        setPiezas(item.piezas);
        setCantidad(item.cantidad);
        setPosible(item.posible);
        setTipoPrecio((item.tipoPrecio as any) || 'normal');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setSelectedArancelId(0);
        setPiezas('');
        setCantidad(1);
        setPosible(false);
        setTipoPrecio('normal');
    };

    const calculateTabSubTotal = () => {
        const tabItems = detalles.filter(d => d.letra === activeTab);
        return tabItems.reduce((sum, item) => sum + item.total, 0);
    };

    const calculateTabTotal = () => {
        return calculateTabSubTotal();
    };

    const calculateGrandTotal = () => {
        return tabs.reduce((totalAcc, tab) => {
            const tabItems = detalles.filter(d => d.letra === tab);
            const subTotal = tabItems.reduce((sum, item) => sum + item.total, 0);
            return totalAcc + subTotal;
        }, 0);
    };

    const handleSubmit = async () => {
        if (!paciente) return;



        try {
            const payload = {
                pacienteId: paciente.id,
                usuarioId: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : 1,
                nota,
                letra: letraHeader,
                fecha: new Date(fecha).toISOString(),
                total: calculateGrandTotal(),
                // discounts removed
                detalles: detalles.map(d => ({
                    id: d.id,
                    letra: d.letra,
                    arancelId: d.arancelId,
                    precioUnitario: d.precioUnitario,
                    piezas: d.piezas,
                    cantidad: d.cantidad,
                    total: d.total,
                    posible: d.posible
                }))
            };

            if (propuestaId) {
                await api.patch(`/propuestas/${propuestaId}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Propuesta Actualizada',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            } else {
                await api.post('/propuestas', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Propuesta Guardada',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
            setTimeout(() => {
                navigate(`/pacientes/${id}/propuestas`);
            }, 1500);
        } catch (error: any) {
            console.error('Error saving propuesta:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar',
                text: errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleConvertToBudget = async () => {
        if (!propuestaId) return;

        const result = await Swal.fire({
            title: 'Convertir a Plan de Tratamiento',
            text: `¿Crear un nuevo plan de tratamiento con los items de la Propuesta ${activeTab}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, crear',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        if (result.isConfirmed) {
            try {
                const usuarioId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : 1;
                const response = await api.post(`/propuestas/${propuestaId}/convertir`, {
                    letra: activeTab,
                    usuarioId: usuarioId
                });

                Swal.fire({
                    icon: 'success',
                    title: '¡Creado!',
                    text: 'El plan de tratamiento ha sido creado.',
                    showConfirmButton: false,
                    timer: 1500,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });

                navigate(`/pacientes/${id}/presupuestos/edit/${response.data.id}`);

            } catch (error: any) {
                console.error('Error converting to budget:', error);
                const errorMessage = error.response?.data?.message || 'Error al crear el plan de tratamiento';
                Swal.fire({
                    title: 'Error',
                    text: errorMessage,
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    return (
        <div className="content-card max-w-[1400px] mx-auto text-gray-800 dark:text-white bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-purple-600 dark:text-purple-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </span>
                    {propuestaId ? (isReadOnly ? 'Ver Propuesta' : 'Editar Propuesta') : 'Nueva Propuesta'}
                </h2>
                <button
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            {/* Header: Patient Info */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-600 mb-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Paciente</label>
                        <div className="text-xl font-bold text-gray-800 dark:text-white mt-1 flex items-center gap-2">
                            {paciente ? (
                                <>
                                    {paciente.nombre} {paciente.paterno} {paciente.materno}
                                    {paciente.seguro_medico && (
                                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-bold uppercase tracking-wider">
                                            {paciente.seguro_medico}
                                        </span>
                                    )}
                                </>
                            ) : 'Cargando...'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fecha</label>
                        {isReadOnly ? (
                            <div className="w-full mt-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-lg text-gray-800 dark:text-gray-200 font-medium h-[42px] flex items-center">
                                {formatDate(fecha)}
                            </div>
                        ) : (
                            <input
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="w-full mt-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 dark:text-gray-200"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs Navigation matching the standard model */}
            <div className="no-print flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-6 gap-2">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => {
                            if (!isReadOnly) {
                                cancelEdit(); // Cancel edit if switching tabs
                            }
                            setActiveTab(tab);
                        }}
                        className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center gap-2
                            ${activeTab === tab
                                ? 'bg-white dark:bg-gray-800 border-b-2 border-purple-500 text-purple-600 dark:text-purple-300 shadow-sm'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Propuesta {tab}
                    </button>
                ))}
            </div>

            {/* Item Entry Form */}
            {!isReadOnly && (
                <div className={`p-6 rounded-xl mb-8 border transition-all duration-300 ${editingIndex !== null ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600'}`}>
                    <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        {editingIndex !== null ? (
                            <>
                                <span className="p-1 bg-blue-100 dark:bg-blue-800 rounded text-blue-600 dark:text-blue-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </span>
                                Editar Item en Propuesta {activeTab}
                            </>
                        ) : (
                            <>
                                <span className="p-1 bg-green-100 dark:bg-green-800 rounded text-green-600 dark:text-green-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                </span>
                                Agregar Item a Propuesta {activeTab}
                            </>
                        )}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tratamiento</label>
                            <div className="relative">
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <SearchableSelect
                                            options={aranceles.map(a => {
                                                const itemMoneda = a.moneda || clinicas.find(c => c.id === clinicaId)?.monedaDefault || 'Bs.';
                                                let optionText = '';
                                                if (isClinica2) {
                                                    const parts = [];
                                                    // Solo mostrar los precios relevantes al seguro del paciente
                                                    if (isAlianzaGold) {
                                                        if (a.precio_gold != null) parts.push(`Gold: ${Number(a.precio_gold).toFixed(2)}`);
                                                        if (a.precio_sin_seguro != null) parts.push(`Privado: ${Number(a.precio_sin_seguro).toFixed(2)}`);
                                                    } else if (isAlianzaSilver) {
                                                        if (a.precio_silver != null) parts.push(`Silver: ${Number(a.precio_silver).toFixed(2)}`);
                                                        if (a.precio_sin_seguro != null) parts.push(`Privado: ${Number(a.precio_sin_seguro).toFixed(2)}`);
                                                    } else if (isAlianzaOdonto) {
                                                        if (a.precio_odontologico != null) parts.push(`Odont.: ${Number(a.precio_odontologico).toFixed(2)}`);
                                                        if (a.precio_sin_seguro != null) parts.push(`Privado: ${Number(a.precio_sin_seguro).toFixed(2)}`);
                                                    } else {
                                                        // Sin seguro específico: mostrar todos
                                                        if (a.precio_gold != null) parts.push(`Gold: ${Number(a.precio_gold).toFixed(2)}`);
                                                        if (a.precio_silver != null) parts.push(`Silver: ${Number(a.precio_silver).toFixed(2)}`);
                                                        if (a.precio_odontologico != null) parts.push(`Odont.: ${Number(a.precio_odontologico).toFixed(2)}`);
                                                        if (a.precio_sin_seguro != null) parts.push(`Privado: ${Number(a.precio_sin_seguro).toFixed(2)}`);
                                                    }
                                                    optionText = parts.length > 0 ? `${a.detalle} - ${parts.join(' | ')} ${itemMoneda}` : `${a.detalle} - Sin precios`;
                                                } else {
                                                    const precioNor = Number(a.precio).toFixed(2);
                                                    const precioSS = a.precio_sin_seguro != null ? Number(a.precio_sin_seguro).toFixed(2) : null;
                                                    optionText = precioSS ? `${a.detalle} - ${precioNor} | S/S: ${precioSS} ${itemMoneda}` : `${a.detalle} - ${precioNor} ${itemMoneda}`;
                                                }
                                                return { id: a.id, label: optionText };
                                            })}
                                            value={selectedArancelId}
                                            onChange={(val) => {
                                                setSelectedArancelId(Number(val));
                                                setTipoPrecio('normal');
                                            }}
                                            placeholder="-- Seleccione Tratamiento o Busque... --"
                                            className="w-full"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsArancelModalOpen(true)}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                        title="Crear Nuevo Arancel"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Selector de tipo de precio */}
                        {selectedArancelId !== 0 && (() => {
                            const arancel = aranceles.find(a => a.id === selectedArancelId);
                            if (!arancel) return null;
                            // Clínica 2: Gold, Silver, Odontológico, Sin Seguro
                            if (isClinica2) {
                                let opciones = [
                                    { key: 'gold' as const, label: 'Alianza Gold', precio: arancel.precio_gold },
                                    { key: 'silver' as const, label: 'Alianza Silver', precio: arancel.precio_silver },
                                    { key: 'odontologico' as const, label: 'Alianza Odontológico', precio: arancel.precio_odontologico },
                                    { key: 'sin_seguro' as const, label: 'Privado', precio: arancel.precio_sin_seguro },
                                ].filter(o => o.precio != null);

                                // Filter options based on patient insurance
                                if (isAlianzaGold) {
                                    opciones = opciones.filter(o => o.key === 'gold' || o.key === 'sin_seguro');
                                } else if (isAlianzaSilver) {
                                    opciones = opciones.filter(o => o.key === 'silver' || o.key === 'sin_seguro');
                                } else if (isAlianzaOdonto) {
                                    opciones = opciones.filter(o => o.key === 'odontologico' || o.key === 'sin_seguro');
                                }

                                if (opciones.length === 0) return null;
                                return (
                                    <div className="md:col-span-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Precio</label>
                                        <div className="flex flex-wrap gap-3">
                                            {opciones.map(op => (
                                                <label key={op.key} className={`flex-1 min-w-[120px] cursor-pointer border rounded-lg p-3 transition-colors ${
                                                    tipoPrecio === op.key
                                                        ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/30 dark:border-purple-400'
                                                        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <input
                                                                type="radio"
                                                                name="priceType"
                                                                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                                                checked={tipoPrecio === op.key}
                                                                onChange={() => setTipoPrecio(op.key)}
                                                            />
                                                            <span className="ml-2 font-semibold text-gray-800 dark:text-gray-100">{op.label}</span>
                                                        </div>
                                                        <span className="text-purple-600 dark:text-purple-300 font-bold">
                                                            {Number(op.precio).toFixed(2)} Bs.
                                                        </span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            // Otras clínicas: Normal y Sin Seguro
                            if (arancel.precio_sin_seguro == null) return null;
                            return (
                                <div className="md:col-span-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Precio</label>
                                    <div className="flex flex-wrap gap-4">
                                        <label className={`flex-1 cursor-pointer border rounded-lg p-3 transition-colors ${tipoPrecio === 'normal' ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/30 dark:border-purple-400' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <input type="radio" name="priceType" className="w-4 h-4 text-purple-600 focus:ring-purple-500" checked={tipoPrecio === 'normal'} onChange={() => setTipoPrecio('normal')} />
                                                    <span className="ml-2 font-semibold text-gray-800 dark:text-gray-100">Precio Normal</span>
                                                </div>
                                                <span className="text-purple-600 dark:text-purple-300 font-bold">{Number(arancel.precio).toFixed(2)} Bs.</span>
                                            </div>
                                        </label>
                                        <label className={`flex-1 cursor-pointer border rounded-lg p-3 transition-colors ${tipoPrecio === 'sin_seguro' ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/30 dark:border-purple-400' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <input type="radio" name="priceType" className="w-4 h-4 text-purple-600 focus:ring-purple-500" checked={tipoPrecio === 'sin_seguro'} onChange={() => setTipoPrecio('sin_seguro')} />
                                                    <span className="ml-2 font-semibold text-gray-800 dark:text-gray-100">Sin Seguro</span>
                                                </div>
                                                <span className="text-orange-600 dark:text-orange-400 font-bold">{Number(arancel.precio_sin_seguro).toFixed(2)} Bs.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            );
                        })()}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nº Pieza(s)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 00-1.219-1.343L8.88 4.5c-.832-.086-1.55.534-1.611 1.343l-.128 1.7a1 1 0 001.218 1.343l5.109-.432c.831-.087 1.55-.534 1.611-1.343l.132-1.7z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={piezas}
                                    onChange={(e) => setPiezas(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 dark:text-gray-200"
                                    placeholder="Ej: 18, 24"

                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 font-bold">#</span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(Number(e.target.value))}
                                    placeholder="1"
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 dark:text-gray-200"
                                />
                            </div>
                        </div>

                        <div className="flex items-end">
                            <label className="flex items-center cursor-pointer text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={posible}
                                        onChange={(e) => setPosible(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-5 bg-gray-300 rounded-full shadow-inner transition-colors ${posible ? 'bg-orange-400' : ''}`}></div>
                                    <div className={`dot absolute w-5 h-5 bg-white rounded-full shadow -left-1 -top-0 transition-transform ${posible ? 'transform translate-x-full bg-blue-500' : ''}`}></div>
                                </div>
                                <span className="ml-3 font-semibold select-none">POSIBLE TRATAMIENTO</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleAddItem}
                            className={`w-full md:w-auto min-w-[200px] py-2 px-4 rounded-lg shadow-md font-semibold text-white text-sm transition-all transform hover:-translate-y-0.5
                                ${editingIndex !== null
                                    ? 'bg-blue-600 hover:bg-blue-700'
                                    : 'bg-orange-500 hover:bg-orange-600'
                                }`}
                        >
                            {editingIndex !== null ? 'Actualizar Tratamiento' : 'Agregar Tratamiento'}
                        </button>
                        {editingIndex !== null && (
                            <button
                                onClick={cancelEdit}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors flex items-center gap-2">

                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> Cancelar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Items Table for Active Tab */}
            <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
                        </svg>
                        Tratamientos de Propuesta {activeTab}
                    </h4>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nº</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamiento</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Piezas</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">P.U.</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant.</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SubTotal</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Posible</th>
                                {!isReadOnly && <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acción</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {detalles.map((item, index) => {
                                // Only render items for the active tab
                                if (item.letra !== activeTab) return null;

                                return (
                                    <tr key={index} className={`
                                        ${editingIndex === index
                                            ? 'bg-blue-50 dark:bg-blue-900/30'
                                            : item.posible
                                                ? 'bg-yellow-50 dark:bg-yellow-900/10'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        } transition-colors
                                    `}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{item.tratamiento}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{item.piezas}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{item.precioUnitario.toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{item.cantidad}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right font-medium">{item.total.toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.posible ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                {item.posible ? 'SÍ' : 'NO'}
                                            </span>
                                        </td>
                                        {!isReadOnly && (
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditItem(index)}
                                                        className="p-1.5 bg-transparent text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="p-1.5 bg-transparent text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {detalles.filter(d => d.letra === activeTab).length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No hay items registrados en esta propuesta.
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: Total and Note */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-600">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nota (General)</label>
                        <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            disabled={isReadOnly}
                            className="w-full h-32 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 dark:text-gray-200 resize-none transition-colors"
                            placeholder="Ingrese una nota o comentario general para la propuesta (opcional)..."

                        />
                    </div>

                    <div className="flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 pb-2">
                                <span className="uppercase tracking-wide">SubTotal Propuesta {activeTab}</span>
                                <span className="text-gray-800 dark:text-white font-semibold text-lg">{calculateTabSubTotal().toFixed(2)} Bs.</span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">TOTAL PROPUESTA {activeTab}</span>
                                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                                    {calculateTabTotal().toFixed(2)} <span className="text-xl text-gray-500 dark:text-gray-400">Bs.</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex justify-start gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                            {!isReadOnly && (
                                <button
                                    onClick={handleSubmit}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    Guardar
                                </button>
                            )}

                            {propuestaId && (
                                <button
                                    onClick={handleConvertToBudget}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Pasar a Plan de Tratamiento
                                </button>
                            )}

                            <button
                                onClick={() => navigate(`/pacientes/${id}/propuestas`)}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                {isReadOnly ? 'Volver' : 'Cancelar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <ArancelForm
                isOpen={isArancelModalOpen}
                onClose={() => setIsArancelModalOpen(false)}
                onSaveSuccess={() => {
                    fetchAranceles(clinicaId || 0);
                    setIsArancelModalOpen(false);
                }}
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Propuestas"
                sections={manualSections}
            />
        </div >
    );
};
export default PropuestasForm;
