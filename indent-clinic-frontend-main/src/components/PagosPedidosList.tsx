import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import type { PagosPedidos } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Pagination from './Pagination';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import PagosPedidosPrintModal from './PagosPedidosPrintModal';
import autoTable from 'jspdf-autotable';
import PagosPedidosForm from './PagosPedidosForm';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Download, Printer, CreditCard } from 'lucide-react';


const PagosPedidosList: React.FC = () => {
    const [pagos, setPagos] = useState<PagosPedidos[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Pagos de Pedidos',
            content: 'Gestión de pagos a proveedores por pedidos de insumos/inventario realizados.'
        },
        {
            title: 'Nuevo Pago',
            content: 'Use el botón azul "+ Nuevo Pago". Debe seleccionar el Pedido realizado al Proveedor.'
        },
        {
            title: 'Documentación',
            content: 'Es importante registrar el número de Factura y Recibo del proveedor para el control contable.'
        }];

    // Search & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const [showingPrintModal, setShowingPrintModal] = useState(false);
    const [modalMode, setModalMode] = useState<'print' | 'export'>('print');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedPagoId, setSelectedPagoId] = useState<number | string | null>(null);
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [userPermisos, setUserPermisos] = useState<string[]>([]);
    const canEditPayments = !userPermisos.includes('editar-pagos');

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
            const response = await api.get<PagosPedidos[]>(`/pagos-pedidos${clinicaParam}`);
            // Sort by latest first
            const sorted = response.data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setPagos(sorted);
        } catch (error) {
            console.error('Error fetching pagos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro de eliminar este pago?',
            text: 'El pedido volverá a estado "Pendiente".',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos-pedidos/${id}`);
                fetchPagos();
                Swal.fire(
                    'Eliminado!',
                    'El pago ha sido eliminado.',
                    'success'
                );
            } catch (error) {
                console.error('Error deleting pago:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar pago'
                });
            }
        }
    };

    // Filter Logic
    const filteredPagos = pagos.filter(p => {
        const matchesProvider = p.pedido?.proveedor?.proveedor?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesProvider;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredPagos.length / itemsPerPage);
    const currentPagos = filteredPagos.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Export & Print
    const exportToExcel = () => {
        const data = filteredPagos.map(p => ({
            Fecha: p.fecha,
            Pedido: p.pedido?.id || p.idPedido,
            Proveedor: p.pedido?.proveedor?.proveedor || '',
            Monto: p.monto,
            Factura: p.factura,
            Recibo: p.recibo,
            FormaPago: p.forma_pago
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'PagosPedidos');
        XLSX.writeFile(wb, 'pagos_pedidos.xlsx');
    };

    const handleExportClick = () => {
        setModalMode('export');
        setShowingPrintModal(true);
    };

    const handlePrintClick = () => {
        setModalMode('print');
        setShowingPrintModal(true);
    };

    const handleModalConfirm = (filteredProvider: string | null) => {
        if (modalMode === 'print') {
            handlePrint(filteredProvider);
        } else {
            exportToPDF(filteredProvider);
        }
    };

    const exportToPDF = async (filteredProvider: string | null) => {
        let exportPagos = filteredPagos;
        if (filteredProvider) {
            exportPagos = pagos.filter(p => p.pedido?.proveedor?.proveedor === filteredProvider);
        }

        try {
            const doc = new jsPDF();

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

            const headerTitle = 'LISTA DE PAGOS DE PEDIDOS';
            const pageWidth = doc.internal.pageSize.width;

            // Title next to logo
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80); // #2c3e50
            doc.text(headerTitle, 60, 20);

            // Blue line under header
            doc.setDrawColor(52, 152, 219); // #3498db
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            let currentY = 35;

            // Provider subtitle box (if specific provider selected)
            if (filteredProvider) {
                doc.setFillColor(236, 240, 241); // #ecf0f1
                doc.rect(15, currentY, pageWidth - 30, 10, 'F');

                // Blue left border
                doc.setFillColor(52, 152, 219); // #3498db
                doc.rect(15, currentY, 1, 10, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(44, 62, 80);
                doc.text(`Proveedor: ${filteredProvider}`, 20, currentY + 6.5);

                currentY += 15;
            }

            const tableData = exportPagos.map(p => [
                formatDate(p.fecha),
                p.pedido?.proveedor?.proveedor || '',
                p.monto,
                p.factura || '',
                p.recibo || '',
                p.forma_pago || ''
            ]);

            autoTable(doc, {
                head: [['Fecha', 'Proveedor', 'Monto', 'Factura', 'Recibo', 'Forma Pago']],
                body: tableData,
                startY: currentY,
                theme: 'plain',
                margin: { left: 15, right: 15 },
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    lineColor: [221, 221, 221],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [52, 152, 219], // #3498db
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'left',
                    lineWidth: 0.1,
                    lineColor: [41, 128, 185],
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250] // #f8f9fa
                },
            });


            doc.save(`pagos_pedidos_${getLocalDateString()}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
        }
    };

    const handlePrintRecibo = async (pago: PagosPedidos) => {
        try {
            const doc = new jsPDF();

            const drawReceipt = (startY: number, title: string) => {
                // Border for the receipt
                doc.setDrawColor(200);
                doc.rect(10, startY, 190, 135);

                // Header without background
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('RECIBO DE PAGO', 105, startY + 15, { align: 'center' });

                doc.setFontSize(14);
                doc.setTextColor(100);
                doc.text(title, 190, startY + 15, { align: 'right' }); // ORIGINAL / COPIA

                // Info Container
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');

                const contentStartY = startY + 40;
                const lineHeight = 10;

                // Data
                doc.setFont('helvetica', 'bold');
                doc.text('Fecha de Pago:', 20, contentStartY);
                doc.setFont('helvetica', 'normal');
                // Handle potential string date or Date object
                const fechaStr = formatDate(pago.fecha);
                doc.text(fechaStr, 70, contentStartY);

                doc.setFont('helvetica', 'bold');
                doc.text('Proveedor:', 20, contentStartY + lineHeight);
                doc.setFont('helvetica', 'normal');
                doc.text(pago.pedido?.proveedor?.proveedor || 'N/A', 70, contentStartY + lineHeight);

                doc.setFont('helvetica', 'bold');
                doc.text('Monto:', 20, contentStartY + lineHeight * 2);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(14);
                doc.text(`${pago.monto} BS`, 70, contentStartY + lineHeight * 2); // Assuming BS as default currency if not present
                doc.setFontSize(12);

                doc.setFont('helvetica', 'bold');
                doc.text('Forma de Pago:', 20, contentStartY + lineHeight * 3);
                doc.setFont('helvetica', 'normal');
                doc.text(pago.forma_pago || 'N/A', 70, contentStartY + lineHeight * 3);

                // Combine Factura and Recibo as observations or additional info
                let detalles = '';
                if (pago.factura) detalles += `Factura: ${pago.factura} `;
                if (pago.recibo) detalles += `Recibo Ext: ${pago.recibo}`;

                if (detalles) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Referencias:', 20, contentStartY + lineHeight * 4);
                    doc.setFont('helvetica', 'normal');
                    doc.text(detalles, 70, contentStartY + lineHeight * 4);
                }

                // Footer / Signature Area
                doc.setDrawColor(150);
                const sigY = startY + 115;
                doc.line(25, sigY, 85, sigY);
                doc.line(125, sigY, 185, sigY);

                doc.setFontSize(10);
                doc.text('Firma Responsable', 55, sigY + 5, { align: 'center' });
                doc.text('Firma Receptor', 155, sigY + 5, { align: 'center' });
            };

            // Draw Original (Top half)
            drawReceipt(10, 'ORIGINAL');

            // Cutting line
            doc.setDrawColor(200);
            (doc as any).setLineDash([5, 5], 0);
            doc.line(0, 148, 210, 148);
            (doc as any).setLineDash([], 0); // Reset dash

            // Draw Copy (Bottom half)
            drawReceipt(158, 'COPIA');

            // Footer text
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Comprobante generado automáticamente por el sistema ${clinicaActual?.nombre || 'CLINICAS LENS'}`, 105, 290, { align: 'center' });

            // Auto print and open
            const receiptLogo = clinicaActual?.logo;
            if (receiptLogo) {
                try {
                    const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image();
                        if (receiptLogo.startsWith('http') || receiptLogo.startsWith('data:')) {
                            img.crossOrigin = 'Anonymous';
                        }
                        img.src = receiptLogo;
                        img.onload = () => resolve(img);
                        img.onerror = reject;
                    });
                    // Add logo to both copies of the receipt
                    doc.addImage(logo, 'PNG', 15, 15, 25, 10);
                    doc.addImage(logo, 'PNG', 15, 163, 25, 10);
                } catch (error) {
                    console.warn('Could not load clinic logo for receipt', error);
                }
            }

            doc.autoPrint();
            window.open(doc.output('bloburl'), '_blank');
        } catch (error) {
            console.error('Error creating receipt:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al generar el recibo'
            });
        }
    };

    const handlePrint = (filteredProvider: string | null) => {
        let printPagos = filteredPagos;
        if (filteredProvider) {
            printPagos = pagos.filter(p => p.pedido?.proveedor?.proveedor === filteredProvider);
        }

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


        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Lista de Pagos de Pedidos</title>
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

                    .lab-subtitle {
                        margin-top: 10px;
                        padding: 8px 15px;
                        background-color: #ecf0f1;
                        border-left: 4px solid #3498db;
                        font-size: 14px;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                        font-size: 11px;
                    }
                    
                    th {
                        background-color: #3498db;
                        color: white;
                        padding: 10px 8px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #2980b9;
                    }
                    
                    td {
                        padding: 8px;
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
                    <h1>LISTA DE PAGOS DE PEDIDOS</h1>
                </div>
                ${filteredProvider ? `<div class="lab-subtitle">Proveedor: ${filteredProvider}</div>` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Proveedor</th>
                            <th>Monto</th>
                            <th>Factura</th>
                            <th>Recibo</th>
                            <th>Forma Pago</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printPagos.map((p) => `
                            <tr>
                                <td>${formatDate(p.fecha)}</td>
                                <td>${p.pedido?.proveedor?.proveedor || ''}</td>
                                <td>${p.monto}</td>
                                <td>${p.factura || '-'}</td>
                                <td>${p.recibo || '-'}</td>
                                <td>${p.forma_pago}</td>
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

        const logo = doc.querySelector('img');

        const doPrint = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print error:', e);
            } finally {
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

    if (loading) return <div className="text-center p-4">Cargando...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <CreditCard className="text-blue-600" size={32} />
                            Pagos de Pedidos
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de pagos a proveedores por pedidos realizados</p>
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
                            onClick={exportToExcel}
                            className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a Excel"
                        >
                            <FileText size={18} />
                            <span className="text-sm">Excel</span>
                        </button>
                        <button
                            onClick={handleExportClick}
                            className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a PDF"
                        >
                            <Download size={18} />
                            <span className="text-sm">PDF</span>
                        </button>
                        <button
                            onClick={handlePrintClick}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                    <button
                        onClick={() => { setSelectedPagoId(null); setIsDrawerOpen(true); }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Pago
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar por Proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </div>
                    {(searchTerm) && (
                        <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {filteredPagos.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPagos.length)} de {filteredPagos.length} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Factura</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Recibo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentPagos.map((pago, index) => {
                            const isLocked = userPermisos.includes('cerrar-caja') && clinicaActual?.fecha_cierre_caja && pago.fecha.split('T')[0] <= clinicaActual.fecha_cierre_caja.split('T')[0];

                            return (
                                <tr key={pago.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(pago.fecha)}</td>
                                    <td className="p-3 text-gray-800 dark:text-gray-300">{pago.pedido?.proveedor?.proveedor}</td>
                                    <td className="p-3 font-semibold text-gray-800 dark:text-gray-300">{pago.monto}</td>
                                    <td className="p-3 text-gray-800 dark:text-gray-300">{pago.factura || '-'}</td>
                                    <td className="p-3 text-gray-800 dark:text-gray-300">{pago.recibo || '-'}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-sm">
                                            {pago.forma_pago}
                                        </span>
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            onClick={() => handlePrintRecibo(pago)}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Imprimir Recibo"
                                        >
                                            <Printer size={20} />
                                        </button>
                                        <button
                                            onClick={() => { if (canEditPayments && !isLocked) { setSelectedPagoId(pago.id); setIsDrawerOpen(true); } }}
                                            disabled={!canEditPayments || !!isLocked}
                                            className={`font-bold p-2 rounded-lg shadow-md transition-all transform flex items-center justify-center ${canEditPayments && !isLocked ? 'bg-[#ffc107] hover:bg-yellow-600 hover:-translate-y-0.5 text-white cursor-pointer' : 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'}`}
                                            title={isLocked ? 'Caja Cerrada' : canEditPayments ? 'Editar' : 'Sin permiso para editar pagos'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => !isLocked && handleDelete(pago.id)}
                                            disabled={!!isLocked}
                                            className={`font-bold p-2 rounded-lg shadow-md transition-all transform flex items-center justify-center ${isLocked ? 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60' : 'bg-[#dc3545] hover:bg-red-700 hover:-translate-y-0.5 text-white cursor-pointer'}`}
                                            title={isLocked ? 'Caja Cerrada' : 'Eliminar'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pagos Pedidos"
                sections={manualSections}
            />

            {/* Print Filter Modal */}
            <PagosPedidosPrintModal
                isOpen={showingPrintModal}
                onClose={() => setShowingPrintModal(false)}
                onConfirm={handleModalConfirm}
                pagos={pagos}
                mode={modalMode}
            />

            <PagosPedidosForm
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

export default PagosPedidosList;
