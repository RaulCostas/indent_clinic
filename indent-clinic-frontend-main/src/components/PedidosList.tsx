import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Pedidos } from '../types';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import PedidosPrintModal from './PedidosPrintModal';
import PedidoViewModal from './PedidoViewModal';
import PagosPedidosForm from './PagosPedidosForm';
import PedidosForm from './PedidosForm';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Download, Printer, ShoppingCart } from 'lucide-react';


const PedidosList: React.FC = () => {
    const navigate = useNavigate();
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [pedidos, setPedidos] = useState<Pedidos[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [showingPrintModal, setShowingPrintModal] = useState(false);
    const [modalMode, setModalMode] = useState<'print' | 'export'>('print');
    const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null);
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [selectedPedidoForPayment, setSelectedPedidoForPayment] = useState<number | null>(null);
    const [isPedidoFormOpen, setIsPedidoFormOpen] = useState(false);
    const [selectedEditId, setSelectedEditId] = useState<number | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Pedidos de Inventario',
            content: 'Gestión de pedidos de suministros e insumos a proveedores.'
        },
        {
            title: 'Nuevo Pedido',
            content: 'Al crear un pedido, el sistema actualizará automáticamente el stock de los productos recibidos.'
        },
        {
            title: 'Pagos',
            content: 'Puede registrar pagos parciales o totales de un pedido usando el botón verde "Pagar" (billete).'
        },
        {
            title: 'Eliminación',
            content: 'Si elimina un pedido, el sistema revertirá (restará) el stock agregado por ese pedido.'
        }];
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPedidos();
    }, [clinicaSeleccionada]);

    const fetchPedidos = async () => {
        try {
            // Note: Currently backend findAll doesn't support pagination/search, 
            // but we'll structure it for future or simple list for now.
            // If backend returns simple array:
            const url = clinicaSeleccionada ? `/pedidos?clinicaId=${clinicaSeleccionada}` : '/pedidos';
            const response = await api.get<Pedidos[]>(url);
            setPedidos(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pedidos:', error);
            setPedidos([]);
            setLoading(false);
        }
    };

    const handlePagar = (id: number) => {
        setSelectedPedidoForPayment(id);
        setIsPaymentDrawerOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar pedido?',
            text: "Esta acción eliminará el pedido y revertirá el stock. ¿Está seguro?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pedidos/${id}`);
                setPedidos(pedidos.filter(p => p.id !== id));
                Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: 'El pedido ha sido eliminado correctamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error('Error deleting pedido:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar el pedido'
                });
            }
        }
    };


    const exportToExcel = () => {
        try {
            const excelData = pedidos.map(p => ({
                'ID': p.id,
                'Fecha': formatDate(p.fecha),
                'Proveedor': p.proveedor?.proveedor || '',
                'Total': p.Total,
                'Observaciones': p.Observaciones,
                'Pagado': p.Pagado ? 'SI' : 'NO'
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
            XLSX.writeFile(wb, `pedidos_${getLocalDateString()}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
        }
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
        try {
            // Filter pedidos just like in print mode
            let exportPedidos = filteredPedidos;
            if (filteredProvider) {
                exportPedidos = pedidos.filter(p => p.proveedor?.proveedor === filteredProvider);
            }

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


            const pageWidth = doc.internal.pageSize.width;

            // Title next to logo
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80); // #2c3e50
            doc.text('LISTA DE PEDIDOS', 60, 20);

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

            doc.setTextColor(0, 0, 0);

            const tableRows = exportPedidos.map((p, index) => [
                index + 1,
                formatDate(p.fecha),
                `Bs ${Number(p.Sub_Total).toFixed(2)}`,
                `Bs ${Number(p.Descuento).toFixed(2)}`,
                `Bs ${Number(p.Total).toFixed(2)}`,
                p.Pagado ? 'SI' : 'NO'
            ]);

            autoTable(doc, {
                head: [['#', 'Fecha', 'Sub Total', 'Descuento', 'Total', 'Pagado']],
                body: tableRows,
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


            doc.save(`pedidos_${getLocalDateString()}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
        }
    };

    const handlePrint = (filteredProvider: string | null) => {
        let printPedidos = filteredPedidos;

        // If a specific provider is selected from modal, ignore current search and filter by that provider on ALL pedidos
        // Or if user wants to print 'what is seen' but refined?
        // Usually 'Print based on filter' means apply this filter.
        if (filteredProvider) {
            printPedidos = pedidos.filter(p => p.proveedor?.proveedor === filteredProvider);
        } else {
            // If no provider selected in modal, use the currently filtered list (respecting search term)
            printPedidos = filteredPedidos;
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
                <title>Lista de Pedidos</title>
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
                    
                    .footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 10px 0;
                    }
                    
                    .footer-line {
                        border-top: 1px solid #333;
                        margin-bottom: 10px;
                    }
                    
                    .footer-content {
                        display: flex;
                        justify-content: flex-end;
                        font-size: 9px;
                        color: #666;
                    }
                    
                    .footer-info {
                        text-align: right;
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
                        
                        .footer {
                            position: fixed;
                            bottom: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${clinicaActual?.logo || '/logo-curare.png'}" alt="Logo">
                    <div>
                    <h1>Lista de Pedidos</h1>
                </div>
                </div>
                ${filteredProvider ? `<div class="lab-subtitle">Proveedor: ${filteredProvider}</div>` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Fecha</th>
                            <th>Sub Total</th>
                            <th>Descuento</th>
                            <th>Total</th>
                            <th>Pagado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printPedidos.map((p, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${formatDate(p.fecha)}</td>
                                <td>${Number(p.Sub_Total).toFixed(2)}</td>
                                <td>${Number(p.Descuento).toFixed(2)}</td>
                                <td>${Number(p.Total).toFixed(2)}</td>
                                <td>${p.Pagado ? 'SI' : 'NO'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                
                <script>
                    window.onload = function() {
                        updatePageNumber();
                    };
                    
                    window.onbeforeprint = function() {
                        updatePageNumber();
                    };
                    
                    function updatePageNumber() {
                        const pageInfo = document.getElementById('page-info');
                        if (pageInfo) {
                            const pageHeight = 1056; 
                            const contentHeight = document.body.scrollHeight;
                            const totalPages = Math.ceil(contentHeight / pageHeight);
                            pageInfo.textContent = 'Página 1 de ' + totalPages;
                        }
                    }
                </script>
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


    // Filter logic
    const filteredPedidos = pedidos.filter(p =>
        searchTerm === '' ||
        p.proveedor?.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="text-center p-4">Cargando...</div>;

    return (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <ShoppingCart className="text-blue-600" size={32} />
                            Lista de Pedidos
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de pedidos de suministros e insumos a proveedores</p>
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
                        onClick={() => { setSelectedEditId(null); setIsPedidoFormOpen(true); }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Pedido
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex gap-2 flex-grow max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-gray-400 absolute left-3 top-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
                <button
                    onClick={() => navigate('/pedidos/deudas')}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                >
                    Ver Deudas
                </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                Mostrando {filteredPedidos.length === 0 ? 0 : 1} - {filteredPedidos.length} de {pedidos.length} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sub Total</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descuento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pagado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredPedidos.map((pedido, index) => (
                            <tr key={pedido.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-800 dark:text-gray-300">{index + 1}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(pedido.fecha)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{pedido.proveedor?.proveedor}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{Number(pedido.Sub_Total).toFixed(2)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{Number(pedido.Descuento).toFixed(2)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{Number(pedido.Total).toFixed(2)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-sm ${pedido.Pagado ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                        {pedido.Pagado ? 'SI' : 'NO'}
                                    </span>
                                </td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedPedidoId(pedido.id);
                                            setIsViewModalOpen(true);
                                        }}
                                        className="p-2 bg-[#3498db] text-white rounded-lg hover:bg-blue-600 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Ver Detalles"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => handlePagar(pedido.id)}
                                        disabled={pedido.Pagado}
                                        className={`p-2 text-white rounded-lg flex items-center justify-center ${pedido.Pagado ? 'bg-gray-500 opacity-60 cursor-not-allowed' : 'bg-[#28a745] hover:bg-green-700 cursor-pointer shadow-md transition-all transform hover:-translate-y-0.5'}`}
                                        title={pedido.Pagado ? "Pagado" : "Pagar Pedido"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                            <line x1="1" y1="10" x2="23" y2="10"></line>
                                        </svg>
                                    </button>

                                    {pedido.Pagado ? (
                                        <span
                                            className="p-2 bg-gray-500 text-white rounded-lg opacity-60 cursor-not-allowed flex items-center justify-center"
                                            title="No se puede editar un pedido pagado"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => { setSelectedEditId(pedido.id); setIsPedidoFormOpen(true); }}
                                            className="p-2 bg-[#ffc107] text-white rounded-lg hover:bg-yellow-600 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(pedido.id)}
                                        disabled={pedido.Pagado}
                                        className={`p-2 text-white rounded-lg flex items-center justify-center ${pedido.Pagado ? 'bg-gray-500 opacity-60 cursor-not-allowed' : 'bg-[#dc3545] hover:bg-red-700 cursor-pointer shadow-md transition-all transform hover:-translate-y-0.5'}`}
                                        title={pedido.Pagado ? "No se puede eliminar un pedido pagado" : "Eliminar"}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredPedidos.length === 0 && (
                <p style={{ textAlign: 'center', marginTop: '20px', color: '#6c757d' }}>
                    {searchTerm ? 'No se encontraron pedidos con ese proveedor' : 'No hay pedidos registrados'}
                </p>
            )}
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pedidos"
                sections={manualSections}
            />

            {/* Read Only View Modal */}
            <PedidoViewModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                pedidoId={selectedPedidoId}
            />

            {/* Print Filter Modal */}
            <PedidosPrintModal
                isOpen={showingPrintModal}
                onClose={() => setShowingPrintModal(false)}
                onConfirm={handleModalConfirm}
                pedidos={pedidos}
                mode={modalMode}
            />

            {/* Payment Drawer */}
            <PagosPedidosForm
                isOpen={isPaymentDrawerOpen}
                onClose={() => setIsPaymentDrawerOpen(false)}
                preSelectedPedidoId={selectedPedidoForPayment}
                onSaveSuccess={() => {
                    fetchPedidos();
                    setIsPaymentDrawerOpen(false);
                }}
            />

            {/* Pedido Form Drawer */}
            <PedidosForm
                isOpen={isPedidoFormOpen}
                onClose={() => setIsPedidoFormOpen(false)}
                id={selectedEditId}
                onSaveSuccess={() => {
                    fetchPedidos();
                    setIsPedidoFormOpen(false);
                }}
            />
        </div>
    );
};

export default PedidosList;
