import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';
import Pagination from './Pagination';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EgresoInventarioForm from './EgresoInventarioForm';
import HistorialEgresos from './HistorialEgresos';
import type { Inventario } from '../types';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';
import InventarioForm from './InventarioForm';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Download, Printer, Package } from 'lucide-react';


interface PaginatedResponse {
    data: Inventario[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const InventarioList: React.FC = () => {
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [items, setItems] = useState<Inventario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const [showEgresoForm, setShowEgresoForm] = useState(false);
    const [selectedItemForEgreso, setSelectedItemForEgreso] = useState<Inventario | null>(null);
    const [showHistorial, setShowHistorial] = useState(false);
    const [selectedItemForHistorial, setSelectedItemForHistorial] = useState<Inventario | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedInventarioId, setSelectedInventarioId] = useState<number | string | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Inventario',
            content: 'Control total de insumos y materiales. Puede filtrar por vencimiento usando los botones de colores superiores.'
        },
        {
            title: 'Agregar Item',
            content: 'Botón azul "+ Nuevo". Requiere definir Stock Mínimo para alertas.'
        },
        {
            title: 'Registrar Salida (Egreso)',
            content: 'Use el botón naranja con flecha para descontar stock cuando se utiliza un material.'
        },
        {
            title: 'Historial',
            content: 'Botón azul con reloj. Muestra todos los movimientos (entradas/salidas) de un ítem específico.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para ítems activos, el botón rojo (papelera) cambia el estado a "Inactivo". Para ítems inactivos, aparece un botón verde (check) que permite reactivarlos a estado "Activo".'
        },
        {
            title: 'Alertas de Vencimiento',
            content: 'Utilice el menú desplegable superior "Seleccione Alerta" para filtrar automáticamente los lotes próximos a caducar (3 meses, 6 meses, 9 meses o ya vencidos).'
        }];

    // Expiration Modal States
    const [showExpirationModal, setShowExpirationModal] = useState(false);
    const [expirationItems, setExpirationItems] = useState<any[]>([]); // Using any for joined structure
    const [expirationLoading, setExpirationLoading] = useState(false);
    const [expirationTitle, setExpirationTitle] = useState('');
    const [activeExpirationStatus, setActiveExpirationStatus] = useState<string | null>(null);

    // Print Modal States
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [modalMode, setModalMode] = useState<'print' | 'export'>('print');
    const [selectedGrupoId, setSelectedGrupoId] = useState<string>('');
    const [selectedEspecialidadId, setSelectedEspecialidadId] = useState<string>('');
    const [printGrupos, setPrintGrupos] = useState<any[]>([]);
    const [printEspecialidades, setPrintEspecialidades] = useState<any[]>([]);

    useEffect(() => {
        fetchInventario();
    }, [currentPage, searchTerm, clinicaSeleccionada]);

    const fetchInventario = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/inventario?${params}`);

            const data = response.data?.data || [];
            const totalPages = response.data?.totalPages || 1;
            const total = response.data?.total || 0;

            setItems(data);
            setTotalPages(totalPages);
            setTotal(total);
        } catch (error) {
            console.error('Error fetching inventario:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja ítem?',
            text: 'El ítem pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/inventario/${id}`, { estado: 'Inactivo' });
                await Swal.fire({
                    title: '¡Ítem dado de baja!',
                    text: 'El estado del ítem ha sido cambiado a Inactivo.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchInventario();
            } catch (error) {
                console.error('Error al dar de baja ítem:', error);
                Swal.fire(
                    'Error!',
                    'No se pudo dar de baja el ítem.',
                    'error'
                );
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar ítem?',
            text: 'El ítem volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/inventario/${id}`, { estado: 'Activo' });
                await Swal.fire({
                    title: '¡Ítem reactivado!',
                    text: 'El estado del ítem ha sido cambiado a Activo.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchInventario();
            } catch (error) {
                console.error('Error al reactivar ítem:', error);
                Swal.fire(
                    'Error!',
                    'No se pudo reactivar el ítem.',
                    'error'
                );
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleEgreso = (item: Inventario) => {
        setSelectedItemForEgreso(item);
        setShowEgresoForm(true);
    };

    const handleEgresoSuccess = () => {
        setShowEgresoForm(false);
        setSelectedItemForEgreso(null);
        fetchInventario();
    };

    const handleHistorial = (item: Inventario) => {
        setSelectedItemForHistorial(item);
        setShowHistorial(true);
    };

    const handleExpirationFilter = async (status: string, title: string) => {
        setExpirationTitle(title);
        setActiveExpirationStatus(status);
        setExpirationLoading(true);
        setShowExpirationModal(true);
        try {
            const url = clinicaSeleccionada
                ? `/inventario/expiration-details?status=${status}&clinicaId=${clinicaSeleccionada}`
                : `/inventario/expiration-details?status=${status}`;
            const response = await api.get<any[]>(url);
            setExpirationItems(response.data || []);
        } catch (error) {
            console.error('Error fetching expiration items:', error);
            Swal.fire('Error', 'No se pudieron cargar los datos filtrados', 'error');
        } finally {
            setExpirationLoading(false);
        }
    };

    // Auto-refresh expiration modal when clinic changes
    useEffect(() => {
        if (showExpirationModal && activeExpirationStatus) {
            handleExpirationFilter(activeExpirationStatus, expirationTitle);
        }
    }, [clinicaSeleccionada]);

    const handlePrintExpiration = () => {
        if (expirationItems.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin datos',
                text: 'No hay items para imprimir',
                confirmButtonColor: '#3498db'
            });
            return;
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

        let filterSubtitle = expirationTitle;

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${expirationTitle}</title>
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
                        font-size: 20px;
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
                    <h1>Inventario</h1>
                </div>
                ${filterSubtitle ? `<div class="filter-subtitle">${filterSubtitle}</div>` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th>Descripción</th>
                            <th>Especialidad</th>
                            <th>Grupo</th>
                            <th>Vencimiento</th>
                            <th>Cantidad Lote</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expirationItems.map((item: any) => `
                            <tr>
                                <td>${item.inventario?.descripcion || 'N/A'}</td>
                                <td>${item.inventario?.especialidad?.especialidad || 'N/A'}</td>
                                <td>${item.inventario?.grupoInventario?.grupo || 'N/A'}</td>
                                <td>${formatDate(item.fecha_vencimiento)}</td>
                                <td>${item.cantidad}</td>
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

    const handlePrint = async (grupoId: string, especialidadId: string) => {
        try {
            // Fetch ALL records for printing
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }
            const response = await api.get<PaginatedResponse>(`/inventario?${params}`);
            let allItems = Array.isArray(response.data.data) ? response.data.data : [];

            // Apply filters
            if (grupoId && grupoId !== 'all') {
                const grupoIdNum = Number(grupoId);
                allItems = allItems.filter((item: Inventario) => item.grupoInventario?.id === grupoIdNum);
            }

            if (especialidadId && especialidadId !== 'all') {
                const especialidadIdNum = Number(especialidadId);
                allItems = allItems.filter((item: Inventario) => item.especialidad?.id === especialidadIdNum);
            }

            if (allItems.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin datos',
                    text: 'No hay items para imprimir con los filtros seleccionados',
                    confirmButtonColor: '#3498db'
                });
                return;
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


            let filterSubtitle = '';
            if (grupoId && grupoId !== 'all') {
                const selectedGrupo = printGrupos.find(g => g.id.toString() === grupoId);
                if (selectedGrupo) {
                    filterSubtitle += `Grupo: ${selectedGrupo.grupo}`;
                }
            }
            if (especialidadId && especialidadId !== 'all') {
                const selectedEsp = printEspecialidades.find(e => e.id.toString() === especialidadId);
                if (selectedEsp) {
                    if (filterSubtitle) filterSubtitle += ' | ';
                    filterSubtitle += `Especialidad: ${selectedEsp.especialidad}`;
                }
            }

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reporte de Inventario</title>
                    <style>
                        @page { size: A4; margin: 2cm 1.5cm 3cm 1.5cm; }
                        body { font-family: Arial, sans-serif; color: #333; }
                        .header { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                        .header img { height: 60px; margin-right: 20px; }
                        h1 { color: #2c3e50; font-size: 24px; margin: 0; }
                        .subtitle { font-size: 14px; color: #666; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                        th { background-color: #3498db; color: white; padding: 10px; text-align: left; border: 1px solid #2980b9; }
                        td { padding: 8px; border: 1px solid #ddd; }
                        tr:nth-child(even) { background-color: #f8f9fa; }
                        .status-active { color: #27ae60; font-weight: bold; }
                        .status-inactive { color: #e74c3c; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="${clinicaActual?.logo || '/logo-curare.png'}" alt="Logo">
                        <h1>Lista de Inventario</h1>
                    </div>
                    ${filterSubtitle ? `<div class="subtitle">${filterSubtitle}</div>` : ''}
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Descripción</th>
                                <th>Existente</th>
                                <th>Mínimo</th>
                                <th>Especialidad</th>
                                <th>Grupo</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allItems.map((item: any, idx: number) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${item.descripcion}</td>
                                    <td>${item.cantidad_existente}</td>
                                    <td>${item.stock_minimo}</td>
                                    <td>${item.especialidad?.especialidad || 'N/A'}</td>
                                    <td>${item.grupoInventario?.grupo || 'N/A'}</td>
                                    <td class="${item.estado?.toLowerCase() === 'activo' ? 'status-active' : 'status-inactive'}">
                                        ${item.estado?.toLowerCase()}
                                    </td>
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

            const logo = doc.querySelector('img');
            if (logo) {
                if (logo.complete) doPrint();
                else {
                    logo.onload = doPrint;
                    logo.onerror = doPrint;
                }
            } else {
                doPrint();
            }
        } catch (error) {
            console.error('Error al imprimir inventario:', error);
            Swal.fire('Error', 'No se pudo generar el reporte de impresión', 'error');
        }
    };

    const handleConfirmPrint = () => {
        if (!selectedGrupoId || !selectedEspecialidadId) {
            Swal.fire({
                icon: 'warning',
                title: 'Selección requerida',
                text: 'Por favor seleccione grupo y especialidad',
                confirmButtonColor: '#3498db'
            });
            return;
        }
        setShowPrintModal(false);
        handlePrint(selectedGrupoId, selectedEspecialidadId);
    };

    const handleConfirmExport = async () => {
        if (!selectedGrupoId || !selectedEspecialidadId) {
            Swal.fire({
                icon: 'warning',
                title: 'Selección requerida',
                text: 'Por favor seleccione grupo y especialidad',
                confirmButtonColor: '#3498db'
            });
            return;
        }

        try {
            // Fetch ALL records for export
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            const response = await api.get<PaginatedResponse>(`/inventario?${params}`);
            let allItems = Array.isArray(response.data.data) ? response.data.data : [];

            // Apply filters
            if (selectedGrupoId && selectedGrupoId !== 'all') {
                const grupoIdNum = Number(selectedGrupoId);
                allItems = allItems.filter((item: Inventario) => item.grupoInventario?.id === grupoIdNum);
            }

            if (selectedEspecialidadId && selectedEspecialidadId !== 'all') {
                const especialidadIdNum = Number(selectedEspecialidadId);
                allItems = allItems.filter((item: Inventario) => item.especialidad?.id === especialidadIdNum);
            }

            if (allItems.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin datos',
                    text: 'No hay items para exportar con los filtros seleccionados',
                    confirmButtonColor: '#3498db'
                });
                return;
            }

            // Generate PDF
            const doc = new jsPDF();

            // Add logo
            try {
                const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.src = clinicaActual?.logo || '/logo-curare.png';
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
            doc.text('INVENTARIO', 60, 20);

            // Blue line under header
            doc.setDrawColor(52, 152, 219); // #3498db
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            let currentY = 35;

            // Filter subtitle box
            let filterSubtitle = '';
            if (selectedGrupoId && selectedGrupoId !== 'all') {
                const selectedGrupo = printGrupos.find(g => g.id.toString() === selectedGrupoId);
                if (selectedGrupo) {
                    filterSubtitle += `Grupo: ${selectedGrupo.grupo}`;
                }
            }
            if (selectedEspecialidadId && selectedEspecialidadId !== 'all') {
                const selectedEsp = printEspecialidades.find(e => e.id.toString() === selectedEspecialidadId);
                if (selectedEsp) {
                    if (filterSubtitle) filterSubtitle += ' | ';
                    filterSubtitle += `Especialidad: ${selectedEsp.especialidad}`;
                }
            }

            if (filterSubtitle) {
                doc.setFillColor(236, 240, 241); // #ecf0f1
                doc.rect(15, currentY, pageWidth - 30, 10, 'F');

                // Blue left border
                doc.setFillColor(52, 152, 219); // #3498db
                doc.rect(15, currentY, 1, 10, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(44, 62, 80);
                doc.text(filterSubtitle, 20, currentY + 6.5);

                currentY += 15;
            }

            doc.setTextColor(0, 0, 0);

            // Table data
            const tableColumn = ["Descripción", "Cant.", "Min.", "Especialidad", "Grupo", "Estado"];
            const tableRows = allItems.map((i: Inventario) => [
                i.descripcion,
                i.cantidad_existente.toString(),
                i.stock_minimo.toString(),
                i.especialidad?.especialidad || 'N/A',
                i.grupoInventario?.grupo || 'N/A',
                i.estado?.toLowerCase()
            ]);

            autoTable(doc, {
                head: [tableColumn],
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
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 20, halign: 'center' },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 35 },
                    5: { cellWidth: 25, halign: 'center' }
                },
                didParseCell: function (data) {
                    // Style estado column
                    if (data.column.index === 5 && data.section === 'body') {
                        const estado = data.cell.raw as string;
                        if (estado && estado.toLowerCase().includes('activo')) {
                            data.cell.styles.textColor = [39, 174, 96]; // green
                            data.cell.styles.fontStyle = 'bold';
                        } else if (estado && estado.toLowerCase().includes('inactivo')) {
                            data.cell.styles.textColor = [231, 76, 60]; // red
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });


            doc.save(`inventario_${getLocalDateString()}.pdf`);

            setShowPrintModal(false);

            Swal.fire({
                icon: 'success',
                title: 'PDF Exportado',
                text: 'El archivo PDF se ha descargado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al exportar:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el PDF'
            });
        }
    };

    const exportToExcel = async () => {
        try {
            // Fetch ALL records for excel export
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            const response = await api.get<PaginatedResponse>(`/inventario?${params}`);
            const allItems = Array.isArray(response.data?.data) ? response.data.data : [];

            if (allItems.length === 0) {
                Swal.fire('Info', 'No hay datos para exportar', 'info');
                return;
            }

            const excelData = allItems.map((i: Inventario) => ({
                'Descripción': i.descripcion,
                'Cantidad Existente': i.cantidad_existente,
                'Stock Mínimo': i.stock_minimo,
                'Especialidad': i.especialidad?.especialidad || 'N/A',
                'Grupo': i.grupoInventario?.grupo || 'N/A',
                'Estado': i.estado
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
            XLSX.writeFile(wb, `inventario_${getLocalDateString()}.xlsx`);

            Swal.fire({
                icon: 'success',
                title: 'Excel Exportado',
                text: 'El archivo se ha descargado correctamente',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            Swal.fire('Error', 'No se pudo generar el archivo Excel', 'error');
        }
    };

    const handleGrupoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const grupoId = e.target.value;
        setSelectedGrupoId(grupoId);
        setSelectedEspecialidadId('');
        if (grupoId && grupoId !== 'all') {
            fetchEspecialidadesPorClincaYGrupo(Number(grupoId));
        } else {
            setPrintEspecialidades([]);
        }
    };

    const fetchEspecialidadesPorClincaYGrupo = async (grupoId: number) => {
        try {
            const params = new URLSearchParams();
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());
            params.append('grupoId', grupoId.toString());
            
            const response = await api.get(`/inventario/used-specialties?${params.toString()}`);
            setPrintEspecialidades(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching especialidades:', error);
            setPrintEspecialidades([]);
        }
    };

    const handleOpenExportModal = async () => {
        setModalMode('export');
        setShowPrintModal(true);
        try {
            const params = new URLSearchParams();
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());
            const response = await api.get(`/inventario/used-groups?${params.toString()}`);
            setPrintGrupos(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const handleOpenPrintModal = async () => {
        setModalMode('print');
        setShowPrintModal(true);
        try {
            const params = new URLSearchParams();
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());
            const response = await api.get(`/inventario/used-groups?${params.toString()}`);
            setPrintGrupos(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    if (loading) return <div className="text-center p-4">Cargando...</div>;

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Package className="text-blue-600" size={32} />
                        Inventario
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Control de insumos y materiales clínicos</p>
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
                            onClick={handleOpenExportModal}
                            className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar PDF"
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

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                    <button
                        onClick={() => {
                            setSelectedInventarioId(null);
                            setIsDrawerOpen(true);
                        }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Item
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex gap-2 w-full md:w-1/3">
                    <input
                        type="text"
                        placeholder="Buscar por descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-grow pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                    <div className="flex flex-col mr-1">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Control de Vencimiento</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Seleccione un rango para filtrar</span>
                    </div>
                    <select
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '3months') handleExpirationFilter('3months', 'Productos que vencen en los próximos 3 meses');
                            else if (val === '6months') handleExpirationFilter('6months', 'Productos que vencen entre 3 y 6 meses');
                            else if (val === '9months') handleExpirationFilter('9months', 'Productos que vencen entre 6 y 9 meses');
                            else if (val === 'expired') handleExpirationFilter('expired', 'Productos Vencidos');
                            e.target.value = ""; // Reset after selection to allow re-selection
                        }}
                        className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-200 cursor-pointer transition-all hover:border-blue-400"
                    >
                        <option value="">-- Seleccionar Alerta --</option>
                        <option value="3months">📅 Vencimiento en 3 Meses</option>
                        <option value="6months">📅 Vencimiento en 6 Meses</option>
                        <option value="9months">📅 Vencimiento en 9 Meses</option>
                        <option value="expired">⚠️ Productos Vencidos</option>
                    </select>
                </div>
            </div>

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cant. Exis.</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock Min.</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grupo</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                        <th className="p-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                            <td className="p-3 text-gray-800 dark:text-gray-300">{item.descripcion}</td>
                            <td className="p-3 text-gray-800 dark:text-gray-300">{item.cantidad_existente}</td>
                            <td className="p-3 text-gray-800 dark:text-gray-300">{item.stock_minimo}</td>
                            <td className="p-3 text-gray-800 dark:text-gray-300">{item.especialidad?.especialidad}</td>
                            <td className="p-3 text-gray-800 dark:text-gray-300">{item.grupoInventario?.grupo}</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 rounded text-sm ${item.estado?.toLowerCase() === 'activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                    {item.estado?.toLowerCase()}
                                </span>
                            </td>
                            <td className="p-3 flex gap-2">
                                <button
                                    onClick={() => handleEgreso(item)}
                                    className="p-2.5 bg-[#e67e22] text-white rounded-lg hover:bg-orange-700 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                    title="Salida / Egreso"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleHistorial(item)}
                                    className="p-2.5 bg-[#3498db] text-white rounded-lg hover:bg-blue-600 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                    title="Historial de Egresos"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedInventarioId(item.id);
                                        setIsDrawerOpen(true);
                                    }}
                                    className="p-2.5 bg-[#ffc107] text-white rounded-lg hover:bg-yellow-600 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                    title="Editar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                                {item.estado === 'Activo' ? (
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2.5 bg-[#dc3545] text-white rounded-lg hover:bg-red-700 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Dar de baja"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleReactivate(item.id)}
                                        className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Reactivar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />

            {showEgresoForm && selectedItemForEgreso && (
                <EgresoInventarioForm
                    inventario={selectedItemForEgreso}
                    onClose={() => setShowEgresoForm(false)}
                    onSuccess={handleEgresoSuccess}
                />
            )}

            {showHistorial && selectedItemForHistorial && (
                <HistorialEgresos
                    inventario={selectedItemForHistorial}
                    onClose={() => {
                        setShowHistorial(false);
                        fetchInventario();
                    }}
                />
            )}

            <InventarioForm
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                id={selectedInventarioId}
                onSaveSuccess={() => {
                    fetchInventario();
                    setIsDrawerOpen(false);
                }}
            />

            {showExpirationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">{expirationTitle}</h3>
                        </div>

                        {expirationLoading ? (
                            <div className="text-center p-4 text-gray-700 dark:text-gray-300">Cargando...</div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grupo</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Vencimiento</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cantidad Lote</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {expirationItems.length > 0 ? (
                                        expirationItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-3 text-gray-800 dark:text-gray-300">{item.inventario?.descripcion}</td>
                                                <td className="p-3 text-gray-800 dark:text-gray-300">{item.inventario?.especialidad?.especialidad}</td>
                                                <td className="p-3 text-gray-800 dark:text-gray-300">{item.inventario?.grupoInventario?.grupo}</td>
                                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(item.fecha_vencimiento)}</td>
                                                <td className="p-3 font-bold text-gray-800 dark:text-gray-300">{item.cantidad}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-gray-500 dark:text-gray-400">
                                                No se encontraron resultados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                        )}
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={handlePrintExpiration}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                                title="Imprimir"
                            >
                                <Printer size={18} />
                                <span className="text-sm">Imprimir</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowExpirationModal(false);
                                    setActiveExpirationStatus(null);
                                }}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                            {modalMode === 'print' ? 'Imprimir Inventario' : 'Exportar Inventario a PDF'}
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Seleccione el grupo y especialidad para filtrar el inventario a {modalMode === 'print' ? 'imprimir' : 'exportar'}.
                                            </p>

                                            {/* Grupo Selector */}
                                            <div className="mb-4">
                                                <label htmlFor="grupo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Grupo de Inventario
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                                        </svg>
                                                    </div>
                                                    <select
                                                        id="grupo"
                                                        value={selectedGrupoId}
                                                        onChange={handleGrupoChange}
                                                        className="block w-full pl-10 pr-10 py-2 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="" className="text-gray-500">-- Seleccione un grupo --</option>
                                                        <option value="all">Todos los grupos</option>
                                                        {printGrupos.map((grupo) => (
                                                            <option key={grupo.id} value={grupo.id}>
                                                                {grupo.grupo}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Especialidad Selector */}
                                            <div className="mb-4">
                                                <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Especialidad
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <select
                                                        id="especialidad"
                                                        value={selectedEspecialidadId}
                                                        onChange={(e) => setSelectedEspecialidadId(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-2 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                        disabled={!selectedGrupoId}
                                                    >
                                                        <option value="" className="text-gray-500">-- Seleccione una especialidad --</option>
                                                        <option value="all">Todas las especialidades</option>
                                                        {printEspecialidades.map((esp) => (
                                                            <option key={esp.id} value={esp.id}>
                                                                {esp.especialidad}
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
                                    onClick={modalMode === 'export' ? handleConfirmExport : handleConfirmPrint}
                                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${modalMode === 'export' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm`}
                                >
                                    {modalMode === 'export' ? 'Exportar PDF' : 'Imprimir'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowPrintModal(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Inventario"
                sections={manualSections}
            />
        </div>
    );
};

export default InventarioList;
