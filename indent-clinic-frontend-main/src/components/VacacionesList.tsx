import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Personal } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import VacacionesPrintModal from './VacacionesPrintModal';
import { formatDate , getLocalDateString } from '../utils/dateUtils';
import VacacionesForm from './VacacionesForm';
import { FileText, Download, Printer, Sun } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';


interface Vacacion {
    id: number;
    idpersonal: number;
    personal?: Personal;
    fecha: string;
    tipo_solicitud: string;
    cantidad_dias: number;
    fecha_desde: string;
    fecha_hasta: string;
    autorizado: string;
    observaciones: string;
    estado: string;
}

interface PaginatedResponse {
    data: Vacacion[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const VacacionesList: React.FC = () => {
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showManual, setShowManual] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedVacacionId, setSelectedVacacionId] = useState<number | string | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Vacaciones y Permisos',
            content: 'Gestión de solicitudes de vacaciones, permisos y licencias del personal.'
        },
        {
            title: 'Solicitud',
            content: 'Para registrar una nueva solicitud, use el botón azul "+ Nuevo". Debe especificar las fechas y el tipo de solicitud.'
        },
        {
            title: 'Autorización',
            content: 'Las solicitudes deben ser autorizadas por un administrador. El estado "Autorizado" se muestra en verde (SI) o rojo (NO).'
        }];
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [modalMode, setModalMode] = useState<'print' | 'export'>('print');
    const [printVacaciones, setPrintVacaciones] = useState<Vacacion[]>([]);

    const fetchPrintVacaciones = async () => {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }
            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/vacaciones?${params}`);
            setPrintVacaciones(response.data.data || []);
        } catch (error) {
            console.error('Error fetching all vacaciones for print:', error);
        }
    };

    useEffect(() => {
        fetchVacaciones();
    }, [currentPage, searchTerm, clinicaSeleccionada]);

    const fetchVacaciones = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            const response = await api.get<PaginatedResponse>(`/vacaciones?${params}`);

            // Handle both paginated and flat response for robustness
            if (response.data && Array.isArray(response.data.data)) {
                setVacaciones(response.data.data);
                setTotalPages(response.data.totalPages);
                setTotal(response.data.total);
            } else {
                const anyData = response.data as any;
                if (Array.isArray(anyData)) {
                    // Client-side pagination fallback if backend fails to update
                    const start = (currentPage - 1) * limit;
                    const end = start + limit;
                    const filtered = searchTerm
                        ? anyData.filter((v: any) =>
                            v.personal?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            v.personal?.paterno.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        : anyData;

                    setVacaciones(filtered.slice(start, end));
                    setTotal(filtered.length);
                    setTotalPages(Math.ceil(filtered.length / limit));
                } else {
                    setVacaciones(response.data.data || []);
                    setTotalPages(response.data.totalPages || 1);
                    setTotal(response.data.total || 0);
                }
            }

        } catch (error) {
            console.error('Error fetching vacaciones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
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
                await api.delete(`/vacaciones/${id}`);
                await Swal.fire(
                    '¡Eliminado!',
                    'La solicitud ha sido eliminada.',
                    'success'
                );
                fetchVacaciones();
            } catch (error) {
                console.error('Error deleting vacacion:', error);
                Swal.fire(
                    'Error',
                    'Hubo un problema al eliminar la solicitud.',
                    'error'
                );
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const exportToExcel = async () => {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            if (searchTerm) params.append('search', searchTerm);
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());

            const response = await api.get<PaginatedResponse>(`/vacaciones?${params}`);
            const allData = response.data.data || [];

            if (allData.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin datos',
                    text: 'No hay vacaciones para exportar'
                });
                return;
            }

            const excelData = allData.map(v => ({
                'ID': v.id,
                'Fecha Solicitud': formatDate(v.fecha),
                'Personal': v.personal ? `${v.personal.nombre} ${v.personal.paterno} ${v.personal.materno}` : 'N/A',
                'Tipo': v.tipo_solicitud,
                'Días': v.cantidad_dias,
                'Desde': formatDate(v.fecha_desde),
                'Hasta': formatDate(v.fecha_hasta),
                'Autorizado': v.autorizado,
                'Observaciones': v.observaciones
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Vacaciones');
            XLSX.writeFile(wb, `vacaciones_${getLocalDateString()}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
        }
    };

    const handlePrintClick = () => {
        setModalMode('print');
        setShowPrintModal(true);
        fetchPrintVacaciones();
    };

    const handleExportClick = () => {
        setModalMode('export');
        setShowPrintModal(true);
        fetchPrintVacaciones();
    };

    const handleModalConfirm = (filteredPersonalId: string | null) => {
        if (modalMode === 'print') {
            handlePrint(filteredPersonalId);
        } else {
            exportToPDF(filteredPersonalId);
        }
    };

    const calculateVacationStats = (personal: Personal, vacations: Vacacion[]) => {
        // Fix timezone issue - match VacacionesForm logic
        let ingresoDate = new Date(personal.fecha_ingreso);
        if (typeof personal.fecha_ingreso === 'string') {
            const fechaParts = personal.fecha_ingreso.split('T')[0].split('-');
            const year = parseInt(fechaParts[0]);
            const month = parseInt(fechaParts[1]) - 1; // 0-indexed
            const day = parseInt(fechaParts[2]);
            ingresoDate = new Date(year, month, day);
        }

        const today = new Date();
        let years = today.getFullYear() - ingresoDate.getFullYear();
        const m = today.getMonth() - ingresoDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < ingresoDate.getDate())) {
            years--;
        }
        const antiguedad = Math.max(0, years);

        // Match VacacionesForm ranges
        let corresponden = 0;
        for (let i = 1; i <= antiguedad; i++) {
            if (i >= 1 && i <= 5) corresponden += 15;
            else if (i >= 6 && i <= 10) corresponden += 20;
            else if (i >= 11) corresponden += 30;
        }

        // Match Backend getDiasTomados logic: Only 'Vacación' and 'A cuenta de vacación' count.
        // Backend does NOT check authorization status, so we follow that to match "New Vacation" form balance.
        const tomados = vacations
            .filter(v => ['Vacación', 'A cuenta de vacación'].includes(v.tipo_solicitud))
            .reduce((acc, curr) => acc + curr.cantidad_dias, 0);

        const saldo = corresponden - tomados;

        return { antiguedad, corresponden, tomados, saldo };
    };

    const exportToPDF = async (filteredPersonalId: string | null) => {
        try {
            // Fetch all data for report
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            if (searchTerm) params.append('search', searchTerm);

            const response = await api.get<PaginatedResponse>(`/vacaciones?${params}`);
            let allVacaciones = response.data.data || [];

            let personal: Personal | undefined;
            if (filteredPersonalId) {
                allVacaciones = allVacaciones.filter(v => v.personal?.id.toString() === filteredPersonalId);
                if (allVacaciones.length > 0) {
                    personal = allVacaciones[0].personal;
                }
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

            // Title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80);
            doc.text('LISTA DE VACACIONES', 60, 20);

            // Blue line
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            let currentY = 35;

            // Stats Section if filtered
            if (personal) {
                const stats = calculateVacationStats(personal, allVacaciones);

                // Add name as Title suffix instead? Or just keep it in header.
                // Actually, the original code had personalName in a subtitle.
                // The new design uses the Blue Box which contains stats but not explicitly the name.
                // Wait, the new EXTRAHEADER code removed the name?
                // The image shows the blue box details, but usually we need the name too.
                // The original code had `${personalName ? ...}`.
                // The new code builds `extraHeader` inside `if (personal)`.
                // I should probably include the name in the extraHeader or keep the subtitle above it.
                // Let's add the name to the top of the blue box.

                const fullName = `${personal.nombre} ${personal.paterno} ${personal.materno || ''}`.trim();
                const ingresoStr = formatDate(personal.fecha_ingreso);

                // Blue Box Background
                doc.setFillColor(235, 245, 251); // Light blue #ebf5fb
                doc.rect(15, currentY, pageWidth - 30, 48, 'F'); // Increased height for name

                // Left Border
                doc.setFillColor(52, 152, 219);
                doc.rect(15, currentY, 2, 48, 'F');

                // Personal Name
                doc.setFontSize(14);
                doc.setTextColor(44, 62, 80);
                doc.text(fullName, 25, currentY + 8);

                // Personal Info
                doc.setFontSize(11);
                doc.setTextColor(0, 50, 150); // Dark Blue
                doc.text(`Fecha de Ingreso: ${ingresoStr}`, 25, currentY + 16);
                doc.text(`Antigüedad: ${stats.antiguedad} año${stats.antiguedad !== 1 ? 's' : ''}`, 25, currentY + 22);

                // Divider Line
                doc.setDrawColor(200, 200, 200);
                doc.line(25, currentY + 28, pageWidth - 25, currentY + 28);

                // Stats Grid
                const colWidth = (pageWidth - 50) / 3;
                let startX = 25;
                const statsY = currentY + 38;

                // Corresponden
                doc.setFontSize(10);
                doc.setTextColor(50, 50, 150);
                doc.text("Corresponden", startX + (colWidth / 2), statsY - 3, { align: 'center' });
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 100);
                doc.text(`${stats.corresponden}`, startX + (colWidth / 2), statsY + 4, { align: 'center' });

                // Tomados
                startX += colWidth;
                doc.setFontSize(10);
                doc.setTextColor(180, 50, 50); // Reddish
                doc.text("Tomados", startX + (colWidth / 2), statsY - 3, { align: 'center' });
                doc.setFontSize(14);
                doc.text(`${stats.tomados}`, startX + (colWidth / 2), statsY + 4, { align: 'center' });

                // Saldo Box
                startX += colWidth;
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(startX + 10, statsY - 8, colWidth - 20, 16, 2, 2, 'F');
                doc.setFontSize(10);
                doc.setTextColor(0, 150, 0); // Green
                doc.text("SALDO", startX + (colWidth / 2), statsY - 3, { align: 'center' });
                doc.setFontSize(14);
                doc.text(`${stats.saldo}`, startX + (colWidth / 2), statsY + 4, { align: 'center' });

                currentY += 45;
            }

            const tableData = allVacaciones.map(v => [
                v.id,
                formatDate(v.fecha),
                v.personal ? `${v.personal.nombre} ${v.personal.paterno}` : 'N/A',
                v.tipo_solicitud,
                v.cantidad_dias,
                formatDate(v.fecha_desde),
                formatDate(v.fecha_hasta),
                v.autorizado
            ]);

            autoTable(doc, {
                head: [['ID', 'Fecha', 'Personal', 'Tipo', 'Días', 'Desde', 'Hasta', 'Autorizado']],
                body: tableData,
                startY: currentY,
                theme: 'plain',
                margin: { left: 15, right: 15 },
                styles: { fontSize: 8, cellPadding: 3, lineColor: [221, 221, 221], lineWidth: 0.1 },
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'left',
                    lineWidth: 0.1,
                    lineColor: [41, 128, 185]
                },
                alternateRowStyles: { fillColor: [248, 249, 250] }
            });



            // Direct download - more reliable
            doc.save(`vacaciones_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            Swal.fire('Error', 'No se pudo exportar el PDF', 'error');
        }
    };

    const handlePrint = async (filteredPersonalId: string | null) => {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            if (searchTerm) params.append('search', searchTerm);

            const response = await api.get<PaginatedResponse>(`/vacaciones?${params}`);
            let allVacaciones = response.data.data || [];

            let personal: Personal | undefined;
            if (filteredPersonalId) {
                allVacaciones = allVacaciones.filter(v => v.personal?.id.toString() === filteredPersonalId);
                if (allVacaciones.length > 0) {
                    personal = allVacaciones[0].personal;
                }
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



            let extraHeader = '';
            if (personal) {
                const stats = calculateVacationStats(personal, allVacaciones);
                const fullName = `${personal.nombre} ${personal.paterno} ${personal.materno || ''}`.trim();
                const ingresoStr = formatDate(personal.fecha_ingreso);
                extraHeader = `
                    <div class="stats-box">
                        <div class="stats-row" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0;">
                            <strong style="font-size: 18px; color: #2c3e50;">${fullName}</strong>
                        </div>
                        <div class="stats-row info-row">
                            <div><strong>Fecha de Ingreso:</strong> ${ingresoStr}</div>
                            <div><strong>Antigüedad:</strong> ${stats.antiguedad} año${stats.antiguedad !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="stats-divider"></div>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-label" style="color: #3498db;">Corresponden</span>
                                <span class="stat-value" style="color: #2c3e50;">${stats.corresponden}</span>
                            </div>
                             <div class="stat-item">
                                <span class="stat-label" style="color: #e74c3c;">Tomados</span>
                                <span class="stat-value" style="color: #c0392b;">${stats.tomados}</span>
                            </div>
                             <div class="stat-item saldo-item">
                                <span class="stat-label" style="color: #27ae60;">SALDO</span>
                                <span class="stat-value" style="color: #27ae60;">${stats.saldo}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            const content = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reporte de Vacaciones</title>
                    <style>
                        @page { size: A4; margin: 2cm 1.5cm 3cm 1.5cm; }
                        body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
                        .header { display: flex; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #3498db; }
                        .header img { height: 60px; margin-right: 20px; }
                        h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                        
                        /* Stats Box Styles */
                        .stats-box {
                            background-color: #ebf5fb;
                            border-left: 4px solid #3498db;
                            padding: 15px;
                            margin-bottom: 25px;
                            border-radius: 0 5px 5px 0;
                        }
                        .stats-row { margin-bottom: 10px; }
                        .info-row { 
                            display: flex; 
                            flex-direction: column; 
                            gap: 5px; 
                            color: #003296; 
                            font-size: 14px;
                        }
                        .stats-divider {
                            height: 1px;
                            background-color: #cbd5e0;
                            margin: 10px 0;
                            width: 100%;
                        }
                        .stats-grid {
                            display: flex;
                            justify-content: space-around;
                            align-items: center;
                        }
                        .stat-item {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            gap: 5px;
                        }
                        .stat-label { font-size: 12px; font-weight: bold; }
                        .stat-value { font-size: 18px; font-weight: bold; }
                        .saldo-item {
                            background-color: white;
                            padding: 5px 20px;
                            border-radius: 5px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        }

                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
                        th { background-color: #3498db; color: white; padding: 8px; text-align: left; font-weight: bold; border: 1px solid #2980b9; }
                        td { padding: 8px; border: 1px solid #ddd; }
                        tr:nth-child(even) { background-color: #f8f9fa; }
                        .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 0; border-top: 1px solid #333; font-size: 9px; color: #666; text-align: right; }
                        @media print {
                            th { background-color: #3498db !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            tr:nth-child(even) { background-color: #f8f9fa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .footer { position: fixed; bottom: 0; }
                            .stats-box { background-color: #ebf5fb !important; -webkit-print-color-adjust: exact; }
                            .saldo-item { background-color: white !important; -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="${clinicaActual?.logo || '/logo-curare.png'}" alt="Logo">
                        <h1>LISTA DE VACACIONES</h1>
                    </div>
                    
                    ${extraHeader}

                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Personal</th>
                                <th>Tipo</th>
                                <th>Días</th>
                                <th>Desde</th>
                                <th>Hasta</th>
                                <th>Autorizado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allVacaciones.map(v => `
                                <tr>
                                    <td>${formatDate(v.fecha)}</td>
                                    <td>${v.personal ? `${v.personal.nombre} ${v.personal.paterno}` : 'N/A'}</td>
                                    <td>${v.tipo_solicitud}</td>
                                    <td>${v.cantidad_dias}</td>
                                    <td>${formatDate(v.fecha_desde)}</td>
                                    <td>${formatDate(v.fecha_hasta)}</td>
                                    <td>${v.autorizado}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                </body>
                </html>
            `;

            doc.open();
            doc.write(content);
            doc.close();

            const logo = doc.querySelector('img');
            const doPrint = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) { console.error(e); }
                finally {
                    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 2000);
                }
            };

            if (logo && !logo.complete) {
                logo.onload = doPrint;
                logo.onerror = doPrint;
            } else {
                doPrint();
            }

        } catch (error) {
            console.error('Error printing:', error);
            Swal.fire('Error', 'No se pudo imprimir', 'error');
        }
    };

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Sun className="text-blue-600" size={32} />
                            Vacaciones y Permisos
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de ausencias y cronograma de personal</p>
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
                        onClick={() => {
                            setSelectedVacacionId(null);
                            setIsDrawerOpen(true);}}
                        className="bg-[#3498db] hover:bg-blue-600 text-white hover:text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nueva Vacación
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por personal..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
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
            </div>

            {/* Records Count */}
            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Personal</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Días</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Desde</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hasta</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Autorizado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={9} className="text-center p-4 text-gray-800 dark:text-white">Cargando...</td></tr>
                        ) : vacaciones.map((vacacion, index) => (
                            <tr key={vacacion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(vacacion.fecha)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    {vacacion.personal ? `${vacacion.personal.nombre} ${vacacion.personal.paterno} ${vacacion.personal.materno || ''}` : 'Personal Eliminado'}
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{vacacion.tipo_solicitud}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{vacacion.cantidad_dias}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(vacacion.fecha_desde)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(vacacion.fecha_hasta)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-sm font-bold ${vacacion.autorizado === 'SI' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                        vacacion.autorizado === 'NO' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                        {vacacion.autorizado}
                                    </span>
                                </td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedVacacionId(vacacion.id);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(vacacion.id)}
                                        className="bg-[#dc3545] hover:bg-red-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {vacaciones.length === 0 && !loading && (
                            <tr><td colSpan={9} className="text-center p-4 text-gray-500 dark:text-gray-400">No se encontraron registros</td></tr>
                        )}
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
                title="Manual de Usuario - Vacaciones"
                sections={manualSections}
            />

            <VacacionesPrintModal
                isOpen={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                onConfirm={handleModalConfirm}
                vacaciones={printVacaciones}
                mode={modalMode}
            />

            <VacacionesForm
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                id={selectedVacacionId}
                onSaveSuccess={() => {
                    fetchVacaciones();
                    setIsDrawerOpen(false);
                }}
            />
        </div>
    );
};

export default VacacionesList;
