import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Arancel } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import Swal from 'sweetalert2';
import ArancelForm from './ArancelForm';
import { useClinica } from '../context/ClinicaContext';
import { getLocalDateString } from '../utils/dateUtils';
import { FileText, Download, Printer, ClipboardList, Search, X, Stethoscope } from 'lucide-react';
// Local currency formatter
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
    }).format(amount);
};


interface PaginatedResponse {
    data: Arancel[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const ArancelList: React.FC = () => {
    const [aranceles, setAranceles] = useState<Arancel[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    // Clínica id=2 usa precios especializados
    const isClinica2 = clinicaSeleccionada === 2;

    // Modal State
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [especialidades, setEspecialidades] = useState<any[]>([]);
    const [updateData, setUpdateData] = useState({
        especialidadId: 0,
        porcentaje: 0
    });

    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Aranceles',
            content: 'Aquí puede administrar la lista de precios y tratamientos.'
        },
        {
            title: 'Actualización Masiva',
            content: 'Utilice el botón "Actualizar Precios" para aplicar incrementos porcentuales a múltiples aranceles por especialidad.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para aranceles activos, el botón rojo (papelera) cambia el estado a "Inactivo". Para aranceles inactivos, aparece un botón verde (check) que permite reactivarlos a estado "Activo".'
        },
        {
            title: 'Acciones',
            content: 'Puede exportar la lista a Excel o PDF, e imprimir el reporte actual.'
        }];

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchAranceles();
        fetchEspecialidades();
    }, [currentPage, debouncedSearchTerm, clinicaSeleccionada]);


    const fetchEspecialidades = async () => {
        try {
            const response = await api.get('/arancel/used-specialties');
            setEspecialidades(response.data);
        } catch (error) {
            console.error('Error fetching especialidades:', error);
        }
    };

    const fetchAranceles = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            const response = await api.get<PaginatedResponse>(`/arancel?${params}`);
            setAranceles(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
        } catch (error) {
            console.error('Error fetching aranceles:', error);
            alert('Error al cargar los aranceles');
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja arancel?',
            text: 'El arancel pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/arancel/${id}`, { estado: 'inactivo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Arancel dado de baja!',
                    text: 'El estado del arancel ha sido cambiado a Inactivo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchAranceles();
            } catch (error) {
                console.error('Error al dar de baja arancel:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo dar de baja el arancel'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar arancel?',
            text: 'El arancel volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/arancel/${id}`, { estado: 'activo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Arancel reactivado!',
                    text: 'El estado del arancel ha sido cambiado a Activo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchAranceles();
            } catch (error) {
                console.error('Error al reactivar arancel:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el arancel'
                });
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleCreate = () => {
        setSelectedId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id: number) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedId(null);
    };

    const handleSaveSuccess = () => {
        fetchAranceles();
        handleCloseModal();
    };

    const handleUpdatePrices = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                especialidadId: Number(updateData.especialidadId) === 0 ? undefined : Number(updateData.especialidadId),
                porcentaje: Number(updateData.porcentaje)
            };
            await api.post('/arancel/update-prices', payload);
            alert('Precios actualizados exitosamente');
            setShowUpdateModal(false);
            fetchAranceles();
        } catch (error) {
            console.error('Error updating prices:', error);
            alert('Error al actualizar precios');
        }
    };

    const exportToExcel = () => {
        try {
            const excelData = aranceles.map(a => ({
                'ID': a.id,
                'Descripción': a.detalle,
                'Especialidad': a.especialidad?.especialidad || 'N/A',
                ...(isClinica2 ? {
                    'Precio Gold': a.precio_gold || '',
                    'Precio Silver': a.precio_silver || '',
                    'Precio Odontológico': a.precio_odontologico || '',
                    'Precio S/ Seguro': a.precio_sin_seguro || '',
                } : {
                    'Precio': a.precio,
                    'Precio S/ Seguro': a.precio_sin_seguro || '',
                }),
                'Clínica': a.clinica?.nombre || 'General',
                'Estado': a.estado
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Aranceles');

            const date = getLocalDateString();
            const filename = `aranceles_${date}.xlsx`;
            XLSX.writeFile(wb, filename);
        } catch (error) {
            console.error('Error al exportar a Excel:', error);
            alert('Error al exportar a Excel');
        }
    };

    const exportToPDF = async () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Add logo
            const logoPath = '/logo-curare.png';
            try {
                const img = new Image();
                img.src = logoPath;
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });

                if (img.complete && img.naturalHeight !== 0) {
                    doc.addImage(img, 'PNG', 14, 10, 30, 15);
                }
            } catch (error) {
                console.log('Logo no disponible, continuando sin logo');
            }

            // Add title next to logo
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80);
            doc.text('Lista de Aranceles', 50, 20);

            // Add blue line separator
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(14, 28, pageWidth - 14, 28);

            // Prepare table data
            const tableData = aranceles.map((a, index) => [
                index + 1,
                a.detalle,
                a.especialidad?.especialidad || 'N/A',
                ...(isClinica2 ? [
                    a.precio_gold || '-',
                    a.precio_silver || '-',
                    a.precio_odontologico || '-',
                    a.precio_sin_seguro || '-',
                ] : [
                    a.precio,
                    a.precio_sin_seguro || '-',
                ]),
                a.clinica?.nombre || 'General',
                a.estado.charAt(0).toUpperCase() + a.estado.slice(1)
            ]);

            // Add table
            autoTable(doc, {
                head: [[
                    '#', 'Descripción', 'Especialidad',
                    ...(isClinica2 ? ['Gold', 'Silver', 'Odontológico', 'S/ Seguro'] : ['Precio', 'Precio S/ Seguro']),
                    'Clínica', 'Estado'
                ]],
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
                    fillColor: [248, 249, 250]
                },
                margin: { bottom: 25 },
            });

            const filename = `aranceles_${getLocalDateString()}.pdf`;
            doc.save(filename);
        } catch (error) {
            console.error('Error al exportar a PDF:', error);
            alert('Error al exportar a PDF');
        }
    };

    const handlePrint = async () => {
        try {
            // Fetch ALL records for printing with clinic filter
            const params = new URLSearchParams({ page: '1', limit: '9999' });
            if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());
            
            const response = await api.get<PaginatedResponse>(`/arancel?${params}`);
            const allAranceles = response.data.data;

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
                    <title>Lista de Aranceles</title>
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
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 10px;
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
                        
                        .status-active {
                            color: #27ae60;
                            font-weight: bold;
                        }
                        
                        .status-inactive {
                            color: #e74c3c;
                            font-weight: bold;
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
                            <h1>Lista de Aranceles</h1>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Descripción</th>
                                <th>Especialidad</th>
                                ${isClinica2 ? '<th>Gold</th><th>Silver</th><th>Odontológico</th><th>S/ Seguro</th>' : '<th>Precio</th><th>Precio S/ Seguro</th>'}
                                <th>Clínica</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allAranceles.map((a: Arancel, index: number) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${a.detalle}</td>
                                    <td>${a.especialidad?.especialidad || 'N/A'}</td>
                                    ${isClinica2
                                        ? `<td>${a.precio_gold || '-'}</td><td>${a.precio_silver || '-'}</td><td>${a.precio_odontologico || '-'}</td><td>${a.precio_sin_seguro || '-'}</td>`
                                        : `<td>${a.precio}</td><td>${a.precio_sin_seguro || '-'}</td>`
                                    }
                                    <td>${a.clinica?.nombre || 'General'}</td>
                                    <td class="${a.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                                        ${a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}
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
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <ClipboardList className="text-blue-600" size={32} />
                        Lista de Aranceles
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Configuración de servicios y lista de precios</p>
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
                        onClick={handleCreate}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Arancel
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print transition-all duration-300">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por tratamiento o especialidad..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm"
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
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
                <div className="flex gap-4 items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowUpdateModal(true)}
                            className="bg-[#1abc9c] hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M23 4H1v18h22V4zm-2 16H3V6h18v14z"></path>
                                <path d="M12 14v4M9 14v4M15 14v4"></path>
                            </svg>
                            Actualizar Precios
                        </button>
                    </div>
                </div>
            </div>
            {/* Update Prices Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl transform transition-all">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Actualizar Precios Masivamente</h3>
                        <form onSubmit={handleUpdatePrices}>
                            <div className="mb-4 relative">
                                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Especialidad</label>
                                <div className="relative">
                                    <Stethoscope className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                                    <select
                                        className="w-full border border-gray-300 dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        value={updateData.especialidadId}
                                        onChange={(e) => setUpdateData({ ...updateData, especialidadId: Number(e.target.value) })}
                                    >
                                        <option value="">-- seleccionar especialidad --</option>
                                        {especialidades.map(esp => (
                                            <option key={esp.id} value={esp.id}>{esp.especialidad}</option>
                                        ))}
                                        <option value={0}>TODAS</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6 relative">
                                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Porcentaje de Incremento (%)</label>
                                <div className="relative">
                                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
                                    </svg>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 dark:border-gray-600 p-2 pl-10 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={updateData.porcentaje}
                                        onChange={(e) => setUpdateData({ ...updateData, porcentaje: Number(e.target.value) })}
                                        required
                                        min="0"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ej: 10 para aumentar un 10%</p>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUpdateModal(false)}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#1abc9c] text-white rounded hover:bg-teal-600 font-bold transition-colors"
                                >
                                    Aceptar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Descripción</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                            {!isClinica2 && <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio</th>}
                            {isClinica2 && (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gold</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Silver</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Odontológico</th>
                                </>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio S/ Seguro</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Clínica</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {aranceles.map((a, index) => (
                            <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300 font-medium">
                                    {a.detalle}
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{a.especialidad?.especialidad}</td>
                                {!isClinica2 && <td className="p-3 text-gray-800 dark:text-gray-300 font-bold">{formatCurrency(a.precio)}</td>}
                                {isClinica2 && (
                                    <>
                                        <td className="p-3 text-gray-800 dark:text-gray-300 font-bold">{a.precio_gold ? formatCurrency(a.precio_gold) : '-'}</td>
                                        <td className="p-3 text-gray-800 dark:text-gray-300 font-bold">{a.precio_silver ? formatCurrency(a.precio_silver) : '-'}</td>
                                        <td className="p-3 text-gray-800 dark:text-gray-300 font-bold">{a.precio_odontologico ? formatCurrency(a.precio_odontologico) : '-'}</td>
                                    </>
                                )}
                                <td className="p-3 text-gray-800 dark:text-gray-300 font-bold">{a.precio_sin_seguro ? formatCurrency(a.precio_sin_seguro) : '-'}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300 font-medium text-blue-600 dark:text-blue-400">{a.clinica?.nombre || 'General'}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-sm ${a.estado === 'activo' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                        {a.estado}
                                    </span>
                                </td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        onClick={() => handleEdit(a.id)}
                                        className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {a.estado === 'activo' ? (
                                        <button
                                            onClick={() => handleDelete(a.id)}
                                            className="bg-[#dc3545] hover:bg-red-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            title="Dar de baja"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivate(a.id)}
                                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
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

            {
                aranceles.length === 0 && (
                    <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'No se encontraron resultados' : 'No hay aranceles registrados'}
                    </p>
                )
            }

            {
                totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )
            }

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Aranceles"
                sections={manualSections}
            />

            {/* Modal Form */}
            <ArancelForm
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                id={selectedId}
                onSaveSuccess={handleSaveSuccess}
            />
        </div >
    );
};

export default ArancelList;
