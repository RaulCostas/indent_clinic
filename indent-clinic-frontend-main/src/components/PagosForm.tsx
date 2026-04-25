import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import Swal from 'sweetalert2';
import type { Paciente, Proforma, Pago, ComisionTarjeta } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import FormaPagoForm from './FormaPagoForm';
import ComisionTarjetaForm from './ComisionTarjetaForm';
import { Printer, Lock } from 'lucide-react';
import SearchableSelect from './SearchableSelect';


interface PagosFormProps {
    isModal?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
    onSuccess?: () => void;
    pacienteIdProp?: number;
    pagoIdProp?: number | null;
    proformaIdProp?: number | null;
    montoProp?: number | null;
    tratamientoIdProp?: number | null;
    pacienteNombreProp?: string;
    isRefund?: boolean;
}

const PagosForm: React.FC<PagosFormProps> = ({ 
    isModal, 
    isOpen, 
    onClose, 
    onSuccess, 
    pacienteIdProp, 
    pagoIdProp, 
    proformaIdProp, 
    montoProp, 
    tratamientoIdProp, 
    pacienteNombreProp,
    isRefund
}) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!pagoIdProp || (!isModal && !!id);
    const location = useLocation();
    const queryPacienteId = Number(new URLSearchParams(location.search).get('pacienteId') || 0);
    const { clinicaActual, clinicaSeleccionada } = useClinica();
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [filteredProformas, setFilteredProformas] = useState<Proforma[]>([]);
    const [existingPagos, setExistingPagos] = useState<Pago[]>([]);
    const [allPagos, setAllPagos] = useState<Pago[]>([]); // New state for all payments

    const [comisiones, setComisiones] = useState<ComisionTarjeta[]>([]);
    const [formasPago, setFormasPago] = useState<any[]>([]); // Dynamic payment methods
    const [tratamientosPlan, setTratamientosPlan] = useState<any[]>([]);
    const [selectedTreatments, setSelectedTreatments] = useState<number[]>([]);
    const [assignments, setAssignments] = useState<Record<number, { amount: number, discount: number }>>({});


    const [formData, setFormData] = useState({
        pacienteId: pacienteIdProp || (isModal ? Number(id) : 0) || queryPacienteId,
        fecha: getLocalDateString(),
        proformaId: 0,
        monto: '',
        moneda: 'Bolivianos',
        tc: 0,
        recibo: '',
        factura: '',
        formaPagoId: 0, // Add formaPagoId
        comisionTarjetaId: '',
        descuento: '',
        observaciones: ''
    });
    const [showManual, setShowManual] = useState(false);
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

    // Modales y Permisos para creación rápida
    const [isFormaPagoModalOpen, setIsFormaPagoModalOpen] = useState(false);
    const [isComisionModalOpen, setIsComisionModalOpen] = useState(false);
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

    const puedeCrearAtributo = !userPermisos.includes('configuracion');

    const handleSendWhatsapp = async () => {
        if (!formData.pacienteId) return;

        setSendingWhatsapp(true);
        try {
            const response = await api.post('/pagos/whatsapp', {
                pacienteId: formData.pacienteId,
                proformaId: formData.proformaId > 0 ? formData.proformaId : undefined
            });

            if (response.data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Enviado',
                    text: 'El historial de pagos se envió por WhatsApp correctamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message || 'No se pudo enviar el mensaje.'
                });
            }
        } catch (error: any) {
            console.error('Error sending whatsapp:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al enviar por WhatsApp'
            });
        } finally {
            setSendingWhatsapp(false);
        }
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Registrar Pagos',
            content: 'Registre los pagos de los pacientes asociados a sus planes de tratamiento. Puede aplicar pagos parciales o totales, y el sistema calcula automáticamente el saldo pendiente.'
        },
        {
            title: 'Formas de Pago',
            content: 'Seleccione la forma de pago (Efectivo, Tarjeta, Transferencia, etc.). Para pagos con tarjeta, puede aplicar comisiones configuradas previamente.'
        },
        {
            title: 'Saldo a Favor',
            content: 'Si el pago excede el monto del plan de tratamiento, se genera un saldo a favor que puede transferirse a otro plan de tratamiento del mismo paciente.'
        },
        {
            title: 'Historial de Pagos',
            content: 'Vea el historial completo de pagos del paciente y el estado de cada plan de tratamiento (pagado, pendiente, saldo).'
        }];

    useEffect(() => {
        // fetchPacientes removed - redundant in tab mode
        fetchComisiones();
        fetchFormasPago();
        
        // Cargar pago si hay un ID específico (pagoIdProp) o si estamos en página de edición (!isModal)
        const targetPagoId = pagoIdProp || (!isModal ? Number(id) : undefined);
        
        if (targetPagoId) {
            fetchPago(Number(targetPagoId));
        } else {
            if (proformaIdProp) {
                setFormData(prev => ({ ...prev, proformaId: Number(proformaIdProp) }));
            }
            if (montoProp) {
                setFormData(prev => ({ ...prev, monto: String(Number(montoProp).toFixed(2)) }));
            }
        }
    }, [id, clinicaSeleccionada, isModal, pagoIdProp, proformaIdProp, montoProp, tratamientoIdProp]);

    useEffect(() => {
        if (formData.pacienteId) {
            fetchProformasByPaciente(formData.pacienteId);
            fetchExistingPagos(formData.pacienteId, formData.proformaId);
            if (formData.proformaId > 0) {
                fetchTreatmentsByProforma(formData.proformaId);
            } else {
                setTratamientosPlan([]);
                // No limpiar la selección si venimos con un tratamiento específico desde las props (ej: Consulta terminada)
                if (!tratamientoIdProp) {
                    setSelectedTreatments([]);
                }
            }
        } else {
            setFilteredProformas([]);
            setExistingPagos([]);
            setAllPagos([]);
            setTratamientosPlan([]);
            setSelectedTreatments([]);
        }
    }, [formData.pacienteId, formData.proformaId]);
                                    
    const isPagoBloqueado = (fecha: string) => {
        // En este sistema, 'permisos' es una lista de RESTRICCIONES.
        // Si 'cerrar-caja' NO está en la lista, el usuario NO tiene restricción (es Admin/Manager).
        if (!userPermisos.includes('cerrar-caja')) return false;

        if (!clinicaActual?.fecha_cierre_caja) return false;
        return fecha <= clinicaActual.fecha_cierre_caja;
    };

    // Fuente Única de Verdad: Tratamientos con saldos rebalanceados basados en la tabla de Pagos
    const balancedTreatments = useMemo(() => {
        const totalPaidInProforma = allPagos
            .filter(p => {
                const pId = p.proformaId || (p as any).proforma?.id;
                return pId && Number(pId) === Number(formData.proformaId) && p.id !== pagoIdProp;
            })
            .reduce((acc, p) => acc + Number(p.monto), 0);
        
        const discountValue = Number(formData.descuento) || 0;
        
        // El descuento se aplica al tratamiento específico (tratamientoIdProp), 
        // o si hay un solo tratamiento seleccionado (comportamiento esperado del usuario)
        const targetTratId = tratamientoIdProp 
            ? Number(tratamientoIdProp) 
            : (selectedTreatments.length === 1 ? selectedTreatments[0] : null);

        let pool = totalPaidInProforma;
        
        // Rebalanceo cronológico: Ordenamos por fecha ASC para asignar el dinero
        const sortedForBalance = [...tratamientosPlan].sort((a, b) => 
            new Date(a.fecha).getTime() - new Date(b.fecha).getTime() || a.id - b.id
        );

        if (isModal && !isOpen) return [];

        return sortedForBalance.map(t => {
            let discountAmount = Number(t.descuento || 0);
            
            // Si es el tratamiento objetivo
            if (t.id === targetTratId) {
                const discountInput = String(formData.descuento || '').trim();
                if (discountInput !== '') {
                    // OVERRIDE total: lo que está en la caja de texto MANDA sobre la BD
                    discountAmount = Number(discountInput);
                } else {
                    // Si la caja está vacía, su intención es resetear a 0 el descuento
                    // para ver el precio completo (ej. 70) en lugar del precio guardado (ej. 68)
                    discountAmount = 0;
                }
            }

            const netPrice = Math.max(0, Number(t.precio) - discountAmount);
            
            const paid = Math.min(pool, netPrice);
            pool -= paid;
            return {
                ...t,
                computedDiscount: discountAmount,
                netPrice,
                balancedPaid: paid,
                balancedSaldo: netPrice - paid
            };
        });
    }, [tratamientosPlan, allPagos, formData.proformaId, formData.descuento, selectedTreatments, tratamientoIdProp, isModal, isOpen]);

    const toggleTreatment = (id: number) => {
        setSelectedTreatments(prev => {
            const isSelected = prev.includes(id);
            if (isSelected) {
                // Remove from selection and assignments
                const newAssignments = { ...assignments };
                delete newAssignments[id];
                setAssignments(newAssignments);
                return prev.filter(tId => tId !== id);
            } else {
                // Add to selection and initialize assignment
                const trat = balancedTreatments.find(t => t.id === id);
                setAssignments(a => ({
                    ...a,
                    [id]: { amount: trat?.remainingToPay || 0, discount: 0 }
                }));
                return [...prev, id];
            }
        });
    };

    const updateAssignment = (id: number, field: 'amount' | 'discount', value: number) => {
        setAssignments(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || { amount: 0, discount: 0 }),
                [field]: value
            }
        }));
    };
    useEffect(() => {
        if (montoProp !== undefined && montoProp !== null) {
            setFormData(prev => ({ ...prev, monto: String(Number(montoProp).toFixed(2)) }));
        }
        if (tratamientoIdProp) {
            const tId = Number(tratamientoIdProp);
            // Ensure ID is selected
            if (!selectedTreatments.includes(tId)) {
                setSelectedTreatments([tId]);
            }
            // Ensure assignment exists
            setAssignments(prev => {
                if (prev[tId]) return prev; // Don't wipe existing manual changes
                return {
                    ...prev,
                    [tId]: { amount: Number(montoProp || 0), discount: Number(formData.descuento || 0) }
                };
            });
        }
    }, [montoProp, tratamientoIdProp, tratamientosPlan]); // Re-run when tre    // Update main monto when assignments change (Auto-summing logic)
    useEffect(() => {
        // PROTECCIÓN: Si estamos en modo tratamiento específico (modal $), 
        // el usuario edita directamente los campos principales. 
        // No debemos auto-sumar porque crearíamos un ciclo de actualizaciones
        // que bloquea el teclado y hace saltar el cursor.
        if (tratamientoIdProp) return;

        const selectedIds = selectedTreatments.map(id => Number(id));
        let totalAmount = 0;
        let totalDiscount = 0;

        selectedIds.forEach(id => {
            if (assignments[id]) {
                totalAmount += Number(assignments[id].amount || 0);
                totalDiscount += Number(assignments[id].discount || 0);
            }
        });

        if (selectedIds.length > 0) {
            setFormData(prev => {
                // Comparamos numéricamente para evitar actualizaciones innecesarias por decimales
                const currentMonto = Number(prev.monto) || 0;
                const currentDesc = Number(prev.descuento) || 0;

                if (Math.abs(currentMonto - totalAmount) < 0.01 && 
                    Math.abs(currentDesc - totalDiscount) < 0.01) {
                    return prev;
                }
                
                return { 
                    ...prev, 
                    monto: totalAmount.toString(),
                    descuento: totalDiscount.toString()
                };
            });
        }
    }, [assignments, selectedTreatments, tratamientoIdProp]);

    // Automatic Selection Logic (ONE WAY)
    useEffect(() => {
        // Only run FIFO selection if we ARE NOT in "Specific Treatment" mode
        if (tratamientoIdProp || (isEditing && selectedTreatments.length === 1)) return;

        const monto = Number(formData.monto);
        if (monto > 0 && balancedTreatments.length > 0) {
            let runningTotal = 0;
            let newSelection: number[] = [];
            
            // 1. Terminado first
            for (const trat of balancedTreatments) {
                if (runningTotal >= monto) break;
                if (trat.balancedSaldo <= 0.01) continue;
                if (trat.estadoTratamiento === 'terminado') {
                    newSelection.push(trat.id);
                    runningTotal += trat.balancedSaldo;
                }
            }
            // 2. Others
            for (const trat of balancedTreatments) {
                if (runningTotal >= monto) break;
                if (trat.balancedSaldo <= 0.01 || newSelection.includes(trat.id)) continue;
                newSelection.push(trat.id);
                runningTotal += trat.balancedSaldo;
            }
            
            // Critical: Only update if content is actually different to avoid render loops
            if (JSON.stringify(newSelection) !== JSON.stringify(selectedTreatments)) {
                setSelectedTreatments(newSelection);
            }
        } else if (monto === 0 && selectedTreatments.length > 0 && !tratamientoIdProp) {
            // Solo limpiar si NO estamos en modo de tratamiento específico
            setSelectedTreatments([]);
        }
    }, [formData.monto, balancedTreatments, tratamientoIdProp, isEditing]);

    /* // Lógica de monto automático desactivada para dar control total al usuario
    useEffect(() => {
        // Identificar el tratamiento objetivo
        const targetId = tratamientoIdProp 
            ? Number(tratamientoIdProp) 
            : (selectedTreatments.length === 1 ? selectedTreatments[0] : null);

        // PROTECCIÓN CRÍTICA: Nunca auto-actualizar el monto si estamos EDITANDO un pago ya existente.
        if (!targetId || isEditing) return;

        // Comprobación de si debemos omitir la ejecución (ej: carga inicial con monto sugerido)
        const isInitialState = Number(formData.monto) === Number(montoProp) && !formData.descuento;
        if (montoProp && isInitialState) return;

        const targetTrat = balancedTreatments.find(t => t.id === targetId);
        if (targetTrat) {
            const expectedMonto = targetTrat.balancedSaldo;
            
            if (Math.abs(Number(formData.monto || 0) - expectedMonto) > 0.01) {
                setFormData(prev => ({ ...prev, monto: String(expectedMonto.toFixed(2)) }));
            }
        }
    }, [formData.descuento, balancedTreatments, tratamientoIdProp]); 
    */



    // fetchPacientes removed - redundant in tab mode

    const fetchProformasByPaciente = async (pacienteId: number) => {
        try {
            const response = await api.get(`/proformas/paciente/${pacienteId}`);
            const data = response.data || [];
            // Sort by number ascending (No. 1, No. 2, ...)
            setFilteredProformas(data.sort((a: any, b: any) => (Number(a.numero) || 0) - (Number(b.numero) || 0)));
        } catch (error) {
            console.error('Error fetching proformas by paciente:', error);
            setFilteredProformas([]);
        }
    };

    const fetchComisiones = async () => {
        try {
            const response = await api.get('/comision-tarjeta');
            const activeComisiones = (response.data.data || response.data || []).filter((com: any) => com.estado === 'activo');
            setComisiones(activeComisiones);
        } catch (error) {
            console.error('Error fetching comisiones:', error);
        }
    };

    const fetchFormasPago = async () => {
        try {
            const response = await api.get('/forma-pago?limit=100');
            // Check structure of response (paginated or array)
            const data = response.data.data ? response.data.data : response.data;
            setFormasPago(data || []);
            // Set default if exists
            if (data && data.length > 0 && !formData.formaPagoId) {
                // Logic to select 'Efectivo' by default if exists
                const efectivo = data.find((fp: any) => fp.forma_pago.toLowerCase() === 'efectivo');
                if (efectivo) {
                    setFormData(prev => ({ ...prev, formaPagoId: efectivo.id }));
                }
            }
        } catch (error) {
            console.error('Error fetching formas pago:', error);
        }
    };

    const fetchPago = async (pagoId: number) => {
        try {
            const response = await api.get(`/pagos/${pagoId}`);
            const pago = response.data;
            
            // Extraer el descuento si existe en el Record de tratamientosDescuentos
            let storedDescuento = '';
            if (pago.tratamientosDescuentos) {
                const discounts = Object.values(pago.tratamientosDescuentos);
                if (discounts.length > 0) {
                    storedDescuento = String(discounts[0]);
                }
            }

            setFormData({
                pacienteId: pago.pacienteId,
                fecha: pago.fecha, // Assuming format YYYY-MM-DD
                proformaId: pago.proformaId || 0,
                monto: String(pago.monto),
                moneda: pago.moneda || 'Bolivianos',
                tc: Number(pago.tc),
                recibo: pago.recibo || '',
                factura: pago.factura || '',
                formaPagoId: pago.formaPagoId || (pago.formaPagoRel ? pago.formaPagoRel.id : 0),
                comisionTarjetaId: pago.comisionTarjetaId || '',
                descuento: storedDescuento,
                observaciones: pago.observaciones || ''
            });

            // Si el pago está vinculado a un único tratamiento, forzamos esa selección
            if (pago.historiaClinicaIds && pago.historiaClinicaIds.length === 1) {
                setSelectedTreatments([Number(pago.historiaClinicaIds[0])]);
            }
        } catch (error) {
            console.error('Error fetching pago:', error);
        }
    };

    const fetchExistingPagos = async (pacienteId: number, proformaId: number) => {
        try {
            const response = await api.get(`/pagos/paciente/${pacienteId}`);
            let pagos = response.data || [];
            setAllPagos(pagos); // Store all payments for the patient
            if (proformaId) {
                pagos = pagos.filter((p: Pago) => {
                    const pId = p.proformaId || (p as any).proforma?.id;
                    return pId && Number(pId) === Number(proformaId);
                });
            }
            console.log('Pagos fetching result:', pagos);
            setExistingPagos(pagos);
        } catch (error) {
            console.error('Error fetching existing pagos:', error);
        }
    };

    const fetchTreatmentsByProforma = async (proformaId: number) => {
        try {
            const response = await api.get(`/historia-clinica/proforma/${proformaId}`);
            const data = response.data || [];
            setTratamientosPlan(data);
            // ONLY reset if we ARE NOT in "Specific Treatment" mode
            if (!tratamientoIdProp) {
                setSelectedTreatments([]);
            }
        } catch (error) {
            console.error('Error fetching treatments by proforma:', error);
            setTratamientosPlan([]);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos/${id}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'Pago eliminado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
                // Refresh data
                if (formData.pacienteId) {
                    fetchExistingPagos(formData.pacienteId, formData.proformaId);

                }
            } catch (error) {
                console.error('Error deleting pago:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar el pago'
                });
            }
        }
    };

    const handlePrint = () => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            document.body.removeChild(iframe);
            return;
        }


        const pacienteNombre = pacientes.find(p => p.id === formData.pacienteId);
        const proformaNombre = proformas.find(p => p.id === formData.proformaId);

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Historial de Pagos</title>
                <style>
                    @page {
                        size: A4;
                        margin: 2cm 1.5cm 3cm 1.5cm;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        color: #333;
                    }
                    
                    .header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid #3498db;
                    }
                    
                    .header img {
                        height: 60px;
                        margin-right: 20px;
                    }
                    
                    h1 {
                        color: #2c3e50;
                        margin: 0;
                        font-size: 24px;
                    }
                    
                    .patient-info {
                        margin: 15px 0;
                        padding: 10px;
                        background-color: #f8f9fa;
                        border-left: 4px solid #3498db;
                    }
                    
                    .patient-info p {
                        margin: 5px 0;
                        font-size: 12px;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    
                    th {
                        background-color: #3498db;
                        color: white;
                        padding: 12px 8px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #2980b9;
                        font-size: 11px;
                    }
                    
                    td {
                        padding: 8px;
                        border: 1px solid #ddd;
                        font-size: 10px;
                    }
                    
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    
                    
                    @media print {
                        body {
                            margin: 0;
                        }
                        
                        th {
                            background-color: #3498db !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f8f9fa !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .patient-info {
                            background-color: #f8f9fa !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${clinicaActual?.logo || ''}" alt="Logo">
                    <h1>Historial de Pagos</h1>
                </div>
                
                <div class="patient-info">
                    <p><strong>Paciente:</strong> ${pacienteNombre ? `${pacienteNombre.paterno} ${pacienteNombre.materno} ${pacienteNombre.nombre}` : 'N/A'}</p>
                    ${proformaNombre ? `<p><strong>Plan de Tratamiento:</strong> No. ${proformaNombre.numero} - Total: ${proformaNombre.total} Bs</p>` : ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Moneda</th>
                            <th>Forma Pago</th>
                            <th>Recibo/Factura</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${existingPagos.map(pago => {
            const isDollar = pago.moneda === 'Dólares';
            const displayMonto = isDollar
                ? `${Number(pago.monto).toFixed(2)} (TC: ${Number(pago.tc).toFixed(2)})`
                : Number(pago.monto).toFixed(2);
            const displayMoneda = pago.moneda || 'Bolivianos';

            return `
                                <tr>
                                    <td>${formatDate(pago.fecha)}</td>
                                    <td>${displayMonto}</td>
                                    <td>${displayMoneda}</td>
                                    <td>${pago.formaPagoRel?.forma_pago || '-'}</td>
                                    <td>${pago.recibo ? `R: ${pago.recibo}` : pago.factura ? `F: ${pago.factura}` : '-'}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                    <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Resumen Financiero</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #3498db;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Total Plan de Tratamiento:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #2c3e50;">Bs. ${totalPresupuesto.toFixed(2)}</div>
                        </div>
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #27ae60;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Pagado por Paciente:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #27ae60;">Bs. ${totalPagado.toFixed(2)}</div>
                        </div>
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #3498db;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Saldo a Favor:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #3498db;">Bs. ${saldoFavor.toFixed(2)}</div>
                        </div>
                        <div style="padding: 10px; background-color: white; border-radius: 4px; border-left: 4px solid #e74c3c;">
                            <div style="font-size: 11px; color: #666; margin-bottom: 5px;">Saldo en Contra:</div>
                            <div style="font-size: 16px; font-weight: bold; color: #e74c3c;">Bs. ${saldoContra.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                
                

            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        // Wait for images to load (like logo) before printing
        const logo = doc.querySelector('img');

        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
                // Remove iframe after sufficient time
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                }, 2000);
            }
        };

        if (logo) {
            if (logo.complete) {
                doPrint();
            } else {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            }
        } else {
            doPrint();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const newData = { ...prev, [name]: name.includes('Id') ? Number(value) : value };
            
            // Lógica solicitada: Si se digita un descuento, restar del monto inicial (montoProp)
            if (name === 'descuento' && montoProp && !isEditing) {
                const disc = Number(value) || 0;
                const initial = Number(montoProp) || 0;
                newData.monto = String(Math.max(0, initial - disc).toFixed(2));
            }
            
            return newData;
        });

        // Sync main field changes back to the single assignment if we are in target mode
        if (tratamientoIdProp && (name === 'monto' || name === 'descuento')) {
            const tId = Number(tratamientoIdProp);
            setAssignments(prev => {
                const current = prev[tId] || { amount: 0, discount: 0 };
                
                // Si cambiamos descuento, el monto en la asignación también debe actualizarse 
                // para mantener la consistencia con lo que el usuario ve en la caja principal
                let newAmount = current.amount;
                if (name === 'descuento' && montoProp && !isEditing) {
                    newAmount = Math.max(0, Number(montoProp) - (Number(value) || 0));
                } else if (name === 'monto') {
                    newAmount = Number(value) || 0;
                }

                return {
                    ...prev,
                    [tId]: {
                        amount: newAmount,
                        discount: name === 'descuento' ? (Number(value) || 0) : current.discount
                    }
                };
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Cierre de Caja
        if (isEditing && isPagoBloqueado(formData.fecha)) {
            Swal.fire({
                icon: 'error',
                title: 'Registro Bloqueado',
                text: `No se puede modificar este pago porque la caja para la fecha ${formatDate(formData.fecha)} ya está cerrada.`
            });
            return;
        }

        try {
            let finalMonto = Number(formData.monto);
            
            // Si es una devolución, nos aseguramos de que el número sea negativo
            if (isRefund) {
                finalMonto = -Math.abs(finalMonto);
            }

            let finalMoneda = formData.moneda;
            let finalObservaciones = formData.observaciones;

            if (formData.moneda === 'Dólares') {
                // finalMonto = finalMonto * Number(formData.tc); // REMOVED: Do not convert
                // finalMoneda = 'Bolivianos'; // REMOVED: Keep as Dólares
                const obsDetalle = `(Cancelado en Dólares: $${formData.monto} - TC: ${formData.tc})`;
                finalObservaciones = finalObservaciones ? `${finalObservaciones} ${obsDetalle}` : obsDetalle;
            }

            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            const payload = {
                idUsuario: user?.id,
                pacienteId: Number(formData.pacienteId),
                fecha: formData.fecha,
                monto: finalMonto,
                moneda: finalMoneda,
                tc: Number(formData.tc),
                recibo: formData.recibo,
                factura: formData.factura,
                formaPagoId: formData.formaPagoId > 0 ? Number(formData.formaPagoId) : undefined,
                observaciones: finalObservaciones,
                proformaId: formData.proformaId > 0 ? Number(formData.proformaId) : undefined,
                comisionTarjetaId:
                    formData.formaPagoId && formasPago.find(fp => fp.id === formData.formaPagoId)?.forma_pago?.toLowerCase() === 'tarjeta' && Number(formData.comisionTarjetaId) > 0
                        ? Number(formData.comisionTarjetaId)
                        : undefined,
                monto_comision:
                    formData.formaPagoId && formasPago.find(fp => fp.id === formData.formaPagoId)?.forma_pago?.toLowerCase() === 'tarjeta' && Number(formData.comisionTarjetaId) > 0
                        ? (finalMonto * (comisiones.find(c => c.id === Number(formData.comisionTarjetaId))?.monto || 0)) / 100
                        : undefined,
                // NEW: Send manual assignments based on selected treatments
                assignments: (() => {
                    const asgns = selectedTreatments
                        .filter(id => id > 0)
                        .map(id => ({
                            historiaClinicaId: Number(id),
                            monto: assignments[Number(id)]?.amount || 0,
                            descuento: assignments[Number(id)]?.discount || 0
                        }));
                    
                    // FALLBACK: If selectedTreatments is somehow empty but we have a target
                    if (asgns.length === 0 && tratamientoIdProp) {
                        return [{
                            historiaClinicaId: Number(tratamientoIdProp),
                            monto: finalMonto,
                            descuento: Number(formData.descuento || 0)
                        }];
                    }
                    return asgns;
                })(),
                clinicaId: (clinicaSeleccionada && Number(clinicaSeleccionada) > 0) ? Number(clinicaSeleccionada) : undefined,
            };

            console.log('%c[PAGOS_AUDIT] Payload listo para enviar:', 'color: #00ff00; font-weight: bold;', payload);
            
            const finalPagoId = pagoIdProp || (!isModal ? Number(id) : undefined);

            if (finalPagoId) {
                console.log(`[PAGOS_AUDIT] Ejecutando PATCH /pagos/${finalPagoId}`);
                await api.patch(`/pagos/${finalPagoId}`, payload);
            } else {
                console.log(`[PAGOS_AUDIT] Ejecutando POST /pagos`);
                await api.post('/pagos', payload);
            }

            const isEditing = !!finalPagoId;
            Swal.fire({
                icon: 'success',
                title: isRefund ? 'Devolución Registrada' : (isEditing ? 'Pago Actualizado' : 'Pago Registrado'),
                text: isRefund ? 'La devolución se registró correctamente' : (isEditing ? 'Pago actualizado correctamente' : 'Pago registrado exitosamente'),
                timer: 1500,
                showConfirmButton: false
            });
            setTimeout(() => {
                if (onSuccess) {
                onSuccess();
            } else {
                navigate(`/pacientes/${formData.pacienteId}/pagos`);
            }
            }, 1500);
        } catch (error: any) {
            console.error('Error saving pago:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al guardar el pago';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
            });
        }
    };


    // Calculation logic lifted for access
    const totalPresupuesto = useMemo(() => 
        balancedTreatments.reduce((acc, t) => acc + t.netPrice, 0)
    , [balancedTreatments]);

    const totalPagado = allPagos
        .filter(p => !p.proformaId || p.proformaId === formData.proformaId)
        .reduce((acc, curr) => {
            let amount = Number(curr.monto);
            if (curr.moneda === 'Dólares') {
                amount = amount * Number(curr.tc);
            }
            return acc + amount;
        }, 0);

    // NUEVOS CÁLCULOS CENTRALIZADOS EN HISTORIA CLÍNICA
    const totalEjecutado = useMemo(() => 
        balancedTreatments.filter(t => t.estadoTratamiento === 'terminado')
            .reduce((acc, t) => acc + t.netPrice, 0)
    , [balancedTreatments]);

    const pagadoSobreEjecutado = useMemo(() => 
        balancedTreatments.filter(t => t.estadoTratamiento === 'terminado')
            .reduce((acc, t) => acc + t.balancedPaid, 0)
    , [balancedTreatments]);

    const deudaReal = Math.max(0, totalEjecutado - pagadoSobreEjecutado);
    const anticipoDisponible = Math.max(0, totalPagado - pagadoSobreEjecutado);

    const saldo = totalPagado - totalPresupuesto;
    const saldoFavor = saldo > 0 ? saldo : 0;
    const saldoContra = saldo < 0 ? Math.abs(saldo) : 0;

    // Transfer Modal States
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [targetPacienteId, setTargetPacienteId] = useState(0);
    const [targetProformas, setTargetProformas] = useState<Proforma[]>([]);
    const [targetProformaId, setTargetProformaId] = useState(0);
    const [transferAmount, setTransferAmount] = useState<number>(0);

    const handlePasarSaldo = async () => {
        setTransferAmount(saldoFavor);
        setShowTransferModal(true);
        // Fetch patients only when needed for transfer
        if (pacientes.length === 0) {
            try {
                const response = await api.get('/pacientes?limit=10000&minimal=true');
                const data = response.data.data || [];
                setPacientes(data.filter((p: any) => p.estado === 'activo'));
            } catch (error) {
                console.error("Error fetching patients for transfer", error);
            }
        }
    };

    const handleTargetPacienteChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pId = Number(e.target.value);
        setTargetPacienteId(pId);
        setTargetProformaId(0);
        if (pId > 0) {
            try {
                // Fetch proformas for targeted patient
                const response = await api.get(`/proformas?pacienteId=${pId}`);
                setTargetProformas(response.data || []);
            } catch (error) {
                console.error("Error setting target proformas", error);
            }
        } else {
            setTargetProformas([]);
        }
    };

    const confirmTransfer = async () => {
        if (!targetPacienteId) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione un paciente destino' });
            return;
        }
        if (transferAmount <= 0) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'El monto debe ser mayor a 0' });
            return;
        }
        if (transferAmount > saldoFavor) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'El monto no puede superar el saldo a favor' });
            return;
        }

        const sPid = Number(formData.pacienteId);
        const sProfId = Number(formData.proformaId) || 0;
        const tPid = Number(targetPacienteId);
        const tProfId = Number(targetProformaId) || 0;

        if (sPid === tPid && sProfId === tProfId) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se puede transferir al mismo plan de tratamiento del mismo paciente.' });
            return;
        }

        try {
            await api.post('/pagos/transferir-saldo', {
                sourcePacienteId: Number(formData.pacienteId),
                sourceProformaId: Number(formData.proformaId) || null,
                targetPacienteId: Number(targetPacienteId),
                targetProformaId: Number(targetProformaId) || null, // Optional?
                amount: Number(transferAmount)
            });

            Swal.fire({
                icon: 'success',
                title: 'Transferencia Exitosa',
                text: 'Transferencia realizada con éxito',
                timer: 1500,
                showConfirmButton: false
            });
            setShowTransferModal(false);
            // Refresh data
            await fetchExistingPagos(formData.pacienteId, formData.proformaId);
            // Optionally refresh balance calculation... it's derived from pagos, so fetching pagos updates it.
        } catch (error: any) {
            console.error("Error transferring balance", error);
            const msg = error.response?.data?.message || "Error al realizar la transferencia";
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg
            });
        }
    };

    const handlePrintRecibo = (pagoId: number) => {
        window.open(`${api.defaults.baseURL}/pagos/recibo/${pagoId}`, '_blank');
    };

    if (isModal && !isOpen) return null;

    const formContent = (
        <div className={`p-1 ${!isModal ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}`}>
            {/* Header section - Only show if NOT modal */}
            {!isModal && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{isEditing ? 'Actualizar Pago' : 'Registro de Pago'}</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{isEditing ? 'Modifique los detalles del pago y su vinculación.' : 'Gestione los ingresos de caja y vinculación con planes de tratamiento.'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowManual(true)}
                            className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                            title="Manual de usuario"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-sm order-first md:order-last"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Volver
                        </button>
                    </div>
                </div>
            )}

            {isModal && (
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">
                        {isRefund ? 'Registrar Devolución de Saldo' : (isEditing ? 'Actualizar Pago' : 'Registrar Nuevo Pago')}
                    </h2>
                </div>
            )}

            {isModal && formData.pacienteId > 0 && !isRefund && (
                <div className="mb-6 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 flex xl:items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <div>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-0.5">Módulo de Pagos</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                Registro de Ingresos
                            </p>
                            {pacienteNombreProp && (
                                <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mt-1">
                                    Paciente: {pacienteNombreProp}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    {/* Fila Fija Integrada (Si se conoce el tratamiento explícito) */}
                    {formData.proformaId > 0 && tratamientoIdProp && balancedTreatments.find(t => t.id === Number(tratamientoIdProp)) && (
                        <div className="bg-blue-100/40 dark:bg-blue-900/40 px-5 py-3 border-t border-blue-100 dark:border-blue-800/50 flex flex-wrap gap-x-8 gap-y-3">
                            <div className="min-w-fit">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">Plan de Tratamiento</p>
                                <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                                    No. {filteredProformas.find(p => p.id === formData.proformaId)?.numero || formData.proformaId} - Bs. {filteredProformas.find(p => p.id === formData.proformaId)?.total}
                                </p>
                            </div>
                            <div className="min-w-fit flex-1 border-l pl-6 border-blue-200/60 dark:border-blue-800/50">
                                <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase font-bold tracking-wider mb-0.5">Tratamiento a Cobrar</p>
                                <p className="font-bold text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                    {(() => {
                                        const t = balancedTreatments.find(t => t.id === Number(tratamientoIdProp));
                                        return `${t?.tratamiento} ${t?.pieza ? `(Pz. ${t.pieza})` : ''}`;
                                    })()}
                                </p>
                            </div>
                            <div className="min-w-fit md:text-right border-l pl-6 border-blue-200/60 dark:border-blue-800/50 flex items-center">
                                <div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-0.5">Precio Original</p>
                                    <p className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                        Bs. {Number(balancedTreatments.find(t => t.id === Number(tratamientoIdProp))?.precio || 0).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="no-print flex flex-row gap-6 items-start">
                <form onSubmit={handleSubmit} className="flex-1 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">

                        {/* Paciente Selector Removed - Handled by Tab Context */}

                        {/* Plan de Tratamiento - Show if we have a patientId AND it's not a fixed modal interaction */}
                        {(!isModal || !tratamientoIdProp) && formData.pacienteId > 0 && !isRefund && (
                            <div className="md:col-span-2">
                                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Plan de Tratamiento:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    <select
                                        name="proformaId"
                                        value={formData.proformaId}
                                        onChange={handleChange}
                                        disabled={!formData.pacienteId || isEditing}
                                        className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-sm"
                                    ><option value={0}>-- Seleccione Plan de Tratamiento --</option>
                                        {filteredProformas.map(p => (
                                            <option key={p.id} value={p.id}>No. {p.numero} - Total: {p.total}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Fecha */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Fecha:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
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
                                    required
                                    disabled={isEditing && isPagoBloqueado(formData.fecha)}
                                    className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Monto */}
                        <div className={isRefund ? 'md:col-span-2' : ''}>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
                                {isRefund ? 'Monto a Devolver (Bs.):' : 'Monto:'}
                            </label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <line x1="12" y1="1" x2="12" y2="23"></line>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                                    <input
                                        type="number"
                                        name="monto"
                                        value={formData.monto}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="Ej: 150.00"
                                        className={`w-full pl-10 pr-3 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                            Number(formData.monto) < 0 
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-200' 
                                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                                        }`}
                                    />
                                </div>
                                {Number(formData.monto) < 0 || isRefund && (
                                    <p className="mt-1 text-[10px] font-black text-red-600 dark:text-red-400 animate-pulse flex items-center gap-1 uppercase tracking-tighter">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                                        Registrando Devolución al Paciente
                                    </p>
                                )}
                            </div>

                        {/* Descuento del Tratamiento */}
                        {(!isRefund && (!tratamientoIdProp || balancedTreatments.find(t => t.id === Number(tratamientoIdProp))?.estadoTratamiento === 'terminado')) && (
                            <div>
                                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Descuento:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                    </svg>
                                    <input
                                        type="number"
                                        name="descuento"
                                        value={formData.descuento}
                                        onChange={handleChange}
                                        placeholder="Ej: 50.00"
                                        className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Moneda */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Moneda:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                                    <line x1="12" y1="18" x2="12" y2="22"></line>
                                    <line x1="12" y1="2" x2="12" y2="6"></line>
                                </svg>
                                <select
                                    name="moneda"
                                    value={formData.moneda}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                >
                                    <option value="" disabled>-- Seleccione --</option><option value="Bolivianos">Bolivianos</option>
                                    <option value="Dólares">Dólares</option>
                                </select>
                            </div>
                        </div>


                        {/* TC - Only show if Moneda is Dólares */}
                        {formData.moneda === 'Dólares' && (
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Tipo de Cambio (TC):</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <polyline points="23 4 23 10 17 10"></polyline>
                                        <polyline points="1 20 1 14 7 14"></polyline>
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                    </svg>
                                    <input
                                        type="number"
                                        name="tc"
                                        value={formData.tc}
                                        onChange={handleChange}
                                        required
                                        step="0.01"
                                        placeholder="Ej: 6.96"
                                        className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Recibo */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">No. Recibo:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                <input
                                    type="text"
                                    name="recibo"
                                    value={formData.recibo}
                                    onChange={handleChange}
                                    placeholder="Ej: 987654"
                                    className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Factura */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">No. Factura:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                </svg>
                                <input
                                    type="text"
                                    name="factura"
                                    value={formData.factura}
                                    onChange={handleChange}
                                    placeholder="Ej: 123456"
                                    className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        {/* Forma de Pago */}
                        <div>
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Forma de Pago:</label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                    </svg>
                                    <select
                                        name="formaPagoId"
                                        value={formData.formaPagoId || ''}
                                        onChange={(e) => {
                                            const selectedId = Number(e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                formaPagoId: selectedId
                                            }));
                                        }}
                                        required
                                        className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                    >
                                        <option value="">-- Seleccione Forma de Pago --</option>
                                        {formasPago.map((fp: any) => (
                                            <option key={fp.id} value={fp.id}>{fp.forma_pago}</option>
                                        ))}
                                    </select>
                                </div>
                                {puedeCrearAtributo && (
                                    <button
                                        type="button"
                                        onClick={() => setIsFormaPagoModalOpen(true)}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                        title="Añadir Forma de Pago"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Helper logic for Tarjeta check */}
                        {(() => {
                            const selectedFormaPago = formasPago.find(fp => fp.id === formData.formaPagoId);
                            const isTarjeta = selectedFormaPago && selectedFormaPago.forma_pago.toLowerCase() === 'tarjeta';

                            return isTarjeta && (
                                <div>
                                    <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Tipo de Tarjeta (Comisión): <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                                <line x1="1" y1="10" x2="23" y2="10"></line>
                                            </svg>
                                            <select
                                                name="comisionTarjetaId"
                                                value={formData.comisionTarjetaId || ''}
                                                onChange={handleChange}
                                                required={true}
                                                className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                            >
                                                <option value="">-- Seleccione Tarjeta --</option>
                                                {comisiones.filter(c => c.estado === 'activo').map(comision => (
                                                    <option key={comision.id} value={comision.id}>
                                                        {comision.redBanco} - {comision.monto}%
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {puedeCrearAtributo && (
                                            <button
                                                type="button"
                                                onClick={() => setIsComisionModalOpen(true)}
                                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-1.5 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                                title="Añadir Comisión de Tarjeta"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Observaciones */}
                        <div className="md:col-span-3 lg:col-span-4">
                            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300 text-sm">Observaciones:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-6 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Ingrese una descripción..."
                                    className="w-full pl-10 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                    </div>



                    {/* TABLAS DE SELECCIÓN DE TRATAMIENTOS (RESTAURADAS PARA ASIGNACIÓN MANUAL) */}
                    {formData.proformaId > 0 && !tratamientoIdProp && (
                        <div className="mt-8 space-y-6">
                            {[
                                { title: 'Tratamientos Terminados (Saldo Pendiente)', filter: 'terminado', color: 'orange' },
                                { title: 'Tratamientos en Curso / Otros', filter: 'curso', color: 'blue' }
                            ].map(section => {
                                const list = balancedTreatments.filter(t => 
                                    section.filter === 'terminado' 
                                        ? t.estadoTratamiento === 'terminado' 
                                        : t.estadoTratamiento !== 'terminado'
                                );

                                if (list.length === 0) return null;

                                return (
                                    <div key={section.filter} className={`border border-${section.color}-200 dark:border-${section.color}-800 rounded-xl overflow-hidden shadow-sm`}>
                                        <div className={`bg-${section.color}-50 dark:bg-${section.color}-900/20 px-4 py-2 border-b border-${section.color}-200 dark:border-${section.color}-800`}>
                                            <h3 className={`text-sm font-bold text-${section.color}-700 dark:text-${section.color}-400 flex items-center gap-2`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                {section.title}
                                            </h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sel.</th>
                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tratamiento</th>
                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Saldo</th>
                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-green-50/50 dark:bg-green-900/10">Monto Pago</th>
                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-blue-50/50 dark:bg-blue-900/10">Desc.</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                                    {list.map(trat => {
                                                        const isSelected = selectedTreatments.includes(trat.id);
                                                        const assign = assignments[trat.id] || { amount: 0, discount: 0 };

                                                        return (
                                                            <tr key={trat.id} className={`${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors`}>
                                                                <td className="px-4 py-2 text-center">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleTreatment(trat.id)}
                                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 text-xs">
                                                                    <p className="font-bold text-gray-900 dark:text-white">{trat.tratamiento}</p>
                                                                    <p className="text-[10px] text-gray-500">{trat.pieza ? `Pz. ${trat.pieza}` : ''}</p>
                                                                </td>
                                                                <td className="px-4 py-2 text-xs text-right text-gray-600 dark:text-gray-400">Bs. {trat.netPrice.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-xs text-right font-bold text-red-600 dark:text-red-400">Bs. {trat.balancedSaldo.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right bg-green-50/30 dark:bg-green-900/5">
                                                                    <input 
                                                                        type="number"
                                                                        disabled={!isSelected}
                                                                        value={assign.amount || ''}
                                                                        onChange={(e) => updateAssignment(trat.id, 'amount', Number(e.target.value))}
                                                                        className="w-20 px-2 py-1 text-xs text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-1 focus:ring-green-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                                                        placeholder="0.00"
                                                                        step="0.01"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2 text-right bg-blue-50/30 dark:bg-blue-900/5">
                                                                    <input 
                                                                        type="number"
                                                                        disabled={!isSelected}
                                                                        value={assign.discount || ''}
                                                                        onChange={(e) => updateAssignment(trat.id, 'discount', Number(e.target.value))}
                                                                        className="w-16 px-2 py-1 text-xs text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                                                                        placeholder="0"
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}



                    <div className="mt-8 flex justify-start gap-4 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {isEditing ? 'Actualizar Pago' : 'Registrar Pago'}
                        </button>
                        <button
                            type="button"
                            onClick={() => isModal ? onClose?.() : navigate(-1)}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancelar
                        </button>
                    </div>
                </form >

                {/* Financial Summary Side Panel - ONLY if NOT modal */}
                {!isModal && formData.proformaId > 0 && (
                        <div className="bg-white dark:bg-gray-700/50 rounded-xl shadow-md border border-gray-200 dark:border-gray-600 w-80 shrink-0 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
                                <h3 className="m-0 text-lg font-bold flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    Resumen Financiero
                                </h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-600 pb-3">
                                    <div className="text-gray-600 dark:text-gray-300 text-sm italic">Total Plan de Tratamiento:</div>
                                    <div className="font-bold text-lg text-gray-500 dark:text-gray-400">
                                        Bs. {totalPresupuesto.toFixed(2)}
                                    </div>
                                </div>

                                {/* Deuda Real (Ejecutado) */}
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-600 pb-3">
                                    <div className="text-red-700 dark:text-red-400 text-sm font-black uppercase">Deuda Real (Terminado):</div>
                                    <div className="font-black text-xl text-red-600 dark:text-red-500 animate-pulse-slow">
                                        Bs. {deudaReal.toFixed(2)}
                                    </div>
                                </div>

                                {/* Paid by Patient */}
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-600 pb-3">
                                    <div className="text-gray-600 dark:text-gray-300 text-sm">Total Pagado:</div>
                                    <div className="font-bold text-lg text-green-600 dark:text-green-400">
                                        Bs. {totalPagado.toFixed(2)}
                                    </div>
                                </div>

                                {/* Saldo a Favor / Anticipo */}
                                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                    <div className="text-blue-800 dark:text-blue-300 text-sm font-bold uppercase">Anticipo / Saldo a Favor:</div>
                                    <div className="font-black text-xl text-blue-600 dark:text-blue-400">
                                        Bs. {anticipoDisponible.toFixed(2)}
                                    </div>
                                </div>

                                <div className="pt-2 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-tighter text-center">
                                    Centralizado en Historia Clínica
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Table Removed - Redundant in Tab Mode */}
                </div>

            {/* Transfer Modal */}
            {
                showTransferModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[9999]">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-lg shadow-2xl transform transition-all">
                            <h3 className="text-xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-white">
                                Transferir Saldo a Favor
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">De Paciente:</label>
                                    <input
                                        type="text"
                                        value={pacienteNombreProp || 'Cargando...'}
                                        disabled
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
                                    />
                                    <p className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">
                                        Saldo Disponible: Bs. {saldoFavor.toFixed(2)}
                                    </p>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">A Paciente:</label>
                                    <div className="relative">
                                        <select
                                            value={targetPacienteId}
                                            onChange={handleTargetPacienteChange}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="" disabled>-- Seleccione --</option><option value={0}>-- Seleccionar Paciente Destino --</option>
                                            {pacientes.map(p => (
                                                <option key={p.id} value={p.id}>{p.paterno} {p.materno} {p.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Plan de Tratamiento:</label>
                                    <div className="relative">
                                        <select
                                            value={targetProformaId}
                                            onChange={(e) => setTargetProformaId(Number(e.target.value))}
                                            disabled={targetPacienteId === 0}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                                        >
                                            <option value="" disabled>-- Seleccione --</option>
                                            <option value={0}>-- General (Sin Plan de Tratamiento) --</option>
                                            {targetProformas.map(p => (
                                                <option key={p.id} value={p.id}>No. {p.numero} - Total: {p.total}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Monto a Traspasar:</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={transferAmount}
                                            onChange={(e) => setTransferAmount(Number(e.target.value))}
                                            max={saldoFavor}
                                            min={0.01}
                                            step="0.01"
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2">

                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg> Cancelar
                                </button>
                                <button
                                    onClick={confirmTransfer}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    Aceptar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Pagos"
                sections={manualSections}
            />

            {/* Modal de Creación Rápida de Forma de Pago */}
            {puedeCrearAtributo && (
                <div style={{ zIndex: 60 }} className="relative">
                    <FormaPagoForm
                        isOpen={isFormaPagoModalOpen}
                        onClose={() => setIsFormaPagoModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchFormasPago();
                            setIsFormaPagoModalOpen(false);
                        }}
                    />
                </div>
            )}

            {/* Modal de Creación Rápida de Comisión de Tarjeta */}
            {puedeCrearAtributo && (
                <div style={{ zIndex: 60 }} className="relative">
                    <ComisionTarjetaForm
                        isOpen={isComisionModalOpen}
                        onClose={() => setIsComisionModalOpen(false)}
                        onSaveSuccess={() => {
                            fetchComisiones();
                            setIsComisionModalOpen(false);
                        }}
                    />
                </div>
            )}
        </div >
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-[10000] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div 
                        className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 transition-opacity backdrop-blur-sm" 
                        aria-hidden="true"
                        onClick={onClose}
                    ></div>
                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                    <div className="inline-block align-middle bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full border border-gray-100 dark:border-gray-700">
                        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                            {formContent}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return formContent;
};

export default PagosForm;
