
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';

import Pagination from './Pagination';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ManualModal, { type ManualSection } from './ManualModal';
import PrintFilterModal from './PrintFilterModal';
import { formatDate } from '../utils/dateUtils';
import PagosLaboratoriosForm from './PagosLaboratoriosForm';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Download, Printer, Wallet } from 'lucide-react';


const PagosLaboratoriosList: React.FC = () => {
    const navigate = useNavigate();
    const [pagos, setPagos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [modalMode, setModalMode] = useState<'print' | 'export'>('print');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedPagoId, setSelectedPagoId] = useState<number | string | null>(null);
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [userPermisos, setUserPermisos] = useState<string[]>([]);
    const canEditPayments = !userPermisos.includes('editar-pagos');

    const manualSections: ManualSection[] = [
        {
            title: 'Pagos a Laboratorios',
            content: 'Registro de pagos por trabajos de laboratorio externos solicitiados.'
        },
        {
            title: 'Nuevo Pago',
            content: 'Use el botón azul "+ Nuevo Pago". Debe seleccionar el Trabajo de Laboratorio pendiente de pago.'
        },
        {
            title: 'Deudas',
            content: 'El botón morado "Ver Deudas" le permite ver rápidamente todos los trabajos de laboratorio entregados pero aún no pagados.'
        }];
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchPagos();
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (e) {}
        }
    }, [clinicaSeleccionada]);

    const fetchPagos = async () => {
        try {
            const clinicaParam = clinicaSeleccionada ? `?clinicaId=${clinicaSeleccionada}` : '';
            const response = await api.get(`/pagos-laboratorios${clinicaParam}`);
            setPagos(response.data);
        } catch (error) {
            console.error('Error fetching pagos:', error);
            Swal.fire('Error', 'No se pudieron cargar los pagos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: "Esta acción revertirá el estado del trabajo a 'No pagado' y eliminará el registro de pago.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos-laboratorios/${id}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El pago ha sido eliminado.',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchPagos();
            } catch (error) {
                console.error('Error deleting pago:', error);
                Swal.fire('Error', 'No se pudo eliminar el pago', 'error');
            }
        }
    };

    // Filter Logic
    const filteredPagos = pagos.filter(pago => {
        const term = searchTerm.toLowerCase();
        const pacienteName = pago.trabajoLaboratorio?.paciente ? `${pago.trabajoLaboratorio.paciente.nombre} ${pago.trabajoLaboratorio.paciente.paterno} `.toLowerCase() : '';
        const labName = pago.trabajoLaboratorio?.laboratorio?.laboratorio.toLowerCase() || '';
        return pacienteName.includes(term) || labName.includes(term);
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPagos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPagos.length / itemsPerPage);



    const handlePrint = async (laboratorioId: number | null, fechaInicio: string, fechaFinal: string) => {
        try {
            // Fetch filtered pagos
            let url = `/pagos-laboratorios?limit=9999`;
            const response = await api.get(url);
            let allPagos = Array.isArray(response.data) ? response.data : response.data.data || [];

            // Apply filters
            const filtered = allPagos.filter((p: any) => {
                const pagoDate = new Date(p.fecha);
                const inicio = new Date(fechaInicio);
                const final = new Date(fechaFinal);

                const dateMatch = pagoDate >= inicio && pagoDate <= final;
                const labMatch = !laboratorioId || p.trabajoLaboratorio?.idLaboratorio === laboratorioId;

                return dateMatch && labMatch;
            });

            if (filtered.length === 0) {
                Swal.fire('Sin datos', 'No hay pagos que coincidan con los filtros seleccionados', 'info');
                return;
            }

            // Create iframe for printing (Especialidades format)
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


            const labName = laboratorioId
                ? filtered[0]?.trabajoLaboratorio?.laboratorio?.laboratorio || 'Todos'
                : 'Todos los Laboratorios';

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Pagos a Laboratorios</title>
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
                            font-size: 22px;
                        }
                        
                        .filter-info {
                            margin: 15px 0;
                            padding: 10px;
                            background-color: #f8f9fa;
                            border-left: 4px solid #3498db;
                            font-size: 11px;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 10px;
                        }
                        
                        th {
                            background-color: #3498db;
                            color: white;
                            padding: 8px 6px;
                            text-align: left;
                            font-weight: bold;
                            border: 1px solid #2980b9;
                        }
                        
                        td {
                            padding: 6px;
                            border: 1px solid #ddd;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f8f9fa;
                        }
                        
                        
                        @media print {
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
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="${clinicaActual?.logo || '/logo-curare.png'}" alt="Logo">
                        <div>
                            <h1>Pagos a Laboratorios</h1>
                        </div>
                    </div>
                    
                    <div class="filter-info">
                        <strong>Laboratorio:</strong> ${labName} &nbsp;|&nbsp;
                        <strong>Período:</strong> ${formatDate(fechaInicio)} - ${formatDate(fechaFinal)}
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Fecha</th>
                                <th>Paciente</th>
                                <th>Laboratorio</th>
                                <th>Trabajo</th>
                                <th>Moneda</th>
                                <th>Monto</th>
                                <th>Forma Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map((p: any, idx: number) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${formatDate(p.fecha)}</td>
                                    <td>${p.trabajoLaboratorio?.paciente ? `${p.trabajoLaboratorio.paciente.nombre} ${p.trabajoLaboratorio.paciente.paterno}` : '-'}</td>
                                    <td>${p.trabajoLaboratorio?.laboratorio?.laboratorio || '-'}</td>
                                    <td>${p.trabajoLaboratorio?.precioLaboratorio?.detalle || '-'}</td>
                                    <td>${p.moneda === 'Bolivianos' ? 'Bs' : '$us'}</td>
                                    <td>${p.monto}</td>
                                    <td>${p.formaPago?.nombre || p.formaPago?.forma_pago || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            iframe.contentWindow?.focus();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);
        } catch (error) {
            console.error('Error printing:', error);
            Swal.fire('Error', 'No se pudo generar el reporte', 'error');
        }
    };

    const handleExportPDF = async (laboratorioId: number | null, fechaInicio: string, fechaFinal: string) => {
        try {
            // Fetch filtered pagos
            let url = `/pagos-laboratorios?limit=9999`;
            const response = await api.get(url);
            let allPagos = Array.isArray(response.data) ? response.data : response.data.data || [];

            // Apply filters
            const filtered = allPagos.filter((p: any) => {
                const pagoDate = new Date(p.fecha);
                const inicio = new Date(fechaInicio);
                const final = new Date(fechaFinal);

                const dateMatch = pagoDate >= inicio && pagoDate <= final;
                const labMatch = !laboratorioId || p.trabajoLaboratorio?.idLaboratorio === laboratorioId;

                return dateMatch && labMatch;
            });

            if (filtered.length === 0) {
                Swal.fire('Sin datos', 'No hay pagos que coincidan con los filtros seleccionados', 'info');
                return;
            }

            // Generate PDF
            const doc = new jsPDF();

            const labName = laboratorioId
                ? filtered[0]?.trabajoLaboratorio?.laboratorio?.laboratorio || 'Todos'
                : 'Todos los Laboratorios';

            // Add logo
            try {
                const logoPath = clinicaActual?.logo || '/logo-curare.png';
                const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    if (logoPath.startsWith('http') || logoPath.startsWith('data:')) {
                        img.crossOrigin = 'Anonymous';
                    }
                    img.src = logoPath;
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                });
                doc.addImage(logo, 'PNG', 15, 10, 40, 16);
            } catch (error) {
                console.warn('Could not load logo', error);
            }

            const pageWidth = doc.internal.pageSize.width;

            // Title next to logo
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(44, 62, 80);
            doc.text('Pagos a Laboratorios', 60, 20);

            // Blue line under header
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            let currentY = 35;

            // Filter info box
            doc.setFillColor(236, 240, 241);
            doc.rect(15, currentY, pageWidth - 30, 15, 'F');
            doc.setFillColor(52, 152, 219);
            doc.rect(15, currentY, 1, 15, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(44, 62, 80);
            doc.text(`Laboratorio: ${labName}`, 20, currentY + 5);
            doc.text(`Período: ${fechaInicio.split('T')[0]} al ${fechaFinal.split('T')[0]}`, 20, currentY + 11);

            currentY += 20;

            doc.setTextColor(0, 0, 0);

            // Prepare table data
            const tableColumn = ["Fecha", "Paciente", "Laboratorio", "Trabajo", "Mone.", "Monto", "Forma Pago"];
            const tableRows = filtered.map((p: any) => [
                formatDate(p.fecha),
                p.trabajoLaboratorio?.paciente ? `${p.trabajoLaboratorio.paciente.nombre} ${p.trabajoLaboratorio.paciente.paterno}` : '-',
                p.trabajoLaboratorio?.laboratorio?.laboratorio || '-',
                p.trabajoLaboratorio?.precioLaboratorio?.detalle || '-',
                p.moneda === 'Bolivianos' ? 'Bs' : '$us',
                p.monto ? Number(p.monto).toFixed(2) : (p.trabajoLaboratorio ? p.trabajoLaboratorio.total : '0.00'),
                p.formaPago ? p.formaPago.forma_pago : '-'
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: currentY,
                theme: 'plain',
                margin: { left: 15, right: 15 },
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [221, 221, 221],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'left',
                    lineWidth: 0.1,
                    lineColor: [41, 128, 185],
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                columnStyles: {
                    0: { cellWidth: 22 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 'auto' },
                    4: { cellWidth: 15, halign: 'center' },
                    5: { cellWidth: 20, halign: 'right' },
                    6: { cellWidth: 25 }
                }
            });


            doc.save("pagos_laboratorios.pdf");

            setShowPrintModal(false);

            Swal.fire({
                icon: 'success',
                title: 'PDF Exportado',
                text: 'El archivo PDF se ha descargado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error exporting PDF:', error);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
        }
    };

    const handleExportExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredPagos.map(p => ({
            Fecha: p.fecha.split('T')[0],
            Paciente: p.trabajoLaboratorio?.paciente ? `${p.trabajoLaboratorio.paciente.nombre} ${p.trabajoLaboratorio.paciente.paterno}` : '-',
            Laboratorio: p.trabajoLaboratorio?.laboratorio?.laboratorio || '-',
            Trabajo: p.trabajoLaboratorio?.precioLaboratorio?.detalle || '-',
            Moneda: p.moneda,
            Monto: p.monto,
            FormaPago: p.formaPago?.nombre || (p.formaPago?.forma_pago || '-')
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pagos");
        XLSX.writeFile(workbook, "Pagos_Laboratorios.xlsx");
    };

    if (loading) return <div className="p-4">Cargando...</div>;

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Wallet className="text-blue-600" size={32} />
                            Pagos a Laboratorios
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Control de pagos y saldos con laboratorios</p>
                    </div>
                </div>
                
                <div className="flex gap-2 flex-wrap justify-center items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>

                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handleExportExcel}
                            className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a Excel"
                        >
                            <FileText size={18} />
                            <span className="text-sm">Excel</span>
                        </button>
                        <button
                            onClick={() => { setModalMode('export'); setShowPrintModal(true); }}
                            className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a PDF"
                        >
                            <Download size={18} />
                            <span className="text-sm">PDF</span>
                        </button>
                        <button
                            onClick={() => { setModalMode('print'); setShowPrintModal(true); }}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-2 self-center"></div>

                    <button
                        onClick={() => { setSelectedPagoId(null); setIsDrawerOpen(true);}}
                        className="bg-[#3498db] hover:bg-blue-600 text-white hover:text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Pago
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                <div className="flex gap-2 flex-grow max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por Paciente o Laboratorio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
                <button
                    onClick={() => navigate('/pagos-laboratorios/deudas')}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                >
                    Ver Deudas
                </button>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 no-print">
                Mostrando {filteredPagos.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPagos.length)} de {filteredPagos.length} registros
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Laboratorio</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trabajo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mone.</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                         {currentItems.map((pago, index) => {
                            const isLocked = userPermisos.includes('cerrar-caja') && clinicaActual?.fecha_cierre_caja && pago.fecha.split('T')[0] <= clinicaActual.fecha_cierre_caja.split('T')[0];

                            return (
                                <tr key={pago.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(pago.fecha)}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.trabajoLaboratorio?.paciente ? `${pago.trabajoLaboratorio.paciente.nombre} ${pago.trabajoLaboratorio.paciente.paterno} ` : '-'}
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.trabajoLaboratorio?.laboratorio ? pago.trabajoLaboratorio.laboratorio.laboratorio : '-'}
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.trabajoLaboratorio?.precioLaboratorio ? pago.trabajoLaboratorio.precioLaboratorio.detalle : '-'}
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{pago.moneda === 'Bolivianos' ? 'Bs' : '$us'}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.monto ? Number(pago.monto).toFixed(2) : (pago.trabajoLaboratorio ? pago.trabajoLaboratorio.total : '0.00')}
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.formaPago ? pago.formaPago.forma_pago : '-'}
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            onClick={() => canEditPayments && !isLocked && (setSelectedPagoId(pago.id), setIsDrawerOpen(true))}
                                            disabled={!canEditPayments || !!isLocked}
                                            className={`p-2 rounded-lg shadow-md transition-all transform ${canEditPayments && !isLocked ? 'bg-amber-400 hover:bg-amber-500 hover:-translate-y-0.5 text-white cursor-pointer' : 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'}`}
                                            title={isLocked ? 'Caja Cerrada' : canEditPayments ? 'Editar' : 'Sin permiso para editar pagos'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => !isLocked && handleDelete(pago.id)}
                                            disabled={!!isLocked}
                                            className={`p-2 rounded-lg shadow-md transition-all transform ${isLocked ? 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60' : 'bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 text-white cursor-pointer'}`}
                                            title={isLocked ? 'Caja Cerrada' : 'Eliminar'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {currentItems.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-5 text-center text-gray-500 dark:text-gray-400">
                                    No se encontraron registros de pagos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls and Status */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-4">

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pagos Laboratorios"
                sections={manualSections}
            />
            {/* Print Filter Modal */}
            <PrintFilterModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                onPrint={handlePrint}
                onExport={handleExportPDF}
                modalMode={modalMode}
            />

            <PagosLaboratoriosForm
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                id={selectedPagoId}
                onSaveSuccess={() => {
                    fetchPagos();
                    setIsDrawerOpen(false);
                }}
            />
        </div>
    );
};

export default PagosLaboratoriosList;
