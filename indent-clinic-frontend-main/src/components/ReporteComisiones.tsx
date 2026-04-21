import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { useClinica } from '../context/ClinicaContext';
import { FileText, Search, User, Calendar, DollarSign, Download, Printer, PieChart, Eye, X } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import type { Personal } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CommissionDetail {
    fecha: string;
    paciente: string;
    total: number;
    comision: number;
    estado: string;
    productos: string;
}

interface CommissionReport {
    personalId: number;
    nombre: string;
    paterno: string;
    materno: string;
    total_ventas: number;
    total_comision: number;
    total_pendiente: number;
    total_pagado: number;
    cantidad_ventas: number;
    ventas_detalladas?: CommissionDetail[];
}

const ReporteComisiones: React.FC = () => {
    const { clinicaSeleccionada } = useClinica();
    const [report, setReport] = useState<CommissionReport[]>([]);
    const [personales, setPersonales] = useState<Personal[]>([]);
    const [loading, setLoading] = useState(false);
    
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [selectedPersonalId, setSelectedPersonalId] = useState<string>('');
    const [viewItem, setViewItem] = useState<CommissionReport | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        fetchPersonales();
    }, [clinicaSeleccionada]);

    useEffect(() => {
        fetchReport();
    }, [month, year, selectedPersonalId, clinicaSeleccionada]);

    const fetchPersonales = async () => {
        try {
            const params = new URLSearchParams({ limit: '1000' });
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());
            
            const res = await api.get(`/personal?${params}`);
            setPersonales(res.data.data || []);
        } catch (error) {
            console.error('Error fetching personales:', error);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                month: month.toString(),
                year: year.toString(),
            });
            if (selectedPersonalId) params.append('personalId', selectedPersonalId);
            if (clinicaSeleccionada) params.append('clinicaId', clinicaSeleccionada.toString());

            const res = await api.get<CommissionReport[]>(`/ventas-productos/comisiones?${params}`);
            setReport(res.data || []);
        } catch (error) {
            console.error('Error fetching commission report:', error);
            setReport([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePagarComision = async (item: CommissionReport) => {
        try {
            // 1. Obtener formas de pago para el select (con límite alto para ver todas)
            const resFP = await api.get('/forma-pago?limit=100');
            const formasPago = resFP.data.data || [];
            
            const options = (formasPago || []).map((fp: any) => `<option value="${fp.id}">${fp.forma_pago}</option>`).join('');

            const { value: formValues } = await Swal.fire({
                title: '<div class="flex items-center justify-center gap-3 text-blue-700"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dollar-sign"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Registrar Pago de Comisión</div>',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p class="text-sm text-gray-600 dark:text-gray-400"><strong>Personal:</strong> <span class="text-gray-900 dark:text-white font-semibold">${item.nombre} ${item.paterno}</span></p>
                            <p class="text-sm text-gray-600 dark:text-gray-400"><strong>Monto a Pagar:</strong> <span class="text-blue-600 dark:text-blue-400 font-bold text-lg">${Number(item.total_comision).toLocaleString()} Bs.</span></p>
                        </div>
                        
                        <label for="swal-fp" class="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Forma de Pago:</label>
                        <select id="swal-fp" class="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm">
                            ${options}
                        </select>
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: '<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Confirmar Pago</div>',
                cancelButtonText: '<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancelar</div>',
                customClass: {
                    confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 mx-2',
                    cancelButton: 'bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 mx-2'
                },
                buttonsStyling: false,
                preConfirm: () => {
                    return {
                        formaPagoId: (document.getElementById('swal-fp') as HTMLSelectElement).value
                    }
                }
            });

            if (formValues) {
                await api.post('/ventas-productos/comisiones/pagar', {
                    personalId: item.personalId,
                    year: year,
                    month: month,
                    formaPagoId: parseInt(formValues.formaPagoId),
                    total: item.total_comision,
                    clinicaId: clinicaSeleccionada || 0
                });

                Swal.fire('¡Éxito!', 'Pago registrado y comisiones liquidadas.', 'success');
                fetchReport(); // Refrescar para que desaparezcan las pagadas
            }
        } catch (error) {
            console.error('Error pagando comisión:', error);
            Swal.fire('Error', 'No se pudo registrar el pago.', 'error');
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('report-table-to-print');
        if (!printContent) return;

        const windowPrint = window.open('', '', 'width=900,height=650');
        if (!windowPrint) return;

        windowPrint.document.write(`
            <html>
                <head>
                    <title>Reporte de Comisiones - ${month}/${year}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #f3f4f6; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .total-row { font-weight: bold; background-color: #f9fafb; }
                        .no-print-col { display: none; } /* Ocultar columna de acciones al imprimir */
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Reporte de Comisiones sobre Ventas</h1>
                        <p>Periodo: ${month}/${year}</p>
                    </div>
                    ${printContent.outerHTML}
                </body>
            </html>
        `);
        windowPrint.document.close();
        windowPrint.focus();
        windowPrint.print();
        windowPrint.close();
    };

    const printRow = (row: CommissionReport) => {
        const windowPrint = window.open('', '', 'width=900,height=700');
        if (!windowPrint) return;
        const nombreCompleto = `${row.nombre} ${row.paterno} ${row.materno || ''}`;
        
        const detallesHtml = row.ventas_detalladas?.map(v => `
            <tr>
                <td>${new Date(v.fecha).toLocaleDateString()}</td>
                <td>${v.paciente}</td>
                <td>${v.productos}</td>
                <td style="text-align: right;">${Number(v.total).toFixed(2)}</td>
                <td style="text-align: right;">${Number(v.comision).toFixed(2)}</td>
            </tr>
        `).join('') || '<tr><td colspan="5">No hay detalles disponibles</td></tr>';

        windowPrint.document.write(`
            <html>
                <head>
                    <title>Comprobante de Comisión - ${nombreCompleto}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                        .header { border-bottom: 2px solid #3b82f6; margin-bottom: 20px; padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
                        h2 { color: #1e40af; margin: 0; font-size: 20px; }
                        .summary { display: grid; grid-cols: 2; gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 6px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th { background: #3b82f6; color: white; padding: 8px; text-align: left; }
                        td { border-bottom: 1px solid #eee; padding: 8px; }
                        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
                        .total-row { font-weight: bold; background: #f1f5f9; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <div>
                                <h2>DETALLE DE COMISIONES</h2>
                                <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Periodo: ${month}/${year}</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 10px; color: #999;">Generado: ${new Date().toLocaleString()}</div>
                            </div>
                        </div>
                        
                        <div class="summary">
                            <div><strong>Personal:</strong> ${nombreCompleto}</div>
                            <div><strong>Total Comisión a Liquidar (40% de Utilidad):</strong> <span style="color: #2563eb; font-weight: bold;">${Number(row.total_comision).toFixed(2)} Bs.</span></div>
                        </div>

                        <h3 style="font-size: 14px; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 10px;">Desglose de Ventas</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Paciente</th>
                                    <th>Productos</th>
                                    <th style="text-align: right;">Venta (Bs.)</th>
                                    <th style="text-align: right;">Comisión (Bs.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detallesHtml}
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="3" style="text-align: right;">TOTALES:</td>
                                    <td style="text-align: right;">${Number(row.total_ventas).toFixed(2)}</td>
                                    <td style="text-align: right;">${Number(row.total_comision).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div class="footer">
                            <div style="margin-top: 40px; display: flex; justify-content: space-around;">
                                <div style="border-top: 1px solid #333; width: 200px; padding-top: 5px;">Recibí Conforme (Firma)</div>
                                <div style="border-top: 1px solid #333; width: 200px; padding-top: 5px;">Entregado Por</div>
                            </div>
                        </div>
                    </div>
                    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
                </body>
            </html>
        `);
        windowPrint.document.close();
    };

    const exportRowToPDF = (row: CommissionReport) => {
        const doc = new jsPDF() as any;
        const nombreCompleto = `${row.nombre} ${row.paterno} ${row.materno || ''}`;
        
        doc.setFontSize(18);
        doc.setTextColor(30, 64, 175);
        doc.text('REPORTE DETALLADO DE COMISIONES', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Personal: ${nombreCompleto}`, 14, 30);
        doc.text(`Periodo: ${month}/${year}`, 14, 35);
        doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 40);
        
        // Tabla de resumen
        autoTable(doc, {
            startY: 45,
            head: [['Concepto', 'Total']],
            body: [
                ['Cantidad de Ventas', (row.cantidad_ventas || 0).toString()],
                ['Monto Total Ventas', `${Number(row.total_ventas || 0).toFixed(2)} Bs.`],
                ['Total Comisión (40% de Utilidad)', `${Number(row.total_comision || 0).toFixed(2)} Bs.`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [30, 64, 175] }
        });

        // Tabla de detalles
        const lastY = (doc as any).lastAutoTable?.finalY || 80;
        
        doc.setFontSize(14);
        doc.setTextColor(30, 64, 175);
        doc.text('Desglose de Ventas', 14, lastY + 15);

        const tableBody = (row.ventas_detalladas || []).map(v => [
            v.fecha ? new Date(v.fecha).toLocaleDateString() : 'N/A',
            v.paciente || 'N/A',
            v.productos || 'Sin productos',
            Number(v.total || 0).toFixed(2),
            Number(v.comision || 0).toFixed(2)
        ]);

        if (tableBody.length === 0) {
            tableBody.push(['-', 'Sin detalles registrados', '-', '0.00', '0.00']);
        }

        autoTable(doc, {
            startY: lastY + 20,
            head: [['Fecha', 'Paciente', 'Productos', 'Venta (Bs.)', 'Comisión (Bs.)']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            styles: { fontSize: 8 },
            margin: { top: 10 }
        });
        
        doc.save(`detalle_comision_${row.nombre.replace(/\s/g, '_')}_${month}_${year}.pdf`);
    };

    const [showManual, setShowManual] = useState(false);
    const manualSections: ManualSection[] = [
        {
            title: 'Reporte de Comisiones',
            content: 'Consulte las comisiones generadas por el personal de recepción a partir de las ventas de productos comerciales.'
        },
        {
            title: 'Filtros',
            content: 'Puede filtrar por mes, año y personal específico. El sistema recalculará los totales automáticamente al cambiar cualquier filtro.'
        },
        {
            title: 'Cálculo de Comisión',
            content: 'Se aplica un 40% sobre la utilidad neta (Precio Venta - Costo de Compra) de cada producto.'
        },
        {
            title: 'Exportación',
            content: 'Puede exportar los datos a Excel, PDF o imprimir el reporte directamente.'
        }];

    const exportToExcel = () => {
        const excelData = report.map(row => ({
            'Personal': row.nombre,
            'Cant. Ventas': row.cantidad_ventas,
            'Total Ventas (Bs.)': row.total_ventas,
            'Comisión 40% Utilidad (Bs.)': row.total_comision
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Comisiones');
        XLSX.writeFile(wb, `comisiones_${month}_${year}.xlsx`);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text(`Reporte de Comisiones - ${month}/${year}`, 14, 15);
        autoTable(doc, {
            head: [['Personal', 'Cant. Ventas', 'Total Ventas', 'Comisión 40%']],
            body: report.map(r => [r.nombre, r.cantidad_ventas, Number(r.total_ventas).toFixed(2), Number(r.total_comision).toFixed(2)]),
            startY: 20
        });
        doc.save(`comisiones_${month}_${year}.pdf`);
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <PieChart className="text-blue-600" size={32} />
                        Reporte de Comisiones
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Seguimiento de incentivos por ventas comerciales</p>
                </div>
                
                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-end gap-4 mb-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 ml-1">Mes</label>
                        <select 
                            value={month} 
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            {Array.from({length: 12}, (_, i) => (
                                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es', {month: 'long'})}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 ml-1">Año</label>
                        <select 
                            value={year} 
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            {Array.from({length: 5}, (_, i) => {
                                const y = now.getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 ml-1">Personal</label>
                        <select 
                            value={selectedPersonalId} 
                            onChange={(e) => setSelectedPersonalId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="">Todos los personales</option>
                            {personales.map(p => (
                                <option key={p.id} value={p.id}>{p.paterno} {p.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table id="report-table-to-print" className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Personal</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Cant. Ventas</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Total Ventas (Bs.)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Comisión 40% Util. (Bs.)</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest no-print-col">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">Generando reporte...</td>
                            </tr>
                        ) : report.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 italic">No hay ventas registradas en este periodo para el personal seleccionado.</td>
                            </tr>
                        ) : (
                            <>
                                {report.map((row, index) => (
                                    <tr key={row.personalId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                                            <span className="text-gray-400 dark:text-gray-500 font-bold mr-3">{index + 1}</span>
                                            {row.nombre} {row.paterno} {row.materno || ''}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-gray-300">{row.cantidad_ventas}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">{Number(row.total_ventas || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right">
                                            {(() => {
                                                const comisionTotal = Number(row.total_comision || 0);
                                                const pagado = Number(row.total_pagado || 0);
                                                const pendiente = Number(row.total_pendiente !== undefined ? row.total_pendiente : (comisionTotal - pagado));
                                                
                                                return (
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-extrabold ${pendiente > 0.01 ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                            {comisionTotal.toFixed(2)}
                                                        </span>
                                                        {pendiente <= 0.01 && comisionTotal > 0 ? (
                                                            <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pagado
                                                            </span>
                                                        ) : pendiente > 0.01 ? (
                                                            pagado > 0 ? (
                                                                <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Saldo: {pendiente.toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-blue-400 uppercase">Pendiente</span>
                                                            )
                                                        ) : null}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-center no-print-col">
                                            {(() => {
                                                const comisionTotal = Number(row.total_comision || 0);
                                                const pagado = Number(row.total_pagado || 0);
                                                const pendiente = Number(row.total_pendiente !== undefined ? row.total_pendiente : (comisionTotal - pagado));
                                                
                                                return (
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => pendiente > 0.01 && handlePagarComision(row)}
                                                            disabled={pendiente <= 0.01}
                                                            className={`p-2 rounded-lg shadow-md transition-all transform ${
                                                                pendiente > 0.01 
                                                                ? 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 text-white' 
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                                                            }`}
                                                            title={pendiente > 0.01 ? "Pagar Comisión" : "Ya pagado totalmente"}
                                                        >
                                                            <DollarSign size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setViewItem(row);
                                                                setIsDetailModalOpen(true);
                                                            }}
                                                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95"
                                                            title="Ver Detalle de Ventas"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => exportRowToPDF(row)}
                                                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95"
                                                            title="Descargar PDF"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => printRow(row)}
                                                            className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95"
                                                            title="Imprimir Comprobante"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}

                                <tr className="bg-blue-50/30 dark:bg-blue-900/10 font-black">
                                    <td className="px-6 py-4 text-gray-900 dark:text-white uppercase tracking-widest text-xs font-bold">TOTAL GENERAL</td>
                                    <td className="px-6 py-4 text-center text-gray-900 dark:text-white text-sm font-bold">{report.reduce((acc, row) => acc + row.cantidad_ventas, 0)}</td>
                                    <td className="px-6 py-4 text-right text-gray-900 dark:text-white text-sm font-bold">{report.reduce((acc, row) => acc + Number(row.total_ventas), 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right text-blue-700 dark:text-blue-300 text-sm font-bold">
                                        {report.reduce((acc, row) => acc + Number(row.total_comision), 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4"></td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Reporte de Comisiones"
                sections={manualSections}
            />

            {/* Detalle de Ventas Modal */}
            {isDetailModalOpen && viewItem && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setIsDetailModalOpen(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-200 dark:border-gray-700">
                            <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-gray-800">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Eye className="text-blue-600" size={24} />
                                        Detalle de Ventas
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{viewItem.nombre} {viewItem.paterno} {viewItem.materno}</p>
                                </div>
                            </div>

                            <div className="px-6 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <p className="text-xs font-bold text-blue-600/70 dark:text-blue-400/70 uppercase mb-1">Total Ventas</p>
                                        <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{Number(viewItem.total_ventas).toFixed(2)} <span className="text-xs">Bs.</span></p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                        <p className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase mb-1">Comisión Generada</p>
                                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{Number(viewItem.total_comision).toFixed(2)} <span className="text-xs">Bs.</span></p>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                                        <p className="text-xs font-bold text-amber-600/70 dark:text-amber-400/70 uppercase mb-1">Ventas Realizadas</p>
                                        <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{viewItem.cantidad_ventas}</p>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Paciente</th>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Productos</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Venta</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Comisión 40% Util.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                            {viewItem.ventas_detalladas && viewItem.ventas_detalladas.length > 0 ? (
                                                viewItem.ventas_detalladas.map((venta, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                            {new Date(venta.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white uppercase">{venta.paciente || 'Venta Directa'}</td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                                                            <div className="max-w-[200px] truncate" title={venta.productos}>
                                                                {venta.productos}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-right font-medium text-gray-700 dark:text-gray-300">{Number(venta.total).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-xs text-right font-black text-emerald-600 dark:text-emerald-400">{Number(venta.comision).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">No hay detalles disponibles</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end">
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="flex items-center gap-2 px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md"
                                >
                                    <X size={18} />
                                    <span>Cerrar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReporteComisiones;
