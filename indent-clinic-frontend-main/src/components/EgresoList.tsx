import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Egreso } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import EgresoForm from './EgresoForm';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Download, Printer, MinusCircle } from 'lucide-react';


interface PaginatedResponse {
    data: Egreso[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totals?: Record<string, { bolivianos: number; dolares: number }>;
}

const EgresoList: React.FC = () => {
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [egresos, setEgresos] = useState<Egreso[]>([]);

    // Date & Calendar State
    const [calendarValue, setCalendarValue] = useState<any>(new Date());
    const [startDate, setStartDate] = useState(getLocalDateString()); // Default to today
    const [endDate, setEndDate] = useState(getLocalDateString());   // Default to today

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;
    const [totals, setTotals] = useState<Record<string, { bolivianos: number; dolares: number }>>({});
    const [showManual, setShowManual] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedEgresoId, setSelectedEgresoId] = useState<number | string | null>(null);
    const [userPermisos, setUserPermisos] = useState<string[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (e) {}
        }
    }, []);

    const manualSections: ManualSection[] = [
        {
            title: 'Navegación por Calendario',
            content: 'Utilice el calendario a la izquierda para ver los egresos de una fecha específica. Al seleccionar un día, la lista se filtra automáticamente.'
        },
        {
            title: 'Gestión de Egresos',
            content: 'Registro de gastos operativos (limpieza, insumos diarios, refacciones, etc).'
        },
        {
            title: 'Registrar Egreso',
            content: 'Botón azul "+ Nuevo Egreso". Registre los detalles para los reportes.'
        },
        {
            title: 'Filtros y Búsqueda',
            content: 'Puede buscar por descripción del gasto. El rango de fechas se actualiza automáticamente al usar el calendario, pero también puede modificarse manualmente.'
        },
        {
            title: 'Reportes y Totales',
            content: 'Al final de la lista, el sistema muestra automáticamente los totales sumados por forma de pago (Efectivo, Transferencia, etc) según los filtros aplicados.'
        }];

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchEgresos();
    }, [currentPage, debouncedSearchTerm, startDate, endDate, clinicaSeleccionada]);

    const fetchEgresos = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }

            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            const response = await api.get<PaginatedResponse>(`/egresos?${params}`);
            setEgresos(response.data.data || []);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
            if (response.data.totals) {
                setTotals(response.data.totals);
            }
        } catch (error) {
            console.error('Error fetching egresos:', error);
            alert('Error al cargar los egresos');
        }
    };

    // ... (handlers remain same)



    const handleCalendarChange = (value: any) => {
        setCalendarValue(value);
        if (value instanceof Date) {
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            // Set both start and end to the selected date for single-day view
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            setCurrentPage(1); // Reset to first page
        }
    };

    const handleClearSearch = () => {
        const today = new Date();
        setCalendarValue(today);
        const todayStr = getLocalDateString();
        setStartDate(todayStr);
        setEndDate(todayStr);
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este egreso?')) {
            try {
                await api.delete(`/egresos/${id}`);
                alert('Egreso eliminado exitosamente');
                fetchEgresos();
            } catch (error) {
                console.error('Error deleting egreso:', error);
                alert('Error al eliminar el egreso');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // ... (export functions remain same)


    const exportToExcel = () => {
        try {
            const excelData = egresos.map(egreso => ({
                'ID': egreso.id,
                'Fecha': formatDate(egreso.fecha),

                'Detalle': egreso.detalle,
                'Monto': egreso.monto,
                'Moneda': egreso.moneda,
                'Forma de Pago': egreso.formaPago?.forma_pago || ''
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Egresos');
            XLSX.writeFile(wb, `egresos_${getLocalDateString()}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error al exportar a Excel');
        }
    };

    const exportToPDF = async () => {
        try {
            // Fetch ALL records for PDF with current filters
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }
            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }
            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            const response = await api.get<PaginatedResponse>(`/egresos?${params}`);
            const allEgresos = response.data.data || [];

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
            doc.text('REPORTE DE EGRESOS', 60, 20);

            // Blue line under header
            doc.setDrawColor(52, 152, 219); // #3498db
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text(`Fecha de impresión: ${formatDate(new Date())}`, 15, 35);
            
            if (startDate && endDate) {
                doc.text(`Rango: ${formatDate(startDate)} al ${formatDate(endDate)}`, 15, 41);
            }

            const tableData = allEgresos.map(egreso => [
                egreso.id,
                formatDate(egreso.fecha),
                egreso.detalle,
                Number(egreso.monto).toFixed(2),
                egreso.moneda,
                egreso.formaPago?.forma_pago || ''
            ]);

            autoTable(doc, {
                head: [['ID', 'Fecha', 'Detalle', 'Monto', 'Moneda', 'Forma Pago']],
                body: tableData,
                startY: 48,
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

            doc.save(`egresos_${getLocalDateString()}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Error al exportar a PDF');
        }
    };

    const handlePrint = async () => {
        try {
            // Fetch ALL records for printing with current filters
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }
            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }
            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            const response = await api.get<PaginatedResponse>(`/egresos?${params}`);
            const allEgresos = response.data.data || [];
            const totals = response.data.totals || {};

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
                    <title>Reporte de Egresos</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 2cm 1.5cm 3cm 1.5cm;
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            padding-bottom: 60px;
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
                        
                        .filter-info {
                            margin-bottom: 15px;
                            font-size: 11px;
                            color: #666;
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

                        /* Totals Section Styles */
                        .totals-container {
                            margin-top: 30px;
                            page-break-inside: avoid;
                        }

                        .totals-title {
                            font-size: 14px;
                            font-weight: bold;
                            color: #2c3e50;
                            margin-bottom: 10px;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 5px;
                        }

                        .totals-grid {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 15px;
                        }

                        .total-card {
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 10px;
                            min-width: 120px;
                            background-color: #f9f9f9;
                        }

                        .total-header {
                            font-weight: bold;
                            font-size: 11px;
                            color: #555;
                            margin-bottom: 5px;
                            text-transform: capitalize;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 3px;
                        }

                        .total-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 11px;
                            margin-bottom: 2px;
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
                        <h1>Reporte de Egresos</h1>
                    </div>
                    
                    ${startDate && endDate ? `<div class="filter-info">Rango: ${formatDate(startDate)} al ${formatDate(endDate)}</div>` : ''}
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>

                                <th>Detalle</th>
                                <th>Monto</th>
                                <th>Moneda</th>
                                <th>Forma Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allEgresos.map((egreso: Egreso) => `
                                <tr>
                                    <td>${formatDate(egreso.fecha)}</td>

                                    <td>${egreso.detalle}</td>
                                    <td>${egreso.monto}</td>
                                    <td>${egreso.moneda}</td>
                                    <td>${egreso.formaPago?.forma_pago || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals-container">
                        <div class="totals-title">Totales por Forma de Pago</div>
                        <div class="totals-grid">
                            ${Object.entries(totals).map(([key, value]) => `
                                <div class="total-card">
                                    <div class="total-header">
                                        ${key === 'Efectivo' ? '💵 ' :
                    key === 'Depósito' ? '🏦 ' :
                        key === 'Transferencia' ? '🏦 ' :
                            key === 'QR' ? '📱 ' : '💰 '} ${key}
                                    </div>
                                    <div class="total-row">
                                        <span>Bs:</span> <span>${value.bolivianos.toFixed(2)}</span>
                                    </div>
                                    <div class="total-row">
                                        <span>$us:</span> <span>${value.dolares.toFixed(2)}</span>
                                    </div>
                                </div>
                            `).join('')}
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
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión');
        }
    };

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen flex flex-col gap-6">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-center no-print gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <MinusCircle className="text-red-500" size={32} />
                            Gestión de Egresos
                        </h2>
                        {startDate && startDate === endDate ? (
                            <p className="text-sm font-normal text-blue-600 dark:text-blue-400 mt-1">
                                Control de gastos del {formatDate(startDate)}
                            </p>
                        ) : (
                            <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                                {startDate ? `Desde: ${formatDate(startDate)}` : 'Control de gastos diarios'}
                                {endDate ? ` - Hasta: ${formatDate(endDate)}` : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center">
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
                                onClick={exportToPDF}
                                className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                                title="Exportar a PDF"
                            >
                                <Download size={18} />
                                <span className="text-sm">PDF</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                                title="Imprimir"
                            >
                                <Printer size={18} />
                                <span className="text-sm">Imprimir</span>
                            </button>
                        </div>

                        <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                        <button
                            onClick={() => { setSelectedEgresoId(null); setIsDrawerOpen(true); }}
                            className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <span className="text-xl font-bold">+</span> Nuevo Egreso
                        </button>
                    </div>
                </div>

                {/* Content Layout - Two Columns on Desktop */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    
                    {/* Sidebar: Calendar and Date Filters */}
                    <div className="w-full lg:w-[350px] flex-shrink-0 flex flex-col gap-6 no-print">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 text-center uppercase tracking-wider">Filtrar por Fecha</h3>
                            <div className="calendar-wrapper">
                                <Calendar
                                    onChange={handleCalendarChange}
                                    value={calendarValue}
                                    locale="es-ES"
                                    className="dark:bg-transparent dark:text-white border-none w-full !bg-transparent text-sm"
                                    tileClassName={({ date, view }) => {
                                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                        if (view === 'month' && dateStr === startDate) {
                                            return 'bg-blue-600 !text-white rounded-full font-bold shadow-md transform scale-110';
                                        }
                                        return 'hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-700 dark:text-gray-300';
                                    }}
                                />
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-tighter">Rango Manual</h4>
                                <div className="flex flex-col gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde:</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white bg-white dark:bg-gray-700 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta:</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white bg-white dark:bg-gray-700 text-sm"
                                        />
                                    </div>
                                    {(startDate || endDate || searchTerm) && (
                                        <button
                                            type="button"
                                            onClick={handleClearSearch}
                                            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg text-sm transition-colors text-center"
                                        >
                                            Ver Hoy
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Manual Date Shortcut Card? (Optional, maybe later) */}
                    </div>

                    {/* Main Area: Search, Table, Totals */}
                    <div className="flex-1 min-w-0 flex flex-col gap-6">
                        
                        {/* Search and List Header */}
                        <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex gap-2 w-full md:max-w-md">
                                <div className="relative flex-grow">
                                    <input
                                        type="text"
                                        placeholder="Buscar por detalle..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                                    />
                                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </div>
                                {searchTerm && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {total === 0 ? 'No hay registros' : (
                                    <>Mostrando <span className="text-gray-900 dark:text-gray-100">{(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)}</span> de {total} registros</>
                                )}
                            </div>
                        </div>


                        {/* Table Container */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">#</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Fecha</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Detalle</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest text-right">Monto</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Moneda</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Forma Pago</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {egresos.length > 0 ? (
                                            egresos.map((egreso, index) => {
                                                const isLocked = userPermisos.includes('cerrar-caja') && clinicaActual?.fecha_cierre_caja && egreso.fecha.split('T')[0] <= clinicaActual.fecha_cierre_caja.split('T')[0];

                                                return (
                                                    <tr key={egreso.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{(currentPage - 1) * limit + index + 1}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-300 whitespace-nowrap">{formatDate(egreso.fecha)}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{egreso.detalle}</td>
                                                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                                                            {egreso.monto.toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{egreso.moneda}</td>
                                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                                                {egreso.formaPago?.forma_pago || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => !isLocked && (setSelectedEgresoId(egreso.id), setIsDrawerOpen(true))}
                                                                    disabled={!!isLocked}
                                                                    className={`p-2 rounded-lg shadow-md transition-all transform ${isLocked ? 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60' : 'bg-amber-400 hover:bg-amber-500 hover:-translate-y-0.5 text-white cursor-pointer'}`}
                                                                    title={isLocked ? 'Caja Cerrada' : 'Editar'}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => !isLocked && handleDelete(egreso.id)}
                                                                    disabled={!!isLocked}
                                                                    className={`p-2 rounded-lg shadow-md transition-all transform ${isLocked ? 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60' : 'bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 text-white cursor-pointer'}`}
                                                                    title={isLocked ? 'Caja Cerrada' : 'Eliminar'}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <svg className="w-12 h-12 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                        <span>No hay egresos registrados para este filtro.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals Section Below Table */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Object.entries(totals || {}).map(([key, value]: [string, any]) => (
                                <div key={key} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md border-l-4 border-l-blue-500">
                                    <div className="font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm uppercase">
                                        <span className="text-lg">
                                            {key === 'Efectivo' ? '💵' :
                                                key === 'Depósito' ? '🏦' :
                                                    key === 'Transferencia' ? '🏦' :
                                                        key === 'QR' ? '📱' :
                                                            key === 'Debito' ? '💳' : '💰'}
                                        </span>
                                        {key}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-base">
                                            <span className="text-gray-500">Bs:</span> <span className="font-bold text-gray-900 dark:text-white">{(value.bolivianos || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between text-base">
                                            <span className="text-gray-500">$us:</span> <span className="font-bold text-gray-900 dark:text-white">{(value.dolares || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(totals).length === 0 && (
                                <div className="col-span-full p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 italic">
                                    No hay egresos registrados para este período.
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals & Forms */}
                <ManualModal
                    isOpen={showManual}
                    onClose={() => setShowManual(false)}
                    title="Manual de Usuario - Egresos"
                    sections={manualSections}
                />
                <EgresoForm
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    id={selectedEgresoId}
                    onSaveSuccess={() => {
                        fetchEgresos();
                        setIsDrawerOpen(false);
                    }}
                />
            </div>

            <style>{`
                /* Base Calendar Styles */
                .calendar-wrapper .react-calendar { 
                    border: none; 
                    font-family: inherit;
                    width: 100%;
                    background-color: transparent;
                }
                
                /* Navigation (Month/Year) */
                .calendar-wrapper .react-calendar__navigation button {
                    min-width: 44px;
                    background: none;
                    color: #374151; /* gray-700 */
                }
                
                .calendar-wrapper .react-calendar__navigation__label {
                    font-weight: bold;
                    font-size: 1rem;
                }
                
                .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #f3f4f6;
                }
                
                /* Weekday headers (Lu, Ma, Mi...) */
                .calendar-wrapper .react-calendar__month-view__weekdays {
                    text-align: center;
                    text-transform: uppercase;
                    font-weight: bold;
                    font-size: 0.75em;
                    color: #6b7280; /* gray-500 */
                    margin-bottom: 0.5rem;
                }
                
                .calendar-wrapper .react-calendar__month-view__weekdays__weekday {
                     text-decoration: none; 
                }

                /* Day Tiles */
                .calendar-wrapper .react-calendar__tile {
                    color: #374151; /* gray-700 - Explicitly set dark color for days */
                    font-weight: 500;
                    padding: 0.75em 0.5em;
                }

                .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #9ca3af !important; /* gray-400 */
                }

                .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #ef4444; /* red-500 */
                }

                /* Dark Mode Overrides */
                .dark .calendar-wrapper .react-calendar {
                    color: white;
                }
                
                .dark .calendar-wrapper .react-calendar__navigation button {
                    color: #f3f4f6; /* gray-100 */
                }

                .dark .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .dark .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #374151;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__weekdays {
                    color: #9ca3af; /* gray-400 */
                }
                
                .dark .calendar-wrapper .react-calendar__tile {
                    color: #e5e7eb; /* gray-200 */
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #f87171; /* red-400 */
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #4b5563 !important; /* gray-600 */
                }

                .dark .calendar-wrapper .react-calendar__tile:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile:enabled:focus {
                    background-color: #374151;
                }
                
                /* Active/Selected State Overrides (Specific) */
                .calendar-wrapper .react-calendar__tile.bg-blue-100 {
                    color: #1e40af !important; /* blue-800 */
                    background-color: #dbeafe !important;
                }
                .dark .calendar-wrapper .react-calendar__tile.dark\\:bg-blue-900 {
                    background-color: #1e3a8a !important; /* blue-900 */
                    color: #ffffff !important; /* white */
                }
                .calendar-wrapper .react-calendar__tile.bg-blue-600,
                .calendar-wrapper .react-calendar__tile.bg-blue-600 abbr {
                    color: white !important;
                }
            `}</style>
        </div>
    );
};

export default EgresoList;
