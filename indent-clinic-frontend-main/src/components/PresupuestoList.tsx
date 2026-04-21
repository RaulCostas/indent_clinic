import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente } from '../types';
import jsPDF from 'jspdf';
import Pagination from './Pagination';
import autoTable from 'jspdf-autotable';
import { formatDateSpanish, numberToWords } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import SignatureModal from './SignatureModal';
import { useClinica } from '../context/ClinicaContext';
import { Printer } from 'lucide-react';
import PresupuestoViewModal from './PresupuestoViewModal';


interface Proforma {
    id: number;
    numero: number;
    fecha: string;
    total: number;
    sub_total: number;
    descuento: number;
    nota: string;
    usuario: { name: string };
    aprobado: boolean;
    detalles: any[];
    usuarioAprobado?: { name: string };
    fecha_aprobado?: string;
}

const PresupuestoList: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [budgetsWithRelations, setBudgetsWithRelations] = useState<Set<number>>(new Set());
    const [completedBudgets, setCompletedBudgets] = useState<Set<number>>(new Set());
    const { clinicaSeleccionada, clinicaActual } = useClinica();

    // Signature states
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedPresupuesto, setSelectedPresupuesto] = useState<Proforma | null>(null);

    // View modal state
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedViewId, setSelectedViewId] = useState<number | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    const manualSections: ManualSection[] = [
        {
            title: 'Planes de Tratamiento',
            content: 'Gestión de proformas y planes de tratamiento para el paciente. Los planes de tratamiento permiten planificar tratamientos, hacer seguimiento de piezas completadas y controlar el estado de finalización.'
        },
        {
            title: 'Nuevo Plan de Tratamiento',
            content: 'Cree un nuevo plan de tratamiento seleccionando tratamientos del arancel. Puede especificar las piezas dentales a tratar, agregar notas y generar PDF para entregar al paciente.'
        },
        {
            title: 'Indicadores Visuales',
            content: 'Los planes de tratamiento terminados aparecen con las columnas "# Plan" y "Fecha" tachadas en verde. Esto indica que todos los tratamientos del plan han sido completados en Seguimiento Clínico.'
        },
        {
            title: 'Seguimiento de Piezas',
            content: 'Al ver o editar un plan de tratamiento, las piezas dentales completadas aparecen tachadas en verde. Solo cuando TODAS las piezas de un tratamiento están terminadas, el tratamiento completo se marca como finalizado.'
        },
        {
            title: 'Uso en Clínico',
            content: 'Los planes de tratamiento creados están listos para ser utilizados directamente en la sección de Seguimiento Clínico y Agenda para registrar los tratamientos realizados.'
        },
        {
            title: 'Acciones Disponibles',
            content: 'Ver/Editar plan de tratamiento, Eliminar (solo si no tiene pagos o seguimiento clínico asociado), Enviar por WhatsApp, Imprimir PDF, y Exportar a Excel.'
        },
        {
            title: 'Estados del Plan de Tratamiento',
            content: 'Un plan de tratamiento puede estar: Editable (recién creado), En Proceso (con tratamientos ya iniciados en clínico), o Terminado (todos los tratamientos del plan fueron completados).'
        }];

    const filteredProformas = proformas.filter(p =>
        p.numero.toString().includes(searchTerm) ||
        p.nota.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(p.fecha).includes(searchTerm)
    );

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProformas = filteredProformas.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        if (id) {
            fetchPaciente(Number(id));
            fetchProformas(Number(id));
        }
    }, [id, clinicaSeleccionada]);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // ... (rest of functions)

    // In render:



    const fetchPaciente = async (pacienteId: number) => {
        try {
            const response = await api.get(`/pacientes/${pacienteId}`);
            setPaciente(response.data);
        } catch (error) {
            console.error('Error fetching paciente:', error);
        }
    };

    const fetchProformas = async (pacienteId: number) => {
        try {
            const clinicaId = clinicaSeleccionada;
            const url = clinicaId
                ? `/proformas/paciente/${pacienteId}?clinicaId=${clinicaId}`
                : `/proformas/paciente/${pacienteId}`;

            const response = await api.get(url);
            setProformas(response.data);

            // Check which budgets have payments or clinical history
            await checkBudgetsWithRelations(response.data.map((p: any) => p.id));
        } catch (error) {
            console.error('Error fetching proformas:', error);
        }
    };

    const checkBudgetsWithRelations = async (proformaIds: number[]) => {
        try {
            const [pagosResponse, historiaResponse] = await Promise.all([
                api.get('/pagos'),
                api.get(`/historia-clinica/paciente/${id}`)
            ]);

            const budgetsWithData = new Set<number>();
            const budgetsCompleted = new Set<number>();

            // Check for payments
            pagosResponse.data.forEach((pago: any) => {
                if (pago.proformaId && proformaIds.includes(pago.proformaId)) {
                    budgetsWithData.add(pago.proformaId);
                }
            });

            // Check for clinical history and completed budgets
            historiaResponse.data.forEach((historia: any) => {
                if (historia.proformaId && proformaIds.includes(historia.proformaId)) {
                    budgetsWithData.add(historia.proformaId);

                    // Check if this budget is marked as terminado
                    if (historia.estadoPresupuesto === 'terminado') {
                        budgetsCompleted.add(historia.proformaId);
                    }
                }
            });

            setBudgetsWithRelations(budgetsWithData);
            setCompletedBudgets(budgetsCompleted);
        } catch (error) {
            console.error('Error checking budget relations:', error);
        }
    };



    const handleDelete = async (proformaId: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: 'Esta acción eliminará el plan de tratamiento permanentemente',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/proformas/${proformaId}`);
                Swal.fire({
                    title: '¡Eliminado!',
                    text: 'El plan de tratamiento ha sido eliminado.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
                if (id) fetchProformas(Number(id));
            } catch (error: any) {
                console.error('Error deleting proforma:', error);
                Swal.fire({
                    title: 'Error',
                    text: error.response?.data?.message || 'Error al eliminar el plan de tratamiento',
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    const canDeleteBudget = (proformaId: number) => {
        return !budgetsWithRelations.has(proformaId);
    };

    const handleSendWhatsApp = async (proforma: Proforma, includePaymentInfo: boolean) => {
        const type = includePaymentInfo ? 'Con Pago' : 'Sin Pago';

        Swal.fire({
            title: 'Enviando...',
            text: `Enviando plan de tratamiento (${type}) por WhatsApp...`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            // Generate PDF Blob
            const pdfBlob = await generatePDF(proforma, 'blob', includePaymentInfo);

            if (!(pdfBlob instanceof Blob)) {
                throw new Error('Error al generar el PDF');
            }

            const formData = new FormData();
            formData.append('file', pdfBlob, `Plan_de_Tratamiento_${proforma.numero}.pdf`);

            await api.post(`/proformas/${proforma.id}/send-whatsapp`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            Swal.fire({
                icon: 'success',
                title: '¡Enviado!',
                text: 'El plan de tratamiento se envió correctamente por WhatsApp',
                timer: 2000,
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        } catch (error: any) {
            console.error('Error sending WhatsApp:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Error al enviar por WhatsApp. Verifique que el chatbot esté conectado.',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };



    const generatePDF = async (proforma: Proforma, action: 'print' | 'download' | 'blob', includePaymentInfo: boolean = true) => {
        const doc = new jsPDF();

        // Fetch signatures before generating PDF
        let pdfSignatures: any[] = [];
        try {
            const response = await api.get(`/firmas/documento/presupuesto/${proforma.id}`);
            pdfSignatures = response.data;
        } catch (error) {
            console.error('Error fetching signatures for PDF:', error);
        }

        const patientSignature = pdfSignatures.find(s => s.rolFirmante === 'paciente');
        const clinicSignature = pdfSignatures.find(s => s.rolFirmante === 'doctor' || s.rolFirmante === 'personal' || s.rolFirmante === 'administrador');



        // [Same Date/Salutation/Table Logic - lines 131-216 are unchanged, but I need to be careful not to delete them if I'm not replacing them. 
        // Wait, replace_file_content needs me to replace the function definition if I change the signature.
        // I'll start the replacement at the function definition line.]

        // ... (I will reuse the existing logic but I need to provide the full function or a chunk).
        // It's a large function (lines 128-299).
        // I will do two edits.
        // 1. Update signature and Payment System logic.
        // 2. Update the buttons in the table.

        // This tool call is for step 1: Update signature and logic? 
        // No, I can't easily change signature without rewriting the whole function body in replace_file_content or using specific targeted replaces if possible.
        // I'll change the signature first.

        // Actually, I'll update the whole `generatePDF` opening and the specific section 7.
        // But `replace_file_content` works best with contiguous blocks.
        // Use `multi_replace_file_content`? I don't have that tool enabled for me? I do! `multi_replace_file_content`.
        // Ah, checked tools... yes I have `multi_replace_file_content`.

        // I will use `replace_file_content` for the signature change and payment section?
        // No, signature is line 128. Section 7 is line 256. They are far apart.
        // I'll use `multi_replace_file_content`.



        // 1. Header (Logo)
        try {
            const logoSrc = clinicaActual?.logo || '';
            if (logoSrc) {
                // We add it at top left
                doc.addImage(logoSrc, 'PNG', 14, 10, 35, 14);
            }
        } catch (error) {
            console.warn('Could not load logo for PDF', error);
        }

        // 1. Date (Right aligned)
        doc.setFontSize(10);
        doc.setTextColor(0);
        const dateStr = formatDateSpanish(proforma.fecha);
        doc.text(dateStr, 200, 20, { align: 'right' });

        // 2. Salutation
        doc.setFont('helvetica', 'normal');
        doc.text('Señor(a):', 14, 35);

        doc.setFont('helvetica', 'bold');
        const patientName = `${paciente?.paterno || ''} ${paciente?.materno || ''} ${paciente?.nombre || ''} ${paciente?.seguro_medico ? `(${paciente.seguro_medico})` : ''}`.trim().toUpperCase();
        doc.text(patientName, 14, 40);

        doc.setFont('helvetica', 'normal');
        doc.text('De mi consideración:', 14, 50);
        doc.text('Según los estudios realizados le presentamos el siguiente plan de tratamiento odontológico que Ud. requiere:', 14, 55, { align: 'justify', maxWidth: 180 });

        // 3. Proforma Number
        doc.setFont('helvetica', 'bold');
        doc.text(`Plan # ${proforma.numero.toString().padStart(2, '0')}`, 200, 65, { align: 'right' });

        // 4. Table
        let tableColumn = ["Pieza(s)", "Descripción", "Cant.", "P.U.", "Total"];
        const tableRows: any[] = [];
        const tableStyles: any[] = []; // per-row styles for posible items
        let totalSubTotal = 0;
        let hasPosible = false;

        proforma.detalles.forEach(item => {
            const isPosible = item.posible === true;
            if (isPosible) hasPosible = true;
            const sub = Number(item.total);
            if (!isPosible) totalSubTotal += sub; // only confirmed items
            const row = [
                item.piezas,
                isPosible ? `${item.arancel.detalle} (*)` : item.arancel.detalle,
                item.cantidad,
                Number(item.precioUnitario).toFixed(2),
                isPosible ? '-' : sub.toFixed(2)  // posible items show '-' in total
            ];
            tableRows.push(row);
            tableStyles.push(isPosible ? { fontStyle: 'italic', textColor: [120, 90, 0] } : {});
        });

        const columnStyles: any = {
            0: { halign: 'center' }, // Pieza(s)
            1: { halign: 'left' }, // Descripción
            2: { halign: 'center' }, // Cant
            3: { halign: 'right' }, // PU
            4: { halign: 'right' } // Total
        };

        let penultColX = 0;
        let penultColWidth = 0;
        let lastColX = 0;
        let lastColWidth = 0;

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 70,
            theme: 'plain',
            styles: {
                fontSize: 9,
                cellPadding: 2,
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                textColor: [0, 0, 0]
            },
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                halign: 'center',
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            columnStyles: columnStyles,
            willDrawCell: (data) => {
                if (data.section === 'body') {
                    const rowStyle = tableStyles[data.row.index];
                    if (rowStyle && rowStyle.fontStyle) {
                        data.cell.styles.fontStyle = rowStyle.fontStyle;
                        data.cell.styles.textColor = rowStyle.textColor;
                    }
                }
            },
            didDrawCell: (data) => {
                if (data.section === 'head') {
                    const lastIndex = tableColumn.length - 1;
                    const penultIndex = tableColumn.length - 2;

                    if (data.column.index === penultIndex) {
                        penultColX = data.cell.x;
                        penultColWidth = data.cell.width;
                    }
                    if (data.column.index === lastIndex) {
                        lastColX = data.cell.x;
                        lastColWidth = data.cell.width;
                    }
                }
            }
        });

        // Footnote for posible treatments
        if (hasPosible) {
            let noteY = (doc as any).lastAutoTable.finalY + 3;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 90, 0);
            doc.text('(*) Tratamiento posible — sujeto a evaluación; no incluido en el total.', 14, noteY);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
        }

        // Totals Row
        let finalY = (doc as any).lastAutoTable.finalY + 5;

        // Fallback static positioning if capture failed
        if (lastColWidth === 0) {
            lastColWidth = 30; lastColX = 165;
            penultColWidth = 30; penultColX = 135;
        }

        doc.setFont('helvetica', 'bold');

        doc.rect(penultColX, finalY - 4, penultColWidth, 7);
        doc.rect(lastColX, finalY - 4, lastColWidth, 7);

        doc.text('TOTAL Bs.', penultColX + penultColWidth - 2, finalY + 1, { align: 'right' });
        doc.text(Number(proforma.total).toFixed(2), lastColX + lastColWidth - 2, finalY + 1, { align: 'right' });

        finalY += 10;

        // 5. Amount in Words
        doc.setFont('helvetica', 'normal');
        const decimalPart = (Number(proforma.total) % 1).toFixed(2).substring(2);
        const words = numberToWords(Number(proforma.total));
        doc.text(`SON: ${words} ${decimalPart}/100 BOLIVIANOS`, 14, finalY);

        finalY += 15; // Space

        // 7. Payment System (Moved up)
        if (includePaymentInfo) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            // doc.rect(14, finalY, 40, 5); // Removed box
            doc.text('SISTEMA DE PAGO', 14, finalY + 3.5);

            doc.setFont('helvetica', 'normal');
            // doc.rect(14, finalY + 6, 180, 5); // Removed box
            doc.text('- Cancelación del 50% al inicio. 30% durante el tratamiento. 20% antes de finalizado el mismo.', 14, finalY + 9.5, { align: 'justify', maxWidth: 180 });

            finalY += 15;
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            // Phase A
            // doc.rect(14, finalY, 60, 5); // Removed box
            doc.text('Fase A Quirurgica: Implante.', 14, finalY + 3.5);

            // Phase B
            const phaseBY = finalY + 7;
            const textPhaseB = 'Fase B Rehabilitación: Transcurridos 4 a 6 meses de la cirugía se realizará la rehabilitación, es decir muñones y coronas sobre implantes.';
            const splitPhaseB = doc.splitTextToSize(textPhaseB, 180);
            const heightPhaseB = splitPhaseB.length * 5;

            // doc.rect(14, phaseBY, 180, heightPhaseB + 2); // Removed box
            doc.text(splitPhaseB, 14, phaseBY + 4.5, { align: 'justify', maxWidth: 180 });

            finalY = phaseBY + heightPhaseB + 10;
        }

        // 5.1 Proforma Note (User Note)
        if (proforma.nota) {
            doc.setFont('helvetica', 'bold');
            doc.text('NOTA:', 14, finalY);

            doc.setFont('helvetica', 'normal');
            const splitNote = doc.splitTextToSize(proforma.nota, 180);
            doc.text(proforma.nota, 14, finalY + 5, { align: 'justify', maxWidth: 180 });

            finalY += (splitNote.length * 5) + 15;
        }

        // 8. Note (Static Disclaimer)
        doc.setFont('helvetica', 'bold');
        // doc.rect(14, finalY, 180, 8); // Removed box
        doc.text('NOTA: Se garantiza los trabajos realizados si el paciente sigue las recomendaciones indicadas y asiste a sus controles periódicos de manera puntual.', 14, finalY + 3.5, { align: 'justify', maxWidth: 180 });

        finalY += 12;

        // 9. Footer Text
        const footerY = finalY;
        doc.setFont('helvetica', 'normal');
        doc.text('El presente plan de tratamiento podría tener modificaciones en el transcurso del tratamiento; el mismo será notificado oportunamente a su persona.', 14, footerY, { align: 'justify', maxWidth: 180 });
        doc.text('Plan de tratamiento válido por 15 días.', 14, footerY + 10);
        doc.text('En conformidad y aceptando el presente plan de tratamiento, firmo.', 14, footerY + 15);

        // 10. Signatures
        const sigY = footerY + 60;

        // Left Signature (Clinic/System)
        if (clinicSignature) {
            try {
                // Background for signature area
                doc.setDrawColor(240, 240, 240);
                doc.rect(20, sigY - 20, 70, 25);

                // Add signature image
                doc.addImage(clinicSignature.firmaData, 'PNG', 30, sigY - 18, 50, 20);

                // Technical verification info
                doc.setFontSize(6);
                doc.setTextColor(150);
                // doc.text(`HASH: ${clinicSignature.hashDocumento}`, 20, sigY + 12);
                // doc.text(`VERIFICADO: ${clinicSignature.verificado ? 'SÍ' : 'PENDIENTE'} - ${new Date(clinicSignature.timestamp).toLocaleString()}`, 20, sigY + 15);
                doc.setTextColor(0);
            } catch (err) {
                console.error('Error adding clinic signature to PDF:', err);
            }
        }
        doc.line(20, sigY + 7, 90, sigY + 7);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const clinicName = clinicSignature ? `${clinicSignature.usuario.nombre} ${clinicSignature.usuario.apellido}` : (clinicaActual?.nombre || 'CLINICAS LENS');
        doc.text(clinicName, 55, sigY + 11, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(clinicSignature ? (clinicSignature.rolFirmante === 'doctor' ? 'ODONTÓLOGO' : 'PERSONAL') : 'FIRMA AUTORIZADA', 55, sigY + 15, { align: 'center' });

        // Right Signature (Patient)
        if (patientSignature) {
            try {
                // Background for signature area
                doc.setDrawColor(240, 240, 240);
                doc.rect(120, sigY - 20, 70, 25);

                // Add signature image
                doc.addImage(patientSignature.firmaData, 'PNG', 130, sigY - 18, 50, 20);

                // Technical verification info
                doc.setFontSize(6);
                doc.setTextColor(150);
                // doc.text(`HASH: ${patientSignature.hashDocumento}`, 120, sigY + 12);
                // doc.text(`VERIFICADO: ${patientSignature.verificado ? 'SÍ' : 'PENDIENTE'} - ${new Date(patientSignature.timestamp).toLocaleString()}`, 120, sigY + 15);
                doc.setTextColor(0);
            } catch (err) {
                console.error('Error adding patient signature to PDF:', err);
            }
        }
        doc.line(120, sigY + 7, 190, sigY + 7);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(patientName, 155, sigY + 11, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text('PACIENTE', 155, sigY + 15, { align: 'center' });

        if (action === 'print') {
            const blobUrl = URL.createObjectURL(doc.output('blob'));
            const printWindow = window.open(blobUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.focus();
                    printWindow.print();
                };
            } else {
                // Fallback: just open the PDF in a new tab if popup was blocked
                window.open(blobUrl, '_blank');
            }
        } else if (action === 'download') {
            doc.save(`plan_de_tratamiento_${proforma.numero}_${paciente?.paterno}.pdf`);
        } else if (action === 'blob') {
            return doc.output('blob');
        }
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                            <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Planes de Tratamiento
                    </h2>
                    {paciente && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {paciente.paterno} {paciente.materno} {paciente.nombre}{paciente.seguro_medico ? ` (${paciente.seguro_medico})` : ''} — {proformas.length} plan(es) registrado(s)
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <Link
                        to={`/pacientes/${id}/presupuestos/create`}
                        className="bg-[#3498db] hover:bg-blue-600 text-white hover:text-white font-bold py-2 px-5 text-sm rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Plan
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por número, nota o fecha..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Record Count */}
            {filteredProformas.length > 0 && (
                <div className="mb-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredProformas.length)} de {filteredProformas.length} planes de tratamiento
                </div>
            )}

            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registrado Por</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total (Bs.)</th>

                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Enviar</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Imprimir</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Exportar</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Firmar</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentProformas.map((proforma) => {
                            const isCompleted = completedBudgets.has(proforma.id);
                            return (
                                <tr key={proforma.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className={`px-5 py-4 whitespace-nowrap text-sm font-medium ${isCompleted ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-900 dark:text-gray-200'
                                        }`}>
                                        {proforma.numero}
                                    </td>
                                    <td className={`px-5 py-4 whitespace-nowrap text-sm ${isCompleted ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-500 dark:text-gray-400'
                                        }`}>
                                        <div>{formatDate(proforma.fecha)}</div>
                                        {isCompleted && (
                                            <div className="text-[10px] uppercase tracking-tighter mt-0.5 leading-none">
                                                Plan Terminado
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {proforma.usuario?.name || 'Sistema'}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-800 dark:text-gray-200">
                                        {Number(proforma.total).toFixed(2)}
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <button
                                            onClick={() => handleSendWhatsApp(proforma, true)}
                                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Enviar por WhatsApp"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <button
                                            onClick={() => generatePDF(proforma, 'print', true)}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Imprimir"
                                        >
                                            <Printer size={20} />
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <button
                                            onClick={() => generatePDF(proforma, 'download', true)}
                                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Exportar PDF"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <button
                                            onClick={() => {
                                                setSelectedPresupuesto(proforma);
                                                setShowSignatureModal(true);
                                            }}
                                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Firmar Plan de Tratamiento"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedViewId(proforma.id);
                                                    setShowViewModal(true);
                                                }}
                                                className="p-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Ver"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            {isCompleted ? (
                                                <button disabled className="p-2 bg-gray-400 text-gray-200 rounded-lg shadow-md cursor-not-allowed opacity-60 inline-flex items-center justify-center" title="Plan Terminado - Edición Bloqueada">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <Link
                                                    to={`/pacientes/${id}/presupuestos/edit/${proforma.id}`}
                                                    className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => handleDelete(proforma.id)}
                                                disabled={!canDeleteBudget(proforma.id)}
                                                className="p-2 bg-red-500 text-white rounded-lg shadow-md transition-all transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:bg-red-600 hover:-translate-y-0.5"
                                                title={!canDeleteBudget(proforma.id) ? "No se puede eliminar: tiene pagos o seguimiento clínico asociado" : "Eliminar Plan de Tratamiento"}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredProformas.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                    <div className="flex flex-col items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p>No hay planes de tratamiento registrados para este paciente.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filteredProformas.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredProformas.length / itemsPerPage)}
                    onPageChange={(page) => setCurrentPage(page)}
                />
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Planes de Tratamiento"
                sections={manualSections}
            />

            <PresupuestoViewModal
                isOpen={showViewModal}
                onClose={() => { setShowViewModal(false); setSelectedViewId(null); }}
                proformaId={selectedViewId}
                pacienteNombre={paciente ? `${paciente.paterno} ${paciente.materno} ${paciente.nombre}` : undefined}
            />

            {/* Signature Modal */}
            {showSignatureModal && selectedPresupuesto && (
                <SignatureModal
                    isOpen={showSignatureModal}
                    onClose={() => {
                        setShowSignatureModal(false);
                        setSelectedPresupuesto(null);
                    }}
                    tipoDocumento="presupuesto"
                    documentoId={selectedPresupuesto.id}
                    rolFirmante="paciente"
                    onSuccess={() => {
                        // Success handling already shows alert in SignatureModal
                    }}
                />
            )}
        </div >
    );
};

export default PresupuestoList;
