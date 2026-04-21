import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Personal } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import PersonalForm from './PersonalForm';
import Swal from 'sweetalert2';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Download, Printer, Users } from 'lucide-react';


interface PaginatedResponse {
    data: Personal[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const formatCelular = (celular: string) => {
    if (!celular) return '-';
    const codes = ['+591', '+54', '+55', '+56', '+51', '+595', '+598', '+57', '+52', '+34', '+1'];
    const code = codes.find(c => celular.startsWith(c));
    if (code) return `(${code}) ${celular.substring(code.length)}`;
    return celular;
};

const PersonalList: React.FC = () => {
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [personal, setPersonal] = useState<Personal[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedPersonalId, setSelectedPersonalId] = useState<number | null>(null);
    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Personal',
            content: 'Administración del recurso humano de la clínica (asistentes, limpieza, administrativos, etc).'
        },
        {
            title: 'Agregar Personal',
            content: 'Use el botón azul "+ Nuevo Personal" para registrar un nuevo empleado. Es importante completar la fecha de ingreso.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para personal activo, el botón rojo (papelera) cambia el estado a "Inactivo". Para personal inactivo, aparece un botón verde (check) que permite reactivarlo a estado "Activo".'
        },
        {
            title: 'Búsqueda y Reportes',
            content: 'Puede buscar por nombre y generar reportes de personal activo/inactivo en Excel o PDF.'
        }];

    useEffect(() => {
        fetchPersonal();
    }, [currentPage, searchTerm, clinicaSeleccionada]);

    const fetchPersonal = async () => {
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

            const response = await api.get<PaginatedResponse>(`/personal?${params}`);
            setPersonal(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching personal:', error);
            alert('Error al cargar el personal');
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja personal?',
            text: 'El personal pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/personal/${id}`, { estado: 'inactivo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Personal dado de baja!',
                    text: 'El estado del personal ha sido cambiado a Inactivo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPersonal();
            } catch (error) {
                console.error('Error al dar de baja personal:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo dar de baja el personal'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar personal?',
            text: 'El personal volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/personal/${id}`, { estado: 'activo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Personal reactivado!',
                    text: 'El estado del personal ha sido cambiado a Activo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPersonal();
            } catch (error) {
                console.error('Error al reactivar personal:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el personal'
                });
            }
        }
    };

    const fetchAllPersonal = async (): Promise<Personal[]> => {
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '10000',
            });
            if (searchTerm) params.append('search', searchTerm);
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());

            const response = await api.get<PaginatedResponse>(`/personal?${params}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching all personal:', error);
            return [];
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };


    const exportToExcel = async () => {
        try {
            const allData = await fetchAllPersonal();
            if (allData.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin datos',
                    text: 'No hay personal para exportar'
                });
                return;
            }
            const excelData = allData.map(p => ({
                'ID': p.id,
                'Nombre Completo': `${p.nombre} ${p.paterno} ${p.materno}`,
                'CI': p.ci,
                'Teléfono': p.telefono,
                'Celular': formatCelular(p.celular),
                'Dirección': p.direccion,
                'Área': p.personalTipo?.area || '',
                'Fecha Nacimiento': formatDate(p.fecha_nacimiento),
                'Fecha Ingreso': formatDate(p.fecha_ingreso),
                'Estado': p.estado,
                'Fecha Baja': p.fecha_baja ? formatDate(p.fecha_baja) : ''
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Personal');

            const date = getLocalDateString();
            const filename = `personal_${date}.xlsx`;
            XLSX.writeFile(wb, filename);
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            alert('Error al exportar a Excel');
        }
    };

    const exportToPDF = async () => {
        try {
            const doc = new jsPDF('landscape');
            const allData = await fetchAllPersonal();

            if (allData.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin datos',
                    text: 'No hay personal para exportar'
                });
                return;
            }

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
            doc.text('LISTA DE PERSONAL', 60, 20);

            // Blue line under header
            doc.setDrawColor(52, 152, 219); // #3498db
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            const tableData = allData.map((p, index) => [
                index + 1,
                `${p.nombre} ${p.paterno} ${p.materno}`,
                p.ci,
                p.telefono,
                formatCelular(p.celular),
                p.direccion,
                p.personalTipo?.area || '-',
                formatDate(p.fecha_nacimiento),
                formatDate(p.fecha_ingreso),
                p.estado.charAt(0).toUpperCase() + p.estado.slice(1),
                p.estado === 'inactivo' && p.fecha_baja ? formatDate(p.fecha_baja) : '-'
            ]);

            autoTable(doc, {
                head: [['#', 'Nombre Completo', 'CI', 'Teléfono', 'Celular', 'Dirección', 'Área', 'F. Nac.', 'F. Ingreso', 'Estado', 'F. Baja']],
                body: tableData,
                startY: 35,
                theme: 'plain',
                margin: { left: 15, right: 15 },
                styles: {
                    fontSize: 8,
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


            const filename = `personal_${getLocalDateString()}.pdf`;
            doc.save(filename);
        } catch (error) {
            console.error('Error al exportar a PDF:', error);
            alert('Error al exportar a PDF');
        }
    };

    const handlePrint = async () => {
        try {
            // Fetch ALL records for printing with clinic filter
            const allPersonal = await fetchAllPersonal();

            if (allPersonal.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sin datos',
                    text: 'No hay personal para imprimir'
                });
                return;
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) return;


            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lista de Personal</title>
                    <style>
                        @page {
                            size: A4 landscape;
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
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 9px;
                        }
                        
                        th {
                            background-color: #3498db;
                            color: white;
                            padding: 8px 4px;
                            text-align: left;
                            font-weight: bold;
                            border: 1px solid #2980b9;
                        }
                        
                        td {
                            padding: 6px 4px;
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
                        <h1>Lista de Personal</h1>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombre Completo</th>
                                <th>CI</th>
                                <th>Teléfono</th>
                                <th>Celular</th>
                                <th>Dirección</th>
                                <th>Área</th>
                                <th>F. Nac.</th>
                                <th>F. Ingreso</th>
                                <th>Estado</th>
                                <th>F. Baja</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allPersonal.map((p: Personal, i: number) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${p.nombre} ${p.paterno} ${p.materno}</td>
                                    <td>${p.ci}</td>
                                    <td>${p.telefono}</td>
                                    <td>${formatCelular(p.celular)}</td>
                                    <td>${p.direccion}</td>
                                    <td>${p.personalTipo?.area || '-'}</td>
                                    <td>${formatDate(p.fecha_nacimiento)}</td>
                                    <td>${formatDate(p.fecha_ingreso)}</td>
                                    <td class="${p.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                                        ${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                                    </td>
                                    <td>${p.estado === 'inactivo' && p.fecha_baja ? formatDate(p.fecha_baja) : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                </body>
                </html>
            `;

            printWindow.document.write(printContent);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.print();
                printWindow.onafterprint = () => {
                    printWindow.close();
                };
                setTimeout(() => {
                    if (!printWindow.closed) {
                        printWindow.close();
                    }
                }, 1000);
            }, 500);
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión');
        }
    };



    // Eliminated renderPagination function as it is no longer needed


    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Users className="text-blue-600" size={32} />
                            Gestión de Personal
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Administración de recursos humanos y personal clínico</p>
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
                        onClick={() => {
                            setSelectedPersonalId(null);
                            setIsDrawerOpen(true);}}
                        className="bg-[#3498db] hover:bg-blue-600 !text-white hover:!text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Personal
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
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

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre Completo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">CI</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teléfono</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Celular</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dirección</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Área</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">F. Nacimiento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">F. Ingreso</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">F. Baja</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {personal.map((p, index) => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{`${p.nombre} ${p.paterno} ${p.materno}`}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{p.ci}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{p.telefono}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatCelular(p.celular)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{p.direccion}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{p.personalTipo?.area || '-'}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(p.fecha_nacimiento)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(p.fecha_ingreso)}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-sm ${p.estado === 'activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                        {p.estado}
                                    </span>
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    {p.estado === 'inactivo' && p.fecha_baja ? formatDate(p.fecha_baja) : '-'}
                                </td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedPersonalId(p.id);
                                            setIsDrawerOpen(true);
                                        }}
                                        className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {p.estado === 'activo' ? (
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            title="Dar de baja"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivate(p.id)}
                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
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

            {personal.length === 0 && (
                <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay personal registrado'}
                </p>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Drawer Modal */}
            <PersonalForm
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                id={selectedPersonalId}
                onSaveSuccess={() => {
                    fetchPersonal();
                    setIsDrawerOpen(false);
                }}
            />

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Personal"
                sections={manualSections}
            />
        </div>
    );
};

export default PersonalList;
