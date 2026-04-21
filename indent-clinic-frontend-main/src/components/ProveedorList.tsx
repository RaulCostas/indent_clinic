import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Proveedor } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import ProveedorForm from './ProveedorForm';
import Swal from 'sweetalert2';
import { getLocalDateString } from '../utils/dateUtils';
import { FileText, Download, Printer, Truck } from 'lucide-react';


interface PaginatedResponse {
    data: Proveedor[];
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

const ProveedorList: React.FC = () => {
    const [providers, setProviders] = useState<Proveedor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Proveedores',
            content: 'Registro de empresas o personas que suministran insumos y materiales a la clínica.'
        },
        {
            title: 'Agregar Proveedor',
            content: 'Use el botón azul "+ Nuevo Proveedor" para registrar contactos comerciales.'
        },
        {
            title: 'Datos de Contacto',
            content: 'Es útil registrar tanto el celular de la empresa como un contacto directo (vendedor).'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para proveedores activos, el botón rojo (papelera) cambia el estado a "Inactivo". Para proveedores inactivos, aparece un botón verde (check) que permite reactivarlos a estado "Activo".'
        }];

    useEffect(() => {
        fetchProviders();
    }, [currentPage, searchTerm]);

    const fetchProviders = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/proveedores?${params}`);
            setProviders(Array.isArray(response.data.data) ? response.data.data : []);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching proveedores:', error);
            setProviders([]);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cargar los proveedores',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja proveedor?',
            text: 'El proveedor pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/proveedores/${id}`, { estado: 'inactivo' });
                Swal.fire({
                    title: '¡Proveedor dado de baja!',
                    text: 'El estado del proveedor ha sido cambiado a Inactivo.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
                fetchProviders();
            } catch (error) {
                console.error('Error al dar de baja proveedor:', error);
                Swal.fire({
                    title: 'Error!',
                    text: 'Hubo un problema al dar de baja el proveedor.',
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar proveedor?',
            text: 'El proveedor volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar',
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/proveedores/${id}`, { estado: 'activo' });
                Swal.fire({
                    title: '¡Proveedor reactivado!',
                    text: 'El estado del proveedor ha sido cambiado a Activo.',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
                fetchProviders();
            } catch (error) {
                console.error('Error al reactivar proveedor:', error);
                Swal.fire({
                    title: 'Error!',
                    text: 'Hubo un problema al reactivar el proveedor.',
                    icon: 'error',
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const fetchAllProviders = async (): Promise<Proveedor[]> => {
        try {
            const response = await api.get<PaginatedResponse>(`/proveedores?page=1&limit=10000`);
            return Array.isArray(response.data.data) ? response.data.data : [];
        } catch (error) {
            console.error('Error fetching all providers:', error);
            return [];
        }
    };

    const exportToExcel = async () => {
        try {
            console.log('Iniciando exportación a Excel...');
            const allProviders = await fetchAllProviders();

            if (allProviders.length === 0) {
                Swal.fire('Información', 'No hay proveedores para exportar', 'info');
                return;
            }

            const excelData = allProviders.map(provider => ({
                'ID': provider.id,
                'Proveedor': provider.proveedor,
                'Celular': formatCelular(provider.celular),
                'Dirección': provider.direccion,
                'Email': provider.email,
                'Nombre Contacto': provider.nombre_contacto,
                'Celular Contacto': formatCelular(provider.celular_contacto),
                'Estado': provider.estado
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
            const date = getLocalDateString();
            XLSX.writeFile(wb, `proveedores_${date}.xlsx`);

            Swal.fire({
                icon: 'success',
                title: '¡Exportado!',
                text: `Se exportaron ${allProviders.length} proveedores exitosamente`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            Swal.fire('Error', 'Error al exportar a Excel', 'error');
        }
    };

    const exportToPDF = async () => {
        try {
            console.log('Iniciando exportación a PDF...');
            const allProviders = await fetchAllProviders();

            if (allProviders.length === 0) {
                Swal.fire('Información', 'No hay proveedores para exportar', 'info');
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            try {
                // Add title
                doc.setFontSize(18);
                doc.setTextColor(44, 62, 80);
                doc.text('Lista de Proveedores', 14, 20);
            } catch (error) {
                console.log('Error adding title');
            }

            // Add blue line separator
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(14, 28, pageWidth - 14, 28);

            const tableData = allProviders.map(provider => [
                provider.proveedor,
                formatCelular(provider.celular),
                provider.direccion,
                provider.email,
                provider.nombre_contacto,
                formatCelular(provider.celular_contacto),
                provider.estado.charAt(0).toUpperCase() + provider.estado.slice(1)
            ]);

            autoTable(doc, {
                head: [['Proveedor', 'Celular', 'Dirección', 'Email', 'Nombre Contacto', 'Celular Contacto', 'Estado']],
                body: tableData,
                startY: 35,
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 247, 250]
                }
            });

            doc.save(`proveedores_${getLocalDateString()}.pdf`);

            Swal.fire({
                icon: 'success',
                title: '¡Exportado!',
                text: `Se exportaron ${allProviders.length} proveedores exitosamente`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al exportar a PDF:', error);
            Swal.fire('Error', 'Error al exportar a PDF', 'error');
        }
    };

    const handlePrint = async () => {
        try {
            const allProviders = await fetchAllProviders();

            if (allProviders.length === 0) {
                Swal.fire('Información', 'No hay proveedores para imprimir', 'info');
                return;
            }

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                Swal.fire('Error', 'Por favor habilite las ventanas emergentes', 'error');
                return;
            }



            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lista de Proveedores</title>
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
                        
                        .header h1 {
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
                            padding: 10px 6px;
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
                        
                        .footer {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            padding: 10px 1.5cm;
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
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Lista de Proveedores</h1>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Proveedor</th>
                                <th>Celular</th>
                                <th>Dirección</th>
                                <th>Email</th>
                                <th>Contacto</th>
                                <th>Cel. Contacto</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allProviders.map(p => `
                                <tr>
                                    <td>${p.proveedor}</td>
                                    <td>${formatCelular(p.celular)}</td>
                                    <td>${p.direccion || '-'}</td>
                                    <td>${p.email || '-'}</td>
                                    <td>${p.nombre_contacto || '-'}</td>
                                    <td>${formatCelular(p.celular_contacto)}</td>
                                    <td>${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>


                    
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(printContent);
            printWindow.document.close();

        } catch (error) {
            console.error('Error printing providers:', error);
            Swal.fire('Error', 'No se pudieron cargar los proveedores para imprimir', 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Truck className="text-blue-600" size={32} />
                            Gestión de Proveedores
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Control de proveedores de insumos y materiales</p>
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
                            setSelectedProviderId(null);
                            setIsDrawerOpen(true);
                        }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Proveedor
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, celular, email..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Results Info */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Celular</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dirección</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre Contacto</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Celular Contacto</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {providers.map((provider, index) => (
                            <tr key={provider.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {(currentPage - 1) * limit + index + 1}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {provider.proveedor}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {formatCelular(provider.celular)}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {provider.direccion}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {provider.email}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {provider.nombre_contacto}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {formatCelular(provider.celular_contacto)}
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded text-sm ${provider.estado === 'activo'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                        }`}>
                                        {provider.estado}
                                    </span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 no-print">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedProviderId(provider.id);
                                                setIsDrawerOpen(true);
                                            }}
                                            className="p-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        {provider.estado === 'activo' ? (
                                            <button
                                                onClick={() => handleDelete(provider.id)}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center"
                                                title="Dar de baja"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleReactivate(provider.id)}
                                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center"
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
                    </tbody>
                </table>
            </div>

            {(!providers || providers.length === 0) && (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg mt-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>{searchTerm ? 'No se encontraron resultados' : 'No hay proveedores registrados'}</p>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Proveedor Form Drawer Modal */}
            <ProveedorForm
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                id={selectedProviderId}
                onSaveSuccess={() => {
                    fetchProviders();
                    setIsDrawerOpen(false);
                }}
            />

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Proveedores"
                sections={manualSections}
            />
        </div>
    );
};

export default ProveedorList;
