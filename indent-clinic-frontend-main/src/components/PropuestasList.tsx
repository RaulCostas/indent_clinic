import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Paciente, Propuesta } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateSpanish, numberToWords } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import { Printer } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';
import PropuestaViewModal from './PropuestaViewModal';


const PropuestasList: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [paciente, setPaciente] = useState<Paciente | null>(null);
    const [propuestas, setPropuestas] = useState<Propuesta[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showManual, setShowManual] = useState(false);
    const { clinicaActual } = useClinica();
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedViewId, setSelectedViewId] = useState<number | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Propuestas de Tratamiento',
            content: 'Gestión de múltiples opciones de tratamiento para el paciente. Puede crear hasta 6 variantes (A-F).'
        },
        {
            title: 'Opciones de Propuesta',
            content: 'Cada columna (Total A, Total B, etc.) muestra el costo total de esa opción. Si está vacía o en cero, no se ha cargado nada en esa letra.'
        },
        {
            title: 'Acciones',
            content: 'Use los botones para Ver (Ojo), Editar (Lápiz), Imprimir (Impresora) o Eliminar (Basurero) una propuesta.'
        },
        {
            title: 'Crear Nueva',
            content: 'Haga clic en "+ Nueva Propuesta" para diseñar opciones de tratamiento.'
        }];

    const filteredPropuestas = propuestas.filter(p =>
        p.numero.toString().includes(searchTerm) ||
        p.nota?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(p.fecha).includes(searchTerm)
    );

    useEffect(() => {
        if (id) {
            fetchPaciente(Number(id));
            fetchPropuestas(Number(id));
        }
    }, [id]);

    const fetchPaciente = async (pacienteId: number) => {
        try {
            const response = await api.get(`/pacientes/${pacienteId}`);
            setPaciente(response.data);
        } catch (error) {
            console.error('Error fetching paciente:', error);
        }
    };

    const fetchPropuestas = async (pacienteId: number) => {
        try {
            const response = await api.get(`/propuestas/paciente/${pacienteId}`);
            setPropuestas(response.data);
        } catch (error) {
            console.error('Error fetching propuestas:', error);
        }
    };

    const deletePropuesta = async (propuestaId: number) => {
        try {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "No podrás revertir esto!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar!',
                cancelButtonText: 'Cancelar',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });

            if (result.isConfirmed) {
                await api.delete(`/propuestas/${propuestaId}`);
                setPropuestas(propuestas.filter(p => p.id !== propuestaId));
                Swal.fire({
                    title: 'Eliminado!',
                    text: 'La propuesta ha sido eliminada.',
                    icon: 'success',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        } catch (error) {
            console.error('Error deleting propuesta:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar la propuesta',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const generatePDF = (propuesta: Propuesta, action: 'print' | 'download', letra?: string) => {
        const doc = new jsPDF();

        // 1. Date (Right aligned)
        doc.setFontSize(10);
        doc.setTextColor(0);
        const dateStr = formatDateSpanish(propuesta.fecha);
        doc.text(dateStr, 200, 20, { align: 'right' });

        // 2. Salutation
        doc.setFont('helvetica', 'normal');
        doc.text('Señor(a):', 14, 35);

        doc.setFont('helvetica', 'bold');
        const patientName = `${paciente?.paterno || ''} ${paciente?.materno || ''} ${paciente?.nombre || ''} ${paciente?.seguro_medico ? `(${paciente.seguro_medico})` : ''}`.trim().toUpperCase();
        doc.text(patientName, 14, 40);

        doc.setFont('helvetica', 'normal');
        doc.text('De mi consideración:', 14, 50);
        doc.text('Según los estudios realizados le presentamos la siguiente propuesta del tratamiento odontológico que Ud. requiere:', 14, 55, { align: 'justify', maxWidth: 180 });

        // 3. Propuesta Number
        doc.setFont('helvetica', 'bold');
        const propNumber = letra ? `Prop. # ${propuesta.numero.toString().padStart(2, '0')} - Opción ${letra}` : `Prop. # ${propuesta.numero.toString().padStart(2, '0')}`;
        doc.text(propNumber, 200, 65, { align: 'right' });

        // 4. Table - Filter by letra if provided
        const filteredDetalles = letra ? propuesta.detalles.filter(d => d.letra === letra) : propuesta.detalles;
        const hasDiscount = filteredDetalles.some(item => item.descuento > 0);

        let tableColumn = ["Pieza(s)", "Descripción", "Cant.", "P.U.", "Total"];
        if (hasDiscount) {
            tableColumn.push("Descuento %", "Total con Dcto %");
        }

        const tableRows: any[] = [];

        filteredDetalles.forEach(item => {
            const row = [
                item.piezas,
                item.arancel?.detalle || '',
                item.cantidad,
                Number(item.precioUnitario).toFixed(2),
                Number(item.total).toFixed(2)
            ];

            if (hasDiscount) {
                row.push(
                    item.descuento ?? '-',
                    Number(item.total).toFixed(2)
                );
            }

            tableRows.push(row);
        });

        const columnStyles: any = {
            0: { halign: 'center' }, // Pieza(s)
            1: { halign: 'left' }, // Descripción
            2: { halign: 'center' }, // Cant
            3: { halign: 'right' }, // PU
            4: { halign: 'right' } // Total
        };

        if (hasDiscount) {
            columnStyles[5] = { halign: 'center' }; // Descuento
            columnStyles[6] = { halign: 'right' }; // Total con Dcto
        }

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

        // Totals Row
        let finalY = (doc as any).lastAutoTable.finalY;

        // Fallback static positioning if capture failed
        if (lastColWidth === 0) {
            lastColWidth = 30; lastColX = 165;
            penultColWidth = 30; penultColX = 135;
        }

        doc.setFont('helvetica', 'bold');

        doc.rect(penultColX, finalY, penultColWidth, 7);
        doc.rect(lastColX, finalY, lastColWidth, 7);

        const totalAmount = letra
            ? filteredDetalles.reduce((acc, curr) => acc + Number(curr.total), 0)
            : Number(propuesta.total);

        doc.text('TOTAL Bs.', penultColX + penultColWidth - 2, finalY + 5, { align: 'right' });
        doc.text(totalAmount.toFixed(2), lastColX + lastColWidth - 2, finalY + 5, { align: 'right' });

        finalY += 15;

        // 5. Amount in Words
        doc.setFont('helvetica', 'normal');
        const decimalPart = (totalAmount % 1).toFixed(2).substring(2);
        const words = numberToWords(totalAmount);
        doc.text(`SON: ${words} ${decimalPart}/100 BOLIVIANOS`, 14, finalY);

        finalY += 10;

        // 5.1 Propuesta Note
        if (propuesta.nota) {
            doc.setFont('helvetica', 'bold');
            doc.text('NOTA:', 14, finalY);

            doc.setFont('helvetica', 'normal');
            const splitNote = doc.splitTextToSize(propuesta.nota, 165);
            doc.text(splitNote, 30, finalY);

            finalY += (splitNote.length * 5) + 5;
        }



        finalY += 5;

        // 7. Payment System
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        // doc.rect(14, finalY, 40, 5); // Removed box
        doc.text('SISTEMA DE PAGO', 14, finalY + 3.5);

        doc.setFont('helvetica', 'normal');
        // doc.rect(14, finalY + 6, 180, 5); // Removed box
        doc.text('- Cancelación del 50% al inicio. 30% durante el tratamiento. 20% antes de finalizado el mismo.', 14, finalY + 9.5, { align: 'justify', maxWidth: 180 });

        finalY += 15;

        // 8. Note
        doc.setFont('helvetica', 'bold');
        // doc.rect(14, finalY, 180, 8); // Removed box
        doc.text('NOTA: Se garantiza los trabajos realizados si el paciente sigue las recomendaciones indicadas y asiste a sus controles periódicos de manera puntual.', 14, finalY + 3.5, { align: 'justify', maxWidth: 180 });

        finalY += 12;

        // 9. Footer Text
        const footerY = finalY;
        doc.setFont('helvetica', 'normal');
        doc.text('El presente plan de tratamiento podría tener modificaciones en el transcurso del tratamiento; el mismo será notificado oportunamente a su persona.', 14, footerY, { align: 'justify', maxWidth: 180 });
        doc.text('Plan de Tratamiento válido por 15 días.', 14, footerY + 10);
        doc.text('En conformidad y aceptando el presente plan de tratamiento, firmo.', 14, footerY + 15);

        // 10. Signatures
        const sigY = footerY + 40;

        // Left Signature
        doc.line(30, sigY, 80, sigY);
        doc.text(clinicaActual?.nombre || 'CLINICAS LENS', 35, sigY + 5);

        // Right Signature
        doc.line(120, sigY, 180, sigY);
        doc.text(patientName, 125, sigY + 5);

        if (action === 'print') {
            const blobUrl = URL.createObjectURL(doc.output('blob'));
            const printWindow = window.open(blobUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
            } else {
                window.open(blobUrl, '_blank');
            }
        } else {
            const fileName = letra
                ? `propuesta_${propuesta.numero}_${letra}_${paciente?.paterno}.pdf`
                : `propuesta_${propuesta.numero}_${paciente?.paterno}.pdf`;
            doc.save(fileName);
        }
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        Propuestas del Paciente
                    </h2>
                    {paciente && (
                        <h3 className="text-xl text-gray-600 dark:text-gray-300 mt-2">
                            {paciente.paterno} {paciente.materno} {paciente.nombre} {paciente.seguro_medico ? `(${paciente.seguro_medico})` : ''}
                        </h3>
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
                        to={`/pacientes/${id}/propuestas/create`}
                        className="bg-purple-600 hover:bg-purple-700 text-white hover:text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Propuesta
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 flex-grow max-w-md">
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

            <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Prop.</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registrado Por</th>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map(letra => (
                                <th key={letra} className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total {letra}</th>
                            ))}
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredPropuestas.map((propuesta) => {
                            const calculateTotalByLetra = (letra: string) => {
                                return propuesta.detalles
                                    .filter(d => d.letra === letra)
                                    .reduce((acc, curr) => acc + Number(curr.total), 0);
                            };

                            return (
                                <tr key={propuesta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">{propuesta.numero}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(propuesta.fecha)}</td>
                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{propuesta.usuario?.name || 'Sistema'}</td>
                                    {['A', 'B', 'C', 'D', 'E', 'F'].map(letra => {
                                        const total = calculateTotalByLetra(letra);
                                        return (
                                            <td key={letra} className="px-5 py-4 whitespace-nowrap text-sm text-center">
                                                {total > 0 ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{total.toFixed(2)}</span>
                                                                                                                <button
                                                            onClick={() => generatePDF(propuesta, 'print', letra)}
                                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                            title={`Imprimir Opción ${letra}`}
                                                        >
                                                            <Printer size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-600">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-5 py-4 whitespace-nowrap text-center no-print">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedViewId(propuesta.id);
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
                                            <Link
                                                to={`/pacientes/${id}/propuestas/edit/${propuesta.id}`}
                                                className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => deletePropuesta(propuesta.id)}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Eliminar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredPropuestas.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                    <div className="flex flex-col items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p>No hay propuestas registradas para este paciente.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <PropuestaViewModal
                isOpen={showViewModal}
                onClose={() => { setShowViewModal(false); setSelectedViewId(null); }}
                propuestaId={selectedViewId}
                pacienteNombre={paciente ? `${paciente.paterno} ${paciente.materno} ${paciente.nombre}` : undefined}
            />
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Propuestas"
                sections={manualSections}
            />
        </div>
    );
};

export default PropuestasList;
