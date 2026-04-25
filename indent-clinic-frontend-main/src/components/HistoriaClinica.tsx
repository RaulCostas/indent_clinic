import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente, HistoriaClinica as HistoriaClinicaType, Proforma, Pago } from '../types';
import HistoriaClinicaForm from './HistoriaClinicaForm';
import HistoriaClinicaList from './HistoriaClinicaList';
import PlanTratamientoModal from './PlanTratamientoModal';
import RecordatorioTratamientoModal from './RecordatorioTratamientoModal';
import FirmaModal from './FirmaModal';
import SeguimientoClinicoModal from './SeguimientoClinicoModal';

import { formatDate } from '../utils/dateUtils';
import { useClinica } from '../context/ClinicaContext';


const HistoriaClinica: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { clinicaActual } = useClinica();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [historia, setHistoria] = useState<HistoriaClinicaType[]>([]);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [selectedProformaId, setSelectedProformaId] = useState<number>(0);


    const [historiaToEdit, setHistoriaToEdit] = useState<HistoriaClinicaType | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);

    const [selectedReminderHistoria, setSelectedReminderHistoria] = useState<HistoriaClinicaType | null>(null);

    // Firma Digital
    const [showFirmaModal, setShowFirmaModal] = useState(false);
    const [selectedHistoriaForFirma, setSelectedHistoriaForFirma] = useState<HistoriaClinicaType | null>(null);

    const handleOpenFirma = (item: HistoriaClinicaType) => {
        setSelectedHistoriaForFirma(item);
        setShowFirmaModal(true);
    };

    const handleSaveFirma = async (signatureBase64: string) => {
        if (!selectedHistoriaForFirma) return;
        try {
            await api.patch(`/historia-clinica/${selectedHistoriaForFirma.id}`, { firmaPaciente: signatureBase64 });
            Swal.fire({ icon: 'success', title: 'Firma guardada', text: 'La firma digital del paciente fue registrada correctamente.', timer: 2000, showConfirmButton: false });
            fetchHistoria();
        } catch (error) {
            console.error('Error saving signature:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la firma. Intente nuevamente.' });
        }
        setShowFirmaModal(false);
        setSelectedHistoriaForFirma(null);
    };



    // Format phone number as (+code) number
    const formatPhoneNumber = (phone: string | undefined): string => {
        if (!phone) return 'N/A';

        // Remove any spaces or special characters
        const cleaned = phone.replace(/\D/g, '');

        // If it starts with a country code (e.g., 591 for Bolivia)
        if (cleaned.length >= 10) {
            // Assume first 2-3 digits are country code
            const countryCode = cleaned.substring(0, cleaned.length - 8);
            const number = cleaned.substring(cleaned.length - 8);
            return `(+${countryCode}) ${number}`;
        }

        // If it's just a local number
        return phone;
    };

    useEffect(() => {
        if (id) {
            fetchPaciente();
            fetchHistoria();
            fetchProformas();
        }
    }, [id]);


    const fetchPaciente = async () => {
        try {
            const response = await api.get(`/pacientes/${id}`);
            setPaciente(response.data);
        } catch (error) {
            console.error('Error fetching paciente:', error);
        }
    };

    const fetchHistoria = async () => {
        try {
            const response = await api.get(`/historia-clinica/paciente/${id}`);
            setHistoria(response.data);
        } catch (error) {
            console.error('Error fetching historia:', error);
        }
    };

    const fetchProformas = async () => {
        try {
            const response = await api.get(`/proformas/paciente/${id}`);
            setProformas(response.data);
        } catch (error) {
            console.error('Error fetching proformas:', error);
        }
    };


    const handleDelete = async (historiaId: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "No podrá revertir esta acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/historia-clinica/${historiaId}`);
                fetchHistoria();
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El registro ha sido eliminado.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error('Error deleting historia:', error);
                Swal.fire(
                    'Error',
                    'Hubo un problema al eliminar el registro.',
                    'error'
                );
            }
        }
    };

    const handleEdit = (item: HistoriaClinicaType) => {
        setHistoriaToEdit(item);
        setShowForm(true);
        if (item.proformaId) {
            setSelectedProformaId(item.proformaId);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setHistoriaToEdit(null);
        setShowForm(false);
    };






    const filteredHistoria = selectedProformaId ? historia.filter(h => h.proformaId === selectedProformaId) : historia;


    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    const handlePrintHistory = async () => {
        const doc = new jsPDF();

        try {
            const logoSrc = clinicaActual?.logo || '';
            if (logoSrc) {
                const logo = await loadImage(logoSrc);
                doc.addImage(logo, 'PNG', 14, 15, 35, 14);
            }
        } catch (error) {
            console.warn('Could not load logo', error);
        }

        // Header
        const pageWidth = doc.internal.pageSize.width;
        doc.setDrawColor(52, 152, 219); // #3498db
        doc.setLineWidth(1);
        doc.line(15, 35, pageWidth - 15, 35);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80); // #2c3e50
        doc.text('SEGUIMIENTO CLÍNICO', 105, 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Patient info box with blue border (matching Próxima Cita format)
        const boxY = 40;
        const boxHeight = selectedProformaId > 0 ? 18 : 12;

        // Gray background
        doc.setFillColor(248, 249, 250); // #f8f9fa
        doc.rect(15, boxY, pageWidth - 30, boxHeight, 'F');

        // Blue left border
        doc.setFillColor(52, 152, 219); // #3498db
        doc.rect(15, boxY, 2, boxHeight, 'F');

        // Patient info text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('PACIENTE:', 20, boxY + 6);
        doc.setFont('helvetica', 'normal');
        const pacienteNombre = paciente
            ? `${paciente.paterno} ${paciente.materno} ${paciente.nombre} ${paciente.seguro_medico ? `(${paciente.seguro_medico})` : ''}`
            : 'N/A';
        doc.text(pacienteNombre.toUpperCase(), 45, boxY + 6);

        // Plan de Tratamiento info
        if (selectedProformaId > 0) {
            const proforma = proformas.find(p => p.id === selectedProformaId);
            if (proforma) {
                doc.setFont('helvetica', 'bold');
                doc.text('PLAN DE TRATAMIENTO:', 20, boxY + 13);
                doc.setFont('helvetica', 'normal');
                doc.text(`Plan #${proforma.numero || proforma.id} - ${formatDate(proforma.fecha)}`, 70, boxY + 13);
            }
        }

        // Table
        if (filteredHistoria.length > 0) {
            const tableColumn = ["Fecha", "Pieza", "Tratamiento", "Observaciones", "Cant.", "Doctor", "Diagnóstico", "Estado"];
            const tableRows = filteredHistoria.map(item => [
                formatDate(item.fecha),
                item.pieza || '-',
                item.tratamiento || '-',
                item.observaciones || '-',
                item.cantidad,
                item.doctor ? `${item.doctor.paterno} ${item.doctor.nombre}` : '-',
                item.diagnostico || '-',
                item.estadoTratamiento
            ]);

            const tableStartY = boxY + boxHeight + 5; // Start table 5 units after the box

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: tableStartY,
                theme: 'plain',
                margin: { left: 15, right: 15 },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                },
                headStyles: {
                    fillColor: [52, 152, 219], // #3498db
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    lineWidth: 0,
                },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 12 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 'auto' }, // Observaciones takes remaining space
                    4: { cellWidth: 10 },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 30 },
                    7: { cellWidth: 18 }
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250] // #f8f9fa
                }
            });
        }

        const historiaWithFirma = filteredHistoria.slice().reverse().find(h => h.firmaPaciente);
        if (historiaWithFirma && historiaWithFirma.firmaPaciente) {
            try {
                const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150;
                let signatureY = finalY + 20;
                
                if (signatureY + 60 > doc.internal.pageSize.height) {
                    doc.addPage();
                    signatureY = 30;
                }

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(44, 62, 80);
                doc.text('CONFORMIDAD DEL PACIENTE', 105, signatureY, { align: 'center' });
                
                const sigImg = await loadImage(historiaWithFirma.firmaPaciente);
                doc.addImage(sigImg, 'PNG', 105 - 40, signatureY + 5, 80, 40);
                
                doc.setDrawColor(150);
                doc.setLineWidth(0.5);
                doc.line(105 - 35, signatureY + 45, 105 + 35, signatureY + 45);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text('Firma o Rúbrica del Paciente', 105, signatureY + 50, { align: 'center' });
                doc.text(`Fecha de Firma: ${formatDate(historiaWithFirma.fecha)}`, 105, signatureY + 55, { align: 'center' });
            } catch (err) {
                console.warn('Error loading signature image for PDF', err);
            }
        }

        const blobUrl = URL.createObjectURL(doc.output('blob'));
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
            printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
        } else {
            window.open(blobUrl, '_blank');
        }
    };



    return (
        <div className="p-6 bg-white dark:bg-gray-800 min-h-screen text-gray-800 dark:text-gray-200 transition-colors duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span className="text-blue-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    </span>
                    Seguimiento Clínico
                </h2>
            </div>


            {/* Proforma Selection Global */}
            <div className="mb-6 flex flex-wrap items-center gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <label className="font-bold text-gray-700 dark:text-gray-300">Seleccione el Plan de Tratamiento:</label>
                <select
                    value={selectedProformaId}
                    onChange={(e) => setSelectedProformaId(Number(e.target.value))}
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value={0}>-- Todos / Sin Plan --</option>
                    {proformas.map(p => {
                        // Check if this proforma is marked as terminado in Historia Clinica
                        const isCompleted = historia.some(h =>
                            h.proformaId === p.id && h.estadoPresupuesto === 'terminado'
                        );

                        return (
                            <option
                                key={p.id}
                                value={p.id}
                                style={isCompleted ? {
                                    textDecoration: 'line-through',
                                    color: '#16a34a',
                                    fontWeight: 'bold'
                                } : undefined}
                            >
                                Plan #{p.numero || p.id} - {formatDate(p.fecha)}
                            </option>
                        );
                    })}
                </select>
            </div>



            {/* Message when no plan is selected - shows in all tabs */}
            {selectedProformaId === 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        <span className="font-semibold">ℹ️ Por favor, seleccione un Plan de Tratamiento</span> para registrar tratamientos.
                    </p>
                </div>
            )}

            {/* Tab Contents */}
            <div className="animate-fade-in-up">
                {(showForm || historiaToEdit) && selectedProformaId > 0 && (
                    <div className="mb-6">
                        <HistoriaClinicaForm
                            pacienteId={Number(id)}
                            onSuccess={() => {
                                fetchHistoria();
                                setShowForm(false);
                            }}
                            historiaToEdit={historiaToEdit}
                            onCancelEdit={handleCancelEdit}
                            selectedProformaId={selectedProformaId}
                            proformas={proformas}
                        />
                    </div>
                )}

                {selectedProformaId > 0 && (
                    <HistoriaClinicaList
                        historia={filteredHistoria}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        onNewHistoria={selectedProformaId > 0 && !showForm && !historiaToEdit ? () => setShowForm(true) : undefined}
                        onPrint={handlePrintHistory}
                        onViewPlan={selectedProformaId > 0 ? () => setShowPlanModal(true) : undefined}
                        onViewSeguimiento={() => setShowSeguimientoModal(true)}
                        onSign={handleOpenFirma}
                        onReminder={(item) => {
                            setSelectedReminderHistoria(item);
                            setShowReminderModal(true);
                        }}
                    />
                )}
            </div>



            {/* Plan Tratamiento Modal */}
            <PlanTratamientoModal
                isOpen={showPlanModal}
                onClose={() => setShowPlanModal(false)}
                proforma={proformas.find(p => p.id === selectedProformaId) || null}
                historia={historia}
            />

            {/* Seguimiento Clinico Modal */}
            <SeguimientoClinicoModal
                isOpen={showSeguimientoModal}
                onClose={() => setShowSeguimientoModal(false)}
                historia={historia}
                pacienteNombre={paciente ? `${paciente.nombre} ${paciente.paterno}` : ''}
                proformas={proformas}
            />

            {/* Recordatorio Modal */}
            <RecordatorioTratamientoModal
                isOpen={showReminderModal}
                onClose={() => setShowReminderModal(false)}
                historia={selectedReminderHistoria}
                paciente={paciente}
            />

            {/* Firma Digital Modal */}
            <FirmaModal
                isOpen={showFirmaModal}
                onClose={() => { setShowFirmaModal(false); setSelectedHistoriaForFirma(null); }}
                onSign={handleSaveFirma}
                title="Firma Digital del Paciente"
                subtitle="El paciente puede firmar a continuación como constancia del tratamiento realizado. (Opcional)"
            />


        </div >
    );
};

export default HistoriaClinica;
