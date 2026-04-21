import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Download, Printer, AlertCircle, Users } from 'lucide-react';


interface Deudor {
    proformaId: number;
    numeroPresupuesto: number;
    paciente: string;
    totalPresupuesto: number;
    totalPagado: number;
    saldo: number;
    ultimaCita: string;
    especialidad: string;
    tratamiento: string;
    pacienteEstado?: string;
}

const PacientesDeudores: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'pasivos' | 'activos'>('pasivos');
    const [deudores, setDeudores] = useState<Deudor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const { clinicaSeleccionada, clinicaActual } = useClinica();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        fetchDeudores();
    }, [activeTab, clinicaSeleccionada]);

    const fetchDeudores = async () => {
        setLoading(true);
        try {
            const tab = activeTab === 'pasivos' ? 'pasivos' : 'activos';
            const clinicaParam = clinicaSeleccionada ? `?clinicaId=${clinicaSeleccionada}` : '';
            const endpoint = `/pacientes-deudores/${tab}${clinicaParam}`;
            const response = await api.get<Deudor[]>(endpoint);
            setDeudores(response.data);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error fetching deudores:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(amount);
    };



    // --- Totals Calculation ---
    const totalDeudaActivos = deudores
        .filter(d => d.pacienteEstado?.toLowerCase().trim() !== 'inactivo')
        .reduce((sum, d) => sum + d.saldo, 0);

    const totalDeudaInactivos = deudores
        .filter(d => d.pacienteEstado?.toLowerCase().trim() === 'inactivo')
        .reduce((sum, d) => sum + d.saldo, 0);

    // --- Pagination Logic ---
    const filteredDeudores = deudores.filter(d => {
        return d.paciente.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => b.saldo - a.saldo);

    const totalItems = filteredDeudores.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedDeudores = filteredDeudores.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // --- Export Logic ---
    const exportToExcel = () => {
        try {
            const excelData = deudores.map(d => ({
                '# Plan de Tratamiento': d.numeroPresupuesto,
                'Paciente': d.paciente,
                'Especialidad': d.especialidad,
                'Tratamiento': d.tratamiento,
                'Última Cita': formatDate(d.ultimaCita),
                'Saldo': d.saldo
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Deudores_${activeTab}`);
            const date = getLocalDateString();
            XLSX.writeFile(wb, `deudores_${activeTab}_${date}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error al exportar a Excel');
        }
    };

    const exportToPDF = async () => {
        try {
            const doc = new jsPDF('portrait');

            // Load Logo
            const logoUrl = '/logo-curare.png';
            const logoImg = new Image();
            logoImg.src = logoUrl;

            await new Promise((resolve) => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve; // Continue even if logo fails
            });

            // Add Logo if loaded
            if (logoImg.complete && logoImg.naturalWidth > 0) {
                doc.addImage(logoImg, 'PNG', 14, 10, 30, 15); // x, y, w, h
            }

            // Professional Header (Adjusted position)
            doc.setFontSize(20);
            doc.setTextColor(44, 62, 80);
            doc.text('Pacientes Deudores', 50, 20); // Moved right to make space for logo

            // Subtitle
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Tipo: ${activeTab === 'pasivos' ? 'PASIVOS (Tratamiento Terminado)' : 'ACTIVOS (Tratamiento No Terminado)'}`, 50, 26);

            // Blue separator line
            doc.setDrawColor(52, 152, 219);
            doc.setLineWidth(0.5);
            doc.line(14, 32, 196, 32);

            const tableData = filteredDeudores.map(d => [
                d.numeroPresupuesto,
                d.paciente,
                d.especialidad || '-',
                d.tratamiento || '-',
                formatDate(d.ultimaCita),
                formatCurrency(d.saldo)
            ]);

            autoTable(doc, {
                head: [['# Pr.', 'Paciente', 'Especialidad', 'Tratamiento', 'Última Cita', 'Saldo']],
                body: tableData,
                startY: 38,
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [52, 152, 219],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'left'
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                columnStyles: {
                    5: { halign: 'right', textColor: [231, 76, 60], fontStyle: 'bold' }
                }
            });

            // Total section
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            const totalDeuda = filteredDeudores.reduce((sum, d) => sum + d.saldo, 0);

            doc.setFillColor(248, 249, 250);
            doc.rect(120, finalY, 76, 15, 'F'); // Adjusted X and width for portrait

            doc.setFontSize(11);
            doc.setTextColor(44, 62, 80);
            doc.setFont('helvetica', 'bold');
            doc.text('Total Deuda:', 125, finalY + 10);

            doc.setTextColor(231, 76, 60);
            doc.text(formatCurrency(totalDeuda), 190, finalY + 10, { align: 'right' });


            doc.save(`deudores_${activeTab}_${getLocalDateString()}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Error al exportar a PDF');
        }
    };

    const handlePrint = () => {
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

        const totalDeuda = filteredDeudores.reduce((sum, d) => sum + d.saldo, 0);

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pacientes Deudores - ${activeTab.toUpperCase()}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 1.5cm 1cm;
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
                    
                    .subtitle {
                        margin: 10px 0;
                        padding: 8px;
                        background-color: #f8f9fa;
                        border-left: 4px solid #3498db;
                        font-size: 12px;
                        font-weight: bold;
                        color: #2c3e50;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 15px;
                    }
                    
                    th {
                        background-color: #3498db;
                        color: white;
                        padding: 10px 6px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #2980b9;
                        font-size: 10px;
                    }
                    
                    td {
                        padding: 6px;
                        border: 1px solid #ddd;
                        font-size: 9px;
                    }
                    
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    
                    .text-right {
                        text-align: right;
                    }
                    
                    .total-section {
                        margin-top: 20px;
                        padding: 15px;
                        background-color: #f8f9fa;
                        border-radius: 8px;
                        border: 1px solid #dee2e6;
                        text-align: right;
                    }
                    
                    .total-label {
                        font-size: 14px;
                        font-weight: bold;
                        color: #2c3e50;
                        margin-right: 10px;
                    }
                    
                    .total-amount {
                        font-size: 18px;
                        font-weight: bold;
                        color: #e74c3c;
                    }
                    
                    .footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 10px 1cm;
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
                        body {
                            margin: 0;
                        }
                        
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
                        
                        .subtitle, .total-section {
                            background-color: #f8f9fa !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        .footer {
                            position: fixed;
                            bottom: 1cm;
                            left: 1cm;
                            right: 1cm;
                            width: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${clinicaActual?.logo || ''}" alt="Logo">
                    <h1>Pacientes Deudores</h1>
                </div>
                
                <div class="subtitle">
                    Tipo: ${activeTab === 'pasivos' ? 'PASIVOS (Tratamiento Terminado)' : 'ACTIVOS (Tratamiento No Terminado)'}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th># Pr.</th>
                            <th>Paciente</th>
                            <th>Especialidad</th>
                            <th>Tratamiento</th>
                            <th>Última Cita</th>
                            <th class="text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredDeudores.map(d => `
                            <tr>
                                <td>${d.numeroPresupuesto}</td>
                                <td>${d.paciente}</td>
                                <td>${d.especialidad || '-'}</td>
                                <td>${d.tratamiento || '-'}</td>
                                <td>${formatDate(d.ultimaCita)}</td>
                                <td class="text-right" style="font-weight: bold; color: #e74c3c;">${formatCurrency(d.saldo)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="total-section">
                    <span class="total-label">Total Deuda:</span>
                    <span class="total-amount">${formatCurrency(totalDeuda)}</span>
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
    };



    return (
        <div className="content-card p-6 min-h-screen text-gray-800 dark:text-gray-200">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <AlertCircle className="text-blue-600" size={32} />
                        Pacientes Deudores
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Listado de pacientes con saldos y deudas pendientes</p>
                </div>
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
            </div>

            {/* Tabs */}
            <div className="no-print flex flex-wrap border-b border-gray-200 dark:border-gray-600 mb-5 bg-white dark:bg-gray-800 rounded-t-lg pt-2 px-2 transition-colors">
                <div
                    onClick={() => setActiveTab('pasivos')}
                    className={`px-5 py-2.5 cursor-pointer border-b-4 flex items-center gap-2 transition-all duration-200 text-base ${activeTab === 'pasivos'
                        ? 'border-blue-500 text-blue-500 font-bold dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 font-normal hover:text-blue-500 dark:hover:text-blue-300'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                    </svg>
                    Pasivos (Terminado)
                </div>
                <div
                    onClick={() => setActiveTab('activos')}
                    className={`px-5 py-2.5 cursor-pointer border-b-4 flex items-center gap-2 transition-all duration-200 text-base ${activeTab === 'activos'
                        ? 'border-blue-500 text-blue-500 font-bold dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 font-normal hover:text-blue-500 dark:hover:text-blue-300'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    Activos (No Terminado)
                </div>
            </div>

            {/* Search */}
            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print flex justify-between items-center transition-colors">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por Paciente..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 placeholder-gray-400 dark:placeholder-gray-300"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Showing status */}
            <div className="mb-3 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} registros
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto transition-colors">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Cargando...</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Plan de Tratamiento</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Especialidad</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tratamiento</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Última Cita</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedDeudores.length > 0 ? (
                                paginatedDeudores.map((deudor) => (
                                    <tr key={deudor.proformaId} className={`hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors ${deudor.pacienteEstado?.toLowerCase().trim().startsWith('inactiv') ? 'bg-red-50/50 dark:bg-red-900/10 italic' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">#{deudor.numeroPresupuesto}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            <div className="flex flex-col">
                                                <span>{deudor.paciente}</span>
                                                {deudor.pacienteEstado?.toLowerCase().trim().startsWith('inactiv') && (
                                                    <span className="text-[10px] uppercase font-bold text-red-500 dark:text-red-400 mt-0.5 tracking-wider">Paciente Inactivo</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{deudor.especialidad || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate" title={deudor.tratamiento}>
                                            {deudor.tratamiento || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(deudor.ultimaCita)}</td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${deudor.saldo > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {formatCurrency(deudor.saldo)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                                        No se encontraron registros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

            </div>

            {/* Total Footer */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex justify-end items-center transition-colors">
                <span className="text-base font-bold text-gray-700 dark:text-gray-300 mr-2">Total Deuda:</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(filteredDeudores.reduce((sum, d) => sum + d.saldo, 0))}
                </span>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-4 no-print">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}

            {/* Totals Summary (Compact At Bottom) */}
            <div className="mt-6 flex flex-col md:flex-row gap-4 no-print justify-end items-center">
                <div className="bg-blue-50 dark:bg-blue-900/10 px-4 py-2 rounded-lg border-l-4 border-blue-400 border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                    <Users size={16} className="text-blue-500" />
                    <div>
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tighter block leading-none">Total Deuda Activos</span>
                        <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                            {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(totalDeudaActivos)}
                        </span>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 px-4 py-2 rounded-lg border-l-4 border-red-400 border border-red-100 dark:border-red-800 flex items-center gap-3">
                    <AlertCircle size={16} className="text-red-500" />
                    <div>
                        <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-tighter block leading-none">Total Deuda Inactivos</span>
                        <span className="text-lg font-bold text-red-900 dark:text-red-200">
                            {new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(totalDeudaInactivos)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PacientesDeudores;
