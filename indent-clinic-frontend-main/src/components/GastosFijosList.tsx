import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { GastoFijo, PagoGastoFijo } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import Swal from 'sweetalert2';
import { useClinica } from '../context/ClinicaContext';
import GastosFijosForm from './GastosFijosForm';
import PagosGastosFijosForm from './PagosGastosFijosForm';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import { FileText, Download, Printer, CreditCard } from 'lucide-react';



const GastosFijosList: React.FC = () => {

    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [gastos, setGastos] = useState<GastoFijo[]>([]);
    const [pagos, setPagos] = useState<PagoGastoFijo[]>([]);
    const [paymentsSearchTerm, setPaymentsSearchTerm] = useState('');
    const [gastosSearchTerm, setGastosSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'gastos' | 'pagos'>('gastos');
    const [isGastoDrawerOpen, setIsGastoDrawerOpen] = useState(false);
    const [selectedGastoId, setSelectedGastoId] = useState<number | string | null>(null);
    const [selectedGastoForPayment, setSelectedGastoForPayment] = useState<GastoFijo | null>(null);
    const [selectedPagoForEdit, setSelectedPagoForEdit] = useState<PagoGastoFijo | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [showPagosPrintModal, setShowPagosPrintModal] = useState(false);
    const [modalMode, setModalMode] = useState<'print' | 'excel' | 'pdf'>('print');
    const [printPeriodo, setPrintPeriodo] = useState<string>('todos');
    const [printPagoGastoFilter, setPrintPagoGastoFilter] = useState<string>('todos');
    const [pagosModalMode, setPagosModalMode] = useState<'print' | 'excel' | 'pdf'>('print');
    const [showManual, setShowManual] = useState(false);
    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Gastos Fijos',
            content: 'Configure los gastos recurrentes de la clínica (alquiler, luz, agua, sueldos, etc.) y registre sus pagos.'
        },
        {
            title: 'Control de Pagos',
            content: 'En la pestaña "Pagos de Gastos", puede ver el historial de todos los pagos realizados, filtrarlos por periodo y exportarlos.'
        }];

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [currentPagosPage, setCurrentPagosPage] = useState(1);
    const itemsPerPage = 10;
    const [userPermisos, setUserPermisos] = useState<string[]>([]);
    const canEditPayments = !userPermisos.includes('editar-pagos');

    const formatNumber = (num: number | string) => {
        return Number(num).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    useEffect(() => {
        fetchGastos();
        fetchPagos();
        injectPrintStyles();
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (e) {}
        }
    }, [clinicaSeleccionada]);

    const fetchGastos = async () => {
        try {
            const url = clinicaSeleccionada ? `/gastos-fijos?clinicaId=${clinicaSeleccionada}` : '/gastos-fijos';
            const response = await api.get(url);
            console.log('Gastos Fijos fetched:', response.data);
            setGastos(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching gastos fijos:', error);
            setGastos([]);
        }
    };

    const fetchPagos = async () => {
        try {
            const url = clinicaSeleccionada ? `/pagos-gastos-fijos?clinicaId=${clinicaSeleccionada}` : '/pagos-gastos-fijos';
            const response = await api.get(url);
            console.log('Pagos fetched:', response.data);
            setPagos(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching pagos gastos fijos:', error);
            setPagos([]);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja gasto fijo?',
            text: 'El gasto pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/gastos-fijos/${id}`, { estado: 'inactivo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Gasto dado de baja!',
                    text: 'El estado del gasto ha sido cambiado a Inactivo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchGastos();
            } catch (error) {
                console.error('Error al dar de baja gasto:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo dar de baja el gasto'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar gasto fijo?',
            text: 'El gasto volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/gastos-fijos/${id}`, { estado: 'activo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Gasto reactivado!',
                    text: 'El estado del gasto ha sido cambiado a Activo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchGastos();
            } catch (error) {
                console.error('Error al reactivar gasto:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el gasto'
                });
            }
        }
    };


    const handlePaymentsSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentsSearchTerm(e.target.value);
        setCurrentPagosPage(1); // Reset to first page
    };

    const filteredGastos = gastos
        .filter(gasto => {
            const name = gasto.gasto_fijo?.toLowerCase() || '';
            const search = gastosSearchTerm.toLowerCase();
            return name.includes(search);
        })
        .sort((a, b) => a.dia - b.dia);
    const totalsByCurrency = filteredGastos.reduce((acc, g) => {
        const currency = g.moneda || 'Bs';
        const monto = Number(g.monto) || 0;

        if (!acc[currency]) {
            acc[currency] = 0;
        }

        acc[currency] += monto;

        return acc;
    }, {} as Record<string, number>);

    // Pagination Logic Gastos
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentGastos = filteredGastos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredGastos.length / itemsPerPage);
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const filteredPagos = pagos.filter(pago => {
        const gastoName = pago.gastoFijo?.gasto_fijo?.toLowerCase() || '';
        const fecha = pago.fecha?.toLowerCase() || '';
        const obs = pago.observaciones?.toLowerCase() || '';
        const search = paymentsSearchTerm.toLowerCase();
        return gastoName.includes(search) || fecha.includes(search) || obs.includes(search);
    });

    // Pagination Logic Pagos
    const indexOfLastPago = currentPagosPage * itemsPerPage;
    const indexOfFirstPago = indexOfLastPago - itemsPerPage;
    const currentPagos = filteredPagos.slice(indexOfFirstPago, indexOfLastPago);

    // --- Exports for Gastos Fijos ---
    const exportGastosToExcel = (data: GastoFijo[]) => {
        try {
            const excelData = data.map(gasto => ({

                'Día': gasto.dia,
                'Tipo': gasto.anual ? `Anual (${gasto.mes || '-'})` : 'Mensual',
                'Gasto Fijo': gasto.gasto_fijo,
                'Monto': Number(gasto.monto),
                'Moneda': gasto.moneda,
                'Estado': gasto.estado || 'activo'
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Gastos Fijos');
            const date = getLocalDateString();
            XLSX.writeFile(wb, `gastos_fijos_${date}.xlsx`);
        } catch (error) {
            console.error('Error exporting Gastos to Excel:', error);
            alert('Error al exportar Gastos a Excel');
        }
    };

    const exportGastosToPDF = async (data: GastoFijo[]) => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            
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

            // Title next to logo
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80); // #2c3e50
            doc.text('LISTA DE GASTOS FIJOS', 60, 20);

            // Blue line under header
            doc.setDrawColor(52, 152, 219); // #3498db
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            if (printPeriodo !== 'todos') {
                doc.text(`Periodo: ${printPeriodo.toUpperCase()}`, 15, 35);
            }

            const tableData = data.map(gasto => [
                gasto.dia ? String(gasto.dia) : '',
                gasto.anual ? `Anual (${gasto.mes || '-'})` : 'Mensual',
                gasto.gasto_fijo || '',
                formatNumber(gasto.monto),
                gasto.moneda || '',
                gasto.estado || 'activo'
            ]);

            autoTable(doc, {
                head: [['Día', 'Tipo', 'Gasto Fijo', 'Monto', 'Moneda', 'Estado']],
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

            // Calculate Totals
            const totals = data.reduce((acc, g) => {
                const currency = g.moneda || 'Bs';
                if (!acc[currency]) acc[currency] = 0;
                acc[currency] += Number(g.monto);
                return acc;
            }, {} as Record<string, number>);

            let currentY = (doc as any).lastAutoTable.finalY + 10;
            const startXTotal = pageWidth - 80;

            Object.entries(totals).forEach(([curr, amount]) => {
                const safeAmount = amount as number;
                if (currentY + 25 > doc.internal.pageSize.height) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFillColor(248, 249, 250);
                doc.setDrawColor(221, 221, 221);
                doc.rect(startXTotal, currentY, 66, 15, 'FD');

                doc.setFontSize(8);
                doc.setTextColor(127, 140, 141);
                doc.text(`TOTAL ${curr.toUpperCase()}`, startXTotal + 33, currentY + 5, { align: 'center' });

                doc.setFontSize(12);
                doc.setTextColor(44, 62, 80);
                doc.setFont('helvetica', 'bold');
                doc.text(formatNumber(safeAmount), startXTotal + 33, currentY + 12, { align: 'center' });

                currentY += 20;
            });

            const timestamp = getLocalDateString().replace(/-/g, '');
            doc.save(`gastos_fijos_${timestamp}.pdf`);
        } catch (error) {
            console.error('Error exporting Gastos to PDF:', error);
            alert('Error al exportar a PDF');
        }
    };

    // --- Exports for Pagos ---
    const exportPagosToExcel = () => {
        try {
            const excelData = filteredPagos.map(pago => ({
                'Fecha': pago.fecha,
                'Gasto Fijo': pago.gastoFijo?.gasto_fijo || 'N/A',
                'Monto': pago.monto,
                'Moneda': pago.moneda,
                'Forma Pago': pago.formaPago?.forma_pago || 'N/A',
                'Observaciones': pago.observaciones
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Pagos Realizados');
            const date = getLocalDateString();
            XLSX.writeFile(wb, `historial_pagos_${date}.xlsx`);
        } catch (error) {
            console.error('Error exporting Pagos to Excel:', error);
            alert('Error al exportar Pagos a Excel');
        }
    };

    const generatePagosPDF = async (data: PagoGastoFijo[], action: 'save' | 'print' = 'save') => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            
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

            // Title next to logo
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80); // #2c3e50
            doc.text('HISTORIAL DE PAGOS', 60, 20);

            // Blue line under header
            doc.setDrawColor(52, 152, 219); // #3498db
            doc.setLineWidth(0.5);
            doc.line(15, 28, pageWidth - 15, 28);

            if (printPagoGastoFilter !== 'todos') {
                doc.text(`Gasto Fijo: ${printPagoGastoFilter.toUpperCase()}`, 15, 35);
            }

            const tableData = data.map(pago => [
                formatDate(pago.fecha),
                pago.gastoFijo?.gasto_fijo || 'N/A',
                `${formatNumber(pago.monto)} ${pago.moneda === 'Bolivianos' ? 'Bs' : '$us'}`,
                pago.formaPago?.forma_pago || 'N/A',
                pago.observaciones || ''
            ]);

            autoTable(doc, {
                head: [['Fecha', 'Gasto Fijo', 'Monto', 'Forma Pago', 'Observaciones']],
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

            // Totals
            const totals = data.reduce((acc, p) => {
                const currency = p.moneda || 'Bs';
                if (!acc[currency]) acc[currency] = 0;
                acc[currency] += Number(p.monto);
                return acc;
            }, {} as Record<string, number>);

            let currentY = (doc as any).lastAutoTable.finalY + 10;
            const startXTotal = pageWidth - 80;

            Object.entries(totals).forEach(([curr, amount]) => {
                const safeAmount = amount as number;
                if (currentY + 25 > doc.internal.pageSize.height) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFillColor(248, 249, 250);
                doc.setDrawColor(221, 221, 221);
                doc.rect(startXTotal, currentY, 66, 15, 'FD');

                doc.setFontSize(8);
                doc.setTextColor(127, 140, 141);
                doc.text(`TOTAL ${curr.toUpperCase()}`, startXTotal + 33, currentY + 5, { align: 'center' });

                doc.setFontSize(12);
                doc.setTextColor(44, 62, 80);
                doc.setFont('helvetica', 'bold');
                doc.text(formatNumber(safeAmount), startXTotal + 33, currentY + 12, { align: 'center' });
                currentY += 20;
            });

            if (action === 'save') {
                const timestamp = getLocalDateString().replace(/-/g, '');
                doc.save(`historial_pagos_${timestamp}.pdf`);
            } else {
                const blobUrl = URL.createObjectURL(doc.output('blob'));
                const printWindow = window.open(blobUrl, '_blank');
                if (printWindow) {
                    printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
                } else {
                    window.open(blobUrl, '_blank');
                }
            }
        } catch (error) {
            console.error('Error exporting Pagos PDF:', error);
            alert('Error al generar PDF de Pagos');
        }
    };

    const handlePrintRecibo = async (pago: PagoGastoFijo) => {
        try {
            const doc = new jsPDF();
            
            let logoBase64 = '';
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
                const canvas = document.createElement('canvas');
                canvas.width = logo.width;
                canvas.height = logo.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(logo, 0, 0);
                logoBase64 = canvas.toDataURL('image/png');
            } catch (error) {
                console.warn('Could not load logo for receipt', error);
            }

            const drawReceipt = (startY: number, title: string) => {
                // Border for the receipt
                doc.setDrawColor(200);
                doc.rect(10, startY, 190, 135);

                if (logoBase64) {
                    doc.addImage(logoBase64, 'PNG', 15, startY + 5, 40, 16);
                }

                // Header without background
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('RECIBO DE PAGO', 105, startY + 15, { align: 'center' });

                doc.setFontSize(14);
                doc.setTextColor(100);
                doc.text(title, 190, startY + 15, { align: 'right' }); // ORIGINAL / COPIA

                // Info Container
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');

                const contentStartY = startY + 40;
                const lineHeight = 10;

                // Data
                doc.setFont('helvetica', 'bold');
                doc.text('Fecha de Pago:', 20, contentStartY);
                doc.setFont('helvetica', 'normal');
                doc.text(formatDate(pago.fecha), 70, contentStartY);

                doc.setFont('helvetica', 'bold');
                doc.text('Concepto:', 20, contentStartY + lineHeight);
                doc.setFont('helvetica', 'normal');
                doc.text(pago.gastoFijo?.gasto_fijo || 'N/A', 70, contentStartY + lineHeight);

                doc.setFont('helvetica', 'bold');
                doc.text('Monto:', 20, contentStartY + lineHeight * 3);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(14);
                doc.text(`${formatNumber(pago.monto)} ${pago.moneda}`, 70, contentStartY + lineHeight * 3);
                doc.setFontSize(12);

                doc.setFont('helvetica', 'bold');
                doc.text('Forma de Pago:', 20, contentStartY + lineHeight * 4);
                doc.setFont('helvetica', 'normal');
                doc.text(pago.formaPago?.forma_pago || 'N/A', 70, contentStartY + lineHeight * 4);

                if (pago.observaciones) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Observaciones:', 20, contentStartY + lineHeight * 5);
                    doc.setFont('helvetica', 'normal');
                    const splitObs = doc.splitTextToSize(pago.observaciones, 110);
                    doc.text(splitObs, 70, contentStartY + lineHeight * 5);
                }

                // Footer / Signature Area
                doc.setDrawColor(150);
                const sigY = startY + 115;
                doc.line(25, sigY, 85, sigY);
                doc.line(125, sigY, 185, sigY);

                doc.setFontSize(10);
                doc.text('Firma Responsable', 55, sigY + 5, { align: 'center' });
                doc.text('Firma Receptor', 155, sigY + 5, { align: 'center' });
            };

            // Draw Original (Top half)
            drawReceipt(10, 'ORIGINAL');

            // Cutting line
            doc.setDrawColor(200);
            (doc as any).setLineDash([5, 5], 0);
            doc.line(0, 148, 210, 148);
            (doc as any).setLineDash([], 0); // Reset dash

            // Draw Copy (Bottom half)
            drawReceipt(158, 'COPIA');

            const blobUrl = URL.createObjectURL(doc.output('blob'));
            const printWindow = window.open(blobUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
            } else {
                window.open(blobUrl, '_blank');
            }
        } catch (error) {
            console.error('Error creating receipt:', error);
            alert('Error al generar el recibo');
        }
    };
    const handleDeletePago = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción eliminará permanentemente el registro del pago.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos-gastos-fijos/${id}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'El pago ha sido eliminado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchPagos();
                fetchGastos(); // Update totals
            } catch (error: any) {
                console.error('Error al eliminar pago:', error);
                Swal.fire('Error', 'No se pudo eliminar el pago', 'error');
            }
        }
    };

    const handleOpenPrintModal = (mode: 'print' | 'excel' | 'pdf' = 'print') => {
        setModalMode(mode);
        setShowPagosPrintModal(true);
        setPrintPeriodo('todos');
    };

    const handleConfirmPrint = async () => {
        try {
            // Filter data based on modal selection
            let dataToPrint = [...filteredGastos];

            if (printPeriodo !== 'todos') {
                const isAnual = printPeriodo === 'anual';
                dataToPrint = dataToPrint.filter(g =>
                    isAnual ? g.anual : !g.anual
                );
            }

            if (dataToPrint.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin datos',
                    text: 'No hay gastos para exportar/imprimir con los filtros seleccionados',
                    confirmButtonColor: '#3498db'
                });
                return;
            }

            if (modalMode === 'excel') {
                exportGastosToExcel(dataToPrint);
                setShowPagosPrintModal(false);
                return;
            }

            if (modalMode === 'pdf') {
                await exportGastosToPDF(dataToPrint);
                setShowPagosPrintModal(false);
                return;
            }

            // Print Logic

            // Calculate totals for the report
            const totals = dataToPrint.reduce((acc, g) => {
                const currency = g.moneda || 'Bs';
                if (!acc[currency]) acc[currency] = 0;
                acc[currency] += Number(g.monto);
                return acc;
            }, {} as Record<string, number>);

            const filtrosTexto = [];
            if (printPeriodo !== 'todos') filtrosTexto.push(`Periodo: ${printPeriodo.charAt(0).toUpperCase() + printPeriodo.slice(1)}`);
            
            const logoUrl = clinicaActual?.logo || '/logo-curare.png';

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reporte de Gastos Fijos</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        @page { size: A4; margin: 1.5cm; }
                        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                        
                        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                        .header-info { text-align: right; }
                        .header img { height: 50px; object-fit: contain; }
                        
                        .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; font-weight: 500; }
                        
                        .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                        .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                        
                        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                        th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
                        td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                        tr:last-child td { border-bottom: none; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        
                        .amount { font-weight: 700; color: #1e293b; text-align: right; }
                        .status { font-weight: 600; text-transform: capitalize; font-size: 11px; padding: 2px 8px; border-radius: 12px; display: inline-block; }
                        .status-activo { background: #dcfce7; color: #166534; }
                        .status-inactivo { background: #fee2e2; color: #991b1b; }
                        
                        .totals-container { display: flex; gap: 16px; justify-content: flex-end; margin-top: 32px; flex-wrap: wrap; }
                        .total-card { background: #ffffff; padding: 16px 24px; border-radius: 12px; border: 2px solid #3b82f6; text-align: center; min-width: 140px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                        .total-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 4px; display: block; }
                        .total-amount { font-size: 20px; font-weight: 800; color: #1e293b; }
                        
                        .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }

                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .header { border-bottom-color: #3b82f6 !important; }
                            th { background-color: #3b82f6 !important; color: white !important; }
                            .total-card { border-color: #3b82f6 !important; }
                            .status-activo { background: #dcfce7 !important; color: #166534 !important; }
                            .status-inactivo { background: #fee2e2 !important; color: #991b1b !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title-container">
                            <img src="${logoUrl}" alt="Logo">
                            <h1>Reporte de Gastos Fijos</h1>
                        </div>
                        <div class="header-info">
                            <div style="font-weight: 700; color: #3b82f6;"></div>
                        </div>
                    </div>

                    <div class="report-info">
                        <div>Periodo: <span class="filter-badge">${printPeriodo === 'todos' ? 'Todos' : printPeriodo.toUpperCase()}</span></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 60px;">Día</th>
                                <th style="width: 120px;">Tipo</th>
                                <th>Concepto</th>
                                <th style="text-align: right;">Monto</th>
                                <th style="width: 80px;">Moneda</th>
                                <th style="width: 100px;">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataToPrint.map(g => `
                                <tr>
                                    <td>${g.dia || '-'}</td>
                                    <td>${g.anual ? `Anual (${g.mes || '-'})` : 'Mensual'}</td>
                                    <td>${g.gasto_fijo}</td>
                                    <td class="amount">${formatNumber(g.monto)}</td>
                                    <td>${g.moneda}</td>
                                    <td>
                                        <span class="status status-${(g.estado || 'activo').toLowerCase()}">
                                            ${g.estado || 'Activo'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals-container">
                        ${Object.entries(totals).map(([curr, amount]) => `
                            <div class="total-card">
                                <span class="total-label">Total ${curr}</span>
                                <span class="total-amount">${formatNumber(amount)}</span>
                            </div>
                        `).join('')}
                    </div>

                </body>
                </html>
            `;

            // Use hidden iframe for printing
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

            setShowPagosPrintModal(false);
        } catch (error) {
            console.error('Error al imprimir:', error);
            Swal.fire('Error', 'No se pudo generar el documento', 'error');
        }
    };

    const handleOpenPagosPrintModal = (mode: 'print' | 'excel' | 'pdf' = 'print') => {
        setPagosModalMode(mode);
        setPrintPagoGastoFilter('todos');
        setShowPagosPrintModal(true);
    };

    const handlePrintPagosHTML = (data: PagoGastoFijo[]) => {
        try {
            const totals = data.reduce((acc, p) => {
                const currency = p.moneda || 'Bs';
                if (!acc[currency]) acc[currency] = 0;
                acc[currency] += Number(p.monto);
                return acc;
            }, {} as Record<string, number>);

            const logoUrl = clinicaActual?.logo || '/logo-curare.png';
            const filterText = printPagoGastoFilter !== 'todos' ? `Gasto Fijo: ${printPagoGastoFilter.toUpperCase()}` : 'Reporte General de Pagos';

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Historial de Pagos</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        @page { size: A4; margin: 1.5cm; }
                        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; background: white; line-height: 1.5; }
                        
                        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 25px; }
                        .header-info { text-align: right; }
                        .header img { height: 50px; object-fit: contain; }
                        
                        .title-container h1 { color: #1e293b; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; }
                        .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; font-weight: 500; }
                        
                        .report-info { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; }
                        .filter-badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px; }
                        
                        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
                        th { background-color: #3b82f6; color: white; padding: 12px 10px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
                        td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                        tr:last-child td { border-bottom: none; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        
                        .amount { font-weight: 700; color: #1e293b; text-align: right; }
                        
                        .totals-container { display: flex; gap: 16px; justify-content: flex-end; margin-top: 32px; flex-wrap: wrap; }
                        .total-card { background: #ffffff; padding: 16px 24px; border-radius: 12px; border: 2px solid #3b82f6; text-align: center; min-width: 140px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                        .total-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 4px; display: block; }
                        .total-amount { font-size: 18px; font-weight: 800; color: #1e293b; }
                        
                        .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }

                        @media print {
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            th { background-color: #3b82f6 !important; color: white !important; }
                            .total-card { border-color: #3b82f6 !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title-container">
                            <img src="${logoUrl}" alt="Logo">
                            <h1>Historial de Pagos</h1>
                        </div>
                        <div class="header-info">
                            <div style="font-weight: 700; color: #3b82f6;"></div>
                        </div>
                    </div>

                    <div class="report-info">
                        <div>Filtro: <span class="filter-badge">${filterText}</span></div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 100px;">Fecha</th>
                                <th>Gasto Fijo</th>
                                <th style="text-align: right;">Monto</th>
                                <th style="width: 100px;">Forma Pago</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(p => `
                                <tr>
                                    <td>${formatDate(p.fecha)}</td>
                                    <td style="font-weight: 600;">${p.gastoFijo?.gasto_fijo || 'N/A'}</td>
                                    <td class="amount">${formatNumber(p.monto)} ${p.moneda === 'Bolivianos' ? 'Bs' : '$us'}</td>
                                    <td>${p.formaPago?.forma_pago || 'N/A'}</td>
                                    <td style="font-size: 10px;">${p.observaciones || ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals-container">
                        ${Object.entries(totals).map(([curr, amount]) => `
                            <div class="total-card">
                                <span class="total-label">Total ${curr}</span>
                                <span class="total-amount">${formatNumber(amount)}</span>
                            </div>
                        `).join('')}
                    </div>

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

        } catch (error) {
            console.error('Error al imprimir pagos:', error);
            Swal.fire('Error', 'No se pudo generar el documento de pagos', 'error');
        }
    };

    const handleConfirmPagosPrint = async () => {
        let dataToPrint = [...filteredPagos];
        if (printPagoGastoFilter !== 'todos') {
            dataToPrint = dataToPrint.filter(p => p.gastoFijo?.gasto_fijo === printPagoGastoFilter);
        }

        if (dataToPrint.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin datos',
                text: 'No hay pagos con los filtros seleccionados',
                confirmButtonColor: '#3498db'
            });
            return;
        }

        if (pagosModalMode === 'excel') {
            exportPagosToExcel();
            setShowPagosPrintModal(false);
            return;
        }

        if (pagosModalMode === 'pdf') {
            await generatePagosPDF(dataToPrint, 'save');
        } else {
            handlePrintPagosHTML(dataToPrint);
        }
        setShowPagosPrintModal(false);
    };

    const injectPrintStyles = () => {
        const styleId = 'gastos-print-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                @media print {
                    .no-print { display: none !important; }
                    body { background-color: white !important; }
                    .print-container { padding: 0 !important; box-shadow: none !important; border: none !important; }
                    table { width: 100% !important; border-collapse: collapse !important; }
                    th, td { border: 1px solid #000 !important; color: black !important; padding: 8px !important; }
                    th { background-color: #f0f0f0 !important; font-weight: bold !important; -webkit-print-color-adjust: exact; }
                }
            `;
            document.head.appendChild(style);
        }
    };

    const tabStyle = (tab: 'gastos' | 'pagos') => {
        const isActive = activeTab === tab;
        return {
            cursor: 'pointer',
            borderBottom: isActive ? '3px solid #3498db' : '3px solid transparent',

            fontWeight: isActive ? 'bold' : 'normal' as 'bold' | 'normal',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            padding: '10px 20px',
        };
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            {/* Header and Tabs */}
            {/* New Tabs Navigation matching HistoriaClinica */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5 bg-white dark:bg-gray-800 rounded-t-lg p-2.5 no-print">
                <div
                    onClick={() => setActiveTab('gastos')}
                    style={tabStyle('gastos')}
                    className={`${activeTab === 'gastos' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} px-4 py-2 flex items-center gap-2 transition-colors`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    GASTOS FIJOS
                </div>
                <div
                    onClick={() => setActiveTab('pagos')}
                    style={tabStyle('pagos')}
                    className={`${activeTab === 'pagos' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} px-4 py-2 flex items-center gap-2 transition-colors`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    HISTORIAL DE PAGOS
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'gastos' && (
                <>
                    {/* Header - Extracted OUTSIDE the toolbar */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                    <CreditCard className="text-blue-600" size={32} />
                                    Gestión de Gastos Fijos
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Administración de pagos recurrentes y servicios</p>
                            </div>
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
                            onClick={() => handleOpenPrintModal('excel')}
                            className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a Excel"
                        >
                            <FileText size={18} />
                            <span className="text-sm">Excel</span>
                        </button>
                        <button
                            onClick={() => handleOpenPrintModal('pdf')}
                            className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a PDF"
                        >
                            <Download size={18} />
                            <span className="text-sm">PDF</span>
                        </button>
                        <button
                            onClick={() => handleOpenPrintModal('print')}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                    <button
                        onClick={() => { setSelectedGastoId(null); setIsGastoDrawerOpen(true); }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Gasto
                    </button>
                </div>
                    </div>

                    {/* Search Bar for Gastos Fijos */}
                    <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                        <div className="flex gap-2 flex-grow max-w-md">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    placeholder="Buscar por gasto..."
                                    value={gastosSearchTerm}
                                    onChange={(e) => { setGastosSearchTerm(e.target.value); setCurrentPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                            {gastosSearchTerm && (
                                <button
                                    onClick={() => { setGastosSearchTerm(''); setCurrentPage(1); }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium no-print">
                        Mostrando {filteredGastos.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredGastos.length)} de {filteredGastos.length} registros
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 print-container">
                        <div className="hidden print:block text-center mb-6 mt-4">
                            <h1 className="text-2xl font-bold text-gray-800">Lista de Gastos Fijos</h1>

                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Día</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Anual/Mes</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gasto Fijo</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moneda</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {currentGastos.map((gasto, index) => (
                                        <tr key={gasto.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'} hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150`}>
                                            <td className="px-6 py-4 text-gray-400 dark:text-gray-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>

                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{gasto.dia}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                {gasto.anual ? (
                                                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                        Anual ({gasto.mes})
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                        Mensual
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{gasto.gasto_fijo}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatNumber(gasto.monto)}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{gasto.moneda}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-sm ${(gasto.estado === 'activo' || !gasto.estado)
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                    }`}>
                                                    {gasto.estado || 'activo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-2">
                                                    {(gasto.estado === 'activo' || !gasto.estado) && (
                                                        <button
                                                            onClick={() => { setSelectedGastoForPayment(gasto); setIsPaymentModalOpen(true); }}
                                                            className="bg-green-600 hover:bg-green-700 text-white font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                                            title="Pagar"
                                                        >
                                                            <CreditCard size={20} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setSelectedGastoId(gasto.id); setIsGastoDrawerOpen(true); }}
                                                        className="bg-amber-400 hover:bg-amber-500 text-white font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                                        title="Editar"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                        </svg>
                                                    </button>
                                                    {(gasto.estado === 'activo' || !gasto.estado) ? (
                                                        <button
                                                            onClick={() => handleDelete(gasto.id)}
                                                            className="bg-red-500 hover:bg-red-600 text-white font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                                            title="Dar de baja"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleReactivate(gasto.id)}
                                                            className="bg-green-600 hover:bg-green-700 text-white font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
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
                                    {filteredGastos.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-6 text-center text-gray-400 dark:text-gray-500">
                                                No se encontraron gastos fijos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>


                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="no-print">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={paginate}
                            />
                        </div>
                    )}

                    {/* Totals Summary Section (Moved below pagination) */}
                    {Object.keys(totalsByCurrency).length > 0 && (
                        <div className="mt-6 flex flex-col gap-6 no-print">
                            {Object.entries(totalsByCurrency).map(([currency, data]) => (
                                <div key={currency} className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-4 w-1 bg-blue-500 rounded-full"></div>
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Resumen en {currency}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Gastos ({currency})</span>
                                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatNumber(data)} {currency}</span>
                                        </div>
                                        <div className="bg-[#1e293b] dark:bg-slate-700 p-4 rounded-xl shadow-md flex flex-col items-center justify-center transform hover:scale-105 transition-all duration-300">
                                            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Gran Total {currency}</span>
                                            <span className="text-xl font-bold text-white tracking-tight">{formatNumber(data)} {currency}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Pagos Tab Content */}
            {activeTab === 'pagos' && (
                <>
                    {/* Header for Pagos Tab */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                        <div className="flex items-center gap-4">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                    <FileText className="text-blue-600" size={32} />
                                    Historial de Pagos de Gastos Fijos
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Registro detallado de todos los pagos realizados por concepto de gastos fijos</p>
                            </div>
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
                                    onClick={() => handleOpenPagosPrintModal('excel')}
                                    className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                                    title="Exportar a Excel"
                                >
                                    <FileText size={18} />
                                    <span className="text-sm">Excel</span>
                                </button>
                                <button
                                    onClick={() => handleOpenPagosPrintModal('pdf')}
                                    className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                                    title="Exportar a PDF"
                                >
                                    <Download size={18} />
                                    <span className="text-sm">PDF</span>
                                </button>
                                <button
                                    onClick={() => handleOpenPagosPrintModal('print')}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                                    title="Imprimir"
                                >
                                    <Printer size={18} />
                                    <span className="text-sm">Imprimir</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar Container */}
                    <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600 no-print">
                        <div className="flex gap-2 flex-grow max-w-md">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    placeholder="Buscar por gasto, fecha, observación..."
                                    value={paymentsSearchTerm}
                                    onChange={handlePaymentsSearch}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                            {paymentsSearchTerm && (
                                <button
                                    onClick={() => { setPaymentsSearchTerm(''); setCurrentPagosPage(1); }}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium no-print">
                        Mostrando {filteredPagos.length === 0 ? 0 : (currentPagosPage - 1) * itemsPerPage + 1} - {Math.min(currentPagosPage * itemsPerPage, filteredPagos.length)} de {filteredPagos.length} registros
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 print-container">
                        <div className="hidden print:block text-center mb-6 mt-4">
                            <h1 className="text-2xl font-bold text-gray-800">Historial de Pagos Realizados</h1>

                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gasto Fijo</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moneda</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Observaciones</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                     {currentPagos.map((pago, index) => {
                                        const isLocked = userPermisos.includes('cerrar-caja') && clinicaActual?.fecha_cierre_caja && pago.fecha?.split('T')[0] <= clinicaActual.fecha_cierre_caja.split('T')[0];

                                        return (
                                            <tr key={pago.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'} hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150`}>
                                                <td className="px-6 py-4 text-gray-400 dark:text-gray-500 font-medium">{(currentPagosPage - 1) * itemsPerPage + index + 1}</td>
                                                <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{formatDate(pago.fecha)}</td>
                                                <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                                                    {pago.gastoFijo?.gasto_fijo || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{formatNumber(pago.monto)}</td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pago.moneda}</td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pago.formaPago?.forma_pago || 'N/A'}</td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm max-w-xs truncate">{pago.observaciones}</td>
                                                <td className="px-6 py-4 text-center no-print">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handlePrintRecibo(pago)}
                                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                                            title="Imprimir"
                                                        >
                                                            <Printer size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => canEditPayments && !isLocked && (setSelectedPagoForEdit(pago), setIsPaymentModalOpen(true))}
                                                            disabled={!canEditPayments || !!isLocked}
                                                            className={`font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform ${canEditPayments && !isLocked ? 'bg-amber-400 hover:bg-amber-500 hover:-translate-y-0.5 text-white cursor-pointer' : 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'}`}
                                                            title={isLocked ? 'Caja Cerrada' : canEditPayments ? 'Editar Pago' : 'Sin permiso para editar pagos'}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => !isLocked && handleDeletePago(pago.id)}
                                                            disabled={!!isLocked}
                                                            className={`font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform ${isLocked ? 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60' : 'bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 text-white cursor-pointer'}`}
                                                            title={isLocked ? 'Caja Cerrada' : 'Eliminar Pago'}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
            {/* Pagos Print Modal */}
            {showPagosPrintModal && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowPagosPrintModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${pagosModalMode === 'excel' ? 'bg-green-100 text-green-600' : pagosModalMode === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {pagosModalMode === 'excel' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                        {pagosModalMode === 'pdf' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                        {pagosModalMode === 'print' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                            {activeTab === 'gastos' ? (modalMode === 'excel' ? 'Exportar a Excel' : modalMode === 'pdf' ? 'Exportar a PDF' : 'Imprimir') : (pagosModalMode === 'excel' ? 'Exportar a Excel' : pagosModalMode === 'pdf' ? 'Exportar a PDF' : 'Imprimir')} {activeTab === 'gastos' ? 'Gastos Fijos' : 'Historial de Pagos'}
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Seleccione los filtros para su reporte:
                                            </p>
                                            <div className="grid gap-4">
                                                {activeTab === 'gastos' ? (
                                                    <div>
                                                        <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Filtrar por Periodo
                                                        </label>
                                                        <div className="relative rounded-md shadow-sm">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                            <select
                                                                id="periodo"
                                                                value={printPeriodo}
                                                                onChange={(e) => setPrintPeriodo(e.target.value)}
                                                                className="block w-full pl-10 pr-10 py-2 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            >
                                                                <option value="todos">Todos los periodos</option>
                                                                <option value="mensual">Mensual</option>
                                                                <option value="anual">Anual</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label htmlFor="pagoGasto" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Filtrar por Gasto Fijo
                                                        </label>
                                                        <div className="relative rounded-md shadow-sm">
                                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 11v1m0-2c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                            <select
                                                                id="pagoGasto"
                                                                value={printPagoGastoFilter}
                                                                onChange={(e) => setPrintPagoGastoFilter(e.target.value)}
                                                                className="block w-full pl-10 pr-10 py-2 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                            >
                                                                <option value="todos">Todos los gastos</option>
                                                                {gastos.filter(g => (g.estado === 'activo' || !g.estado)).map(g => (
                                                                    <option key={g.id} value={g.gasto_fijo}>{g.gasto_fijo}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                                <button
                                    type="button"
                                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${(activeTab === 'gastos' ? modalMode : pagosModalMode) === 'excel' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                                        (activeTab === 'gastos' ? modalMode : pagosModalMode) === 'pdf' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                                            'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                        }`}
                                    onClick={activeTab === 'gastos' ? handleConfirmPrint : handleConfirmPagosPrint}
                                >
                                    {(activeTab === 'gastos' ? modalMode : pagosModalMode) === 'excel' ? 'Exportar Excel' : (activeTab === 'gastos' ? modalMode : pagosModalMode) === 'pdf' ? 'Exportar PDF' : 'Imprimir'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowPagosPrintModal(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <GastosFijosForm
                isOpen={isGastoDrawerOpen}
                onClose={() => setIsGastoDrawerOpen(false)}
                id={selectedGastoId}
                    onSaveSuccess={() => {
                        fetchGastos();
                        fetchPagos();
                        setIsGastoDrawerOpen(false);
                    }}
                />
                {isPaymentModalOpen && (selectedGastoForPayment || selectedPagoForEdit) && (
                    <div className="fixed inset-0 z-[10000] overflow-y-auto flex items-center justify-center p-4 bg-black/50">
                        <PagosGastosFijosForm
                            gastoFijo={selectedGastoForPayment || selectedPagoForEdit?.gastoFijo!}
                            existingPayment={selectedPagoForEdit}
                            onClose={() => {
                                setIsPaymentModalOpen(false);
                                setSelectedGastoForPayment(null);
                                setSelectedPagoForEdit(null);
                            }}
                            onSave={() => {
                                fetchPagos();
                                fetchGastos();
                                setIsPaymentModalOpen(false);
                                setSelectedGastoForPayment(null);
                                setSelectedPagoForEdit(null);
                            }}
                        />
                    </div>
                )}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Gastos Fijos"
                sections={manualSections}
            />
        </div>
    );
};

export default GastosFijosList;
