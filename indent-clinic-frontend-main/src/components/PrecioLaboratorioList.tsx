import React, { useState, useEffect } from 'react';

import api from '../services/api';
import type { PrecioLaboratorio } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import Swal from 'sweetalert2';
import PrecioLaboratorioModal from './PrecioLaboratorioModal';
import { FileText, Download, Printer, BadgeDollarSign } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';


const PrecioLaboratorioList: React.FC = () => {
    const [precios, setPrecios] = useState<PrecioLaboratorio[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const limit = 10;


    const [showManual, setShowManual] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPrecioId, setSelectedPrecioId] = useState<number | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Precios',
            content: 'Aquí puede administrar los precios de los trabajos de laboratorio.'
        },
        {
            title: 'Búsqueda',
            content: 'Utilice la barra de búsqueda para filtrar por detalle del trabajo.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para precios activos, el botón rojo (papelera) cambia el estado a "Inactivo". Para precios inactivos, aparece un botón verde (check) que permite reactivarlos a estado "Activo".'
        },
        {
            title: 'Exportación',
            content: 'Puede exportar la lista a Excel o PDF, e imprimir el reporte.'
        }];

    const { clinicaActual, clinicaSeleccionada } = useClinica();

    useEffect(() => {
        fetchPrecios();
    }, [searchTerm, currentPage, clinicaSeleccionada]);

    const fetchPrecios = async () => {
        try {
            const clinicaParam = clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : '';
            const response = await api.get(`/precios-laboratorios?page=${currentPage}&limit=${limit}&search=${searchTerm}${clinicaParam}`);
            setPrecios(Array.isArray(response.data.data) ? response.data.data : []);
            setTotalPages(response.data.totalPages || 0);
            setTotalRecords(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching precios:', error);
            setPrecios([]);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja precio?',
            text: 'El precio pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/precios-laboratorios/${id}`, { estado: 'inactivo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Precio dado de baja!',
                    text: 'El estado del precio ha sido cambiado a Inactivo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPrecios();
            } catch (error) {
                console.error('Error al dar de baja precio:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo dar de baja el precio'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar precio?',
            text: 'El precio volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/precios-laboratorios/${id}`, { estado: 'activo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Precio reactivado!',
                    text: 'El estado del precio ha sido cambiado a Activo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPrecios();
            } catch (error) {
                console.error('Error al reactivar precio:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el precio'
                });
            }
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleCreate = () => {
        setSelectedPrecioId(null);
        setIsModalOpen(true);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const exportToExcel = () => {
        const dataToExport = precios.map(p => ({
            Detalle: p.detalle,
            Precio: p.precio,
            Laboratorio: p.laboratorio?.laboratorio || 'N/A',
            Estado: p.estado
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Precios");
        XLSX.writeFile(wb, "precios_laboratorios.xlsx");
    };

    // Print/Export Modal State
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [modalMode, setModalMode] = useState<'print' | 'export'>('print');
    const [selectedLabId, setSelectedLabId] = useState<string>('');
    const [printLaboratorios, setPrintLaboratorios] = useState<any[]>([]);

    const fetchPrintLaboratorios = async () => {
        try {
            const response = await api.get('/precios-laboratorios?page=1&limit=9999');
            const allPrecios = Array.isArray(response.data.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);

            const uniqueLabsMap = new Map();
            allPrecios.forEach((precio: any) => {
                if (precio.laboratorio && precio.laboratorio.id && precio.laboratorio.laboratorio) {
                    if (!uniqueLabsMap.has(precio.laboratorio.id)) {
                        uniqueLabsMap.set(precio.laboratorio.id, {
                            id: precio.laboratorio.id,
                            laboratorio: precio.laboratorio.laboratorio
                        });
                    }
                }
            });

            const uniqueLabs = Array.from(uniqueLabsMap.values()).sort((a: any, b: any) =>
                a.laboratorio.localeCompare(b.laboratorio)
            );

            setPrintLaboratorios(uniqueLabs);
        } catch (error) {
            console.error('Error fetching laboratories:', error);
            setPrintLaboratorios([]);
        }
    };

    const handleOpenPrintModal = () => {
        setModalMode('print');
        setShowPrintModal(true);
        fetchPrintLaboratorios();
    };

    const handleOpenExportModal = () => {
        setModalMode('export');
        setShowPrintModal(true);
        fetchPrintLaboratorios();
    };

    const handleConfirmPrint = async () => {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });

            if (selectedLabId && selectedLabId !== 'all') {
                params.append('laboratorioId', selectedLabId);
            }

            const response = await api.get(`/precios-laboratorios?${params}`);
            const allPrecios = Array.isArray(response.data.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);

            if (allPrecios.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin datos',
                    text: 'No hay precios para imprimir con los filtros seleccionados',
                    confirmButtonColor: '#3498db'
                });
                return;
            }


            let reportTitle = 'Lista de Precios de Laboratorios';
            let labSubtitle = '';
            let isSpecificLabSelected = false;

            if (selectedLabId && selectedLabId !== 'all') {
                const selectedLab = printLaboratorios.find(l => l.id.toString() === selectedLabId);
                if (selectedLab) {
                    labSubtitle = selectedLab.laboratorio;
                    isSpecificLabSelected = true;
                }
            }

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${reportTitle}</title>
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
                        
                        .status-active {
                            color: #27ae60;
                            font-weight: bold;
                        }
                        
                        .status-inactive {
                            color: #e74c3c;
                            font-weight: bold;
                        }
                        
                        .footer {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            padding: 10px 1.5cm;
                            background: white;
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
                        <h1>${reportTitle}</h1>
                    </div>
                    ${labSubtitle ? `<div class="lab-subtitle">Laboratorio: ${labSubtitle}</div>` : ''}
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Detalle</th>
                                <th>Precio</th>
                                ${!isSpecificLabSelected ? '<th>Laboratorio</th>' : ''}
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allPrecios.map((precio: any) => `
                                <tr>
                                    <td>${precio.detalle || 'N/A'}</td>
                                    <td>${precio.precio ? Number(precio.precio).toFixed(2) : '0.00'}</td>
                                    ${!isSpecificLabSelected ? `<td>${precio.laboratorio?.laboratorio || 'N/A'}</td>` : ''}
                                    <td class="${precio.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                                        ${precio.estado ? precio.estado.charAt(0).toUpperCase() + precio.estado.slice(1) : 'N/A'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>


                </body>
                </html>
            `;

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

            doc.open();
            doc.write(printContent);
            doc.close();

            iframe.contentWindow?.focus();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);

            setShowPrintModal(false);
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión');
        }
    };

    const handleConfirmExport = async () => {
        try {
            const response = await api.get('/precios-laboratorios?page=1&limit=9999');
            let allPrecios = Array.isArray(response.data.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);

            if (selectedLabId && selectedLabId !== 'all') {
                const labIdNum = Number(selectedLabId);
                allPrecios = allPrecios.filter((p: any) => p.laboratorio?.id === labIdNum);
            }

            if (allPrecios.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin datos',
                    text: 'No hay precios para exportar con los filtros seleccionados',
                    confirmButtonColor: '#3498db'
                });
                return;
            }

            const doc = new jsPDF();
            let reportTitle = 'Lista de Precios de Laboratorios';
            let labSubtitle = '';
            let isSpecificLabSelected = false;

            if (selectedLabId && selectedLabId !== 'all') {
                const selectedLab = printLaboratorios.find(l => l.id.toString() === selectedLabId);
                if (selectedLab) {
                    labSubtitle = selectedLab.laboratorio;
                    isSpecificLabSelected = true;
                }
            }
            // Removed logo as per user request


            const pageWidth = doc.internal.pageSize.width;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80);
            doc.text(reportTitle.toUpperCase(), 60, 20);

            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            let currentY = 35;

            if (labSubtitle) {
                doc.setFillColor(236, 240, 241);
                doc.rect(15, currentY, pageWidth - 30, 10, 'F');
                doc.setFillColor(52, 152, 219);
                doc.rect(15, currentY, 1, 10, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(44, 62, 80);
                doc.text(`Laboratorio: ${labSubtitle}`, 20, currentY + 6.5);
                currentY += 15;
            }

            doc.setTextColor(0, 0, 0);

            const tableColumn = isSpecificLabSelected
                ? ["Detalle", "Precio", "Estado"]
                : ["Detalle", "Precio", "Laboratorio", "Estado"];

            const tableRows = allPrecios.map((p: any) => {
                const row = [
                    p.detalle || 'N/A',
                    `Bs ${p.precio ? Number(p.precio).toFixed(2) : '0.00'}`
                ];
                if (!isSpecificLabSelected) {
                    row.push(p.laboratorio?.laboratorio || 'N/A');
                }
                row.push(p.estado ? p.estado.charAt(0).toUpperCase() + p.estado.slice(1) : 'N/A');
                return row;
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: currentY,
                theme: 'plain',
                margin: { left: 15, right: 15 },
                styles: { fontSize: 9, cellPadding: 3, lineColor: [221, 221, 221], lineWidth: 0.1 },
                headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', lineWidth: 0.1, lineColor: [41, 128, 185] },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                columnStyles: isSpecificLabSelected ? { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' }, 2: { cellWidth: 30, halign: 'center' } } : { 0: { cellWidth: 'auto' }, 1: { cellWidth: 35, halign: 'right' }, 2: { cellWidth: 50 }, 3: { cellWidth: 30, halign: 'center' } },
                didParseCell: function (data) {
                    if (data.column.index === (isSpecificLabSelected ? 2 : 3) && data.section === 'body') {
                        const estado = data.cell.raw as string;
                        if (estado && estado.toLowerCase().includes('activo')) {
                            data.cell.styles.textColor = [39, 174, 96];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (estado && estado.toLowerCase().includes('inactivo')) {
                            data.cell.styles.textColor = [231, 76, 60];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });



            doc.save("precios_laboratorios.pdf");
            setShowPrintModal(false);
            Swal.fire({ icon: 'success', title: 'PDF Exportado', text: 'El archivo PDF se ha descargado correctamente', timer: 2000, showConfirmButton: false });
        } catch (error) {
            console.error('Error al exportar:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF' });
        }
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <BadgeDollarSign className="text-blue-600" size={32} />
                            Lista de Precios de Laboratorios
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de aranceles y costos de servicios externos</p>
                    </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-center items-center md:justify-end">
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
                            onClick={handleOpenExportModal}
                            className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a PDF"
                        >
                            <Download size={18} />
                            <span className="text-sm">PDF</span>
                        </button>
                        <button
                            onClick={handleOpenPrintModal}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-2 self-center"></div>

                    <button
                        onClick={handleCreate}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Precio
                    </button>
                </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow-inner border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por detalle..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)} de {totalRecords} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Laboratorio</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detalle</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.isArray(precios) && precios.map((precio, index) => (
                            <tr key={precio.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {(currentPage - 1) * limit + index + 1}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {precio.laboratorio?.laboratorio || 'N/A'}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">
                                    {precio.detalle}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-bold">
                                    {Number(precio.precio).toFixed(2)}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded text-sm ${precio.estado === 'activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                        {precio.estado}
                                    </span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 no-print">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedPrecioId(precio.id);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        {precio.estado === 'activo' ? (
                                            <button
                                                onClick={() => handleDelete(precio.id)}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Dar de baja"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleReactivate(precio.id)}
                                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all transform hover:-translate-y-0.5"
                                                title="Reactivar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {(!precios || precios.length === 0) && (
                            <tr>
                                <td colSpan={6} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                    <div className="flex flex-col items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p>No hay precios registrados</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Precios de Laboratorios"
                sections={manualSections}
            />

            {/* Print Selection Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowPrintModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${modalMode === 'export' ? 'bg-red-100' : 'bg-blue-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                                        <svg className={`h-6 w-6 ${modalMode === 'export' ? 'text-red-600' : 'text-blue-600'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {modalMode === 'export' ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            )}
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
                                            {modalMode === 'print' ? 'Imprimir Lista de Precios' : 'Exportar Lista de Precios'}
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Seleccione el laboratorio del cual desea {modalMode === 'print' ? 'imprimir' : 'exportar'} los precios.
                                                Solo se muestran laboratorios con precios registrados.
                                            </p>
                                            <div className="mb-4">
                                                <label htmlFor="laboratorio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Laboratorio
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <select
                                                        id="laboratorio"
                                                        value={selectedLabId}
                                                        onChange={(e) => setSelectedLabId(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-2 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="" className="text-gray-500">-- Seleccione una opción --</option>
                                                        <option value="all">Todos los laboratorios</option>
                                                        {printLaboratorios.map((lab) => (
                                                            <option key={lab.id} value={lab.id}>
                                                                {lab.laboratorio}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                                <button
                                    type="button"
                                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${modalMode === 'export' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 focus:ring-blue-500'}`}
                                    onClick={modalMode === 'export' ? handleConfirmExport : handleConfirmPrint}
                                >
                                    {modalMode === 'export' ? 'Exportar PDF' : 'Imprimir'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowPrintModal(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PrecioLaboratorioModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                precioId={selectedPrecioId}
                onSuccess={fetchPrecios}
            />
        </div>
    );
};

export default PrecioLaboratorioList;
