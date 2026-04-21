import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Pago } from '../types';
import Pagination from './Pagination';
import jsPDF from 'jspdf';
import { formatDate } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from './ManualModal';

import { useClinica } from '../context/ClinicaContext';
import { DollarSign, Printer } from 'lucide-react';


const PagosList: React.FC = () => {
    const navigate = useNavigate();
    const { clinicaSeleccionada, clinicaActual } = useClinica();
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showManual, setShowManual] = useState(false);
    const itemsPerPage = 10;
    const [userPermisos, setUserPermisos] = useState<string[]>([]);
    const canEditPayments = !userPermisos.includes('editar-pagos');

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Pagos',
            content: 'Registro y control de todos los ingresos por tratamientos realizados a pacientes.'
        },
        {
            title: 'Nuevo Pago',
            content: 'Use el botón azul "+ Nuevo Pago". Debe seleccionar el Paciente y el Plan de Tratamiento asociado.'
        },
        {
            title: 'Formas de Pago',
            content: 'Puede registrar pagos en Efectivo, Tarjeta, QR, Transferencia, Cheque o Depósito. Si es en Dólares, el sistema registra el tipo de cambio.'
        },
        {
            title: 'Recibos y Facturas',
            content: 'Es importante registrar el número de Recibo o Factura para la contabilidad.'
        }];

    useEffect(() => {
        fetchPagos();
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (e) {}
        }
    }, [clinicaSeleccionada]);

    const fetchPagos = async () => {
        try {
            let url = '/pagos';
            if (clinicaSeleccionada) {
                url += `?clinicaId=${clinicaSeleccionada}`;
            }
            const response = await api.get(url);
            console.log('Pagos fetched:', response.data); // DEBUG: Check comisionTarjeta
            setPagos(response.data || []);
        } catch (error) {
            console.error('Error fetching pagos:', error);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Está seguro de eliminar este pago?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos/${id}`);
                fetchPagos();
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'Pago eliminado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error deleting pago:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar el pago'
                });
            }
        }
    };

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
        });
    };

    const generateReciboPDF = async (pago: Pago) => {
        const doc = new jsPDF();
        try {
            const logo = await loadImage('/logo-curare.png');
            doc.addImage(logo, 'PNG', 14, 10, 50, 20);
        } catch (error) {
            console.warn('Could not load logo', error);
        }

        const dateStr = formatDate(pago.fecha);

        // Header
        const pageWidth = doc.internal.pageSize.width;
        doc.setDrawColor(52, 152, 219); // #3498db
        doc.setLineWidth(1);
        doc.line(15, 35, pageWidth - 15, 35);

        doc.setFontSize(10);
        doc.text(dateStr, pageWidth - 15, 25, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80); // #2c3e50
        doc.text('RECIBO DE PAGO', 105, 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Box for Recibo Info
        doc.setDrawColor(200);
        doc.setFillColor(248, 249, 250);
        doc.rect(15, 45, pageWidth - 30, 90, 'F');
        doc.setDrawColor(52, 152, 219); // Blue border
        doc.rect(15, 45, pageWidth - 30, 90, 'S');

        doc.setFontSize(11);
        let y = 60;
        const xLabel = 25;
        const xValue = 75;

        // Recibo #
        doc.setFont('helvetica', 'bold');
        doc.text('Nº Recibo:', xLabel, y);
        doc.setFont('helvetica', 'normal');
        doc.text(pago.recibo || String(pago.id), xValue, y);

        // Factura # (if exists)
        if (pago.factura) {
            doc.setFont('helvetica', 'bold');
            doc.text('Factura:', 120, y);
            doc.setFont('helvetica', 'normal');
            doc.text(pago.factura, 150, y);
        }
        y += 12;

        // Paciente
        doc.setFont('helvetica', 'bold');
        doc.text('Recibí de:', xLabel, y);
        doc.setFont('helvetica', 'normal');
        const pacienteNombre = pago.paciente
            ? `${pago.paciente.paterno} ${pago.paciente.materno} ${pago.paciente.nombre}`
            : 'N/A';
        doc.text(pacienteNombre.toUpperCase(), xValue, y);
        y += 12;

        // Monto
        doc.setFont('helvetica', 'bold');
        doc.text('La suma de:', xLabel, y);
        doc.setFont('helvetica', 'normal');
        const montoStr = pago.moneda === 'Dólares'
            ? `USD ${Number(pago.monto).toFixed(2)}`
            : `Bs ${Number(pago.monto).toFixed(2)}`;
        doc.text(montoStr, xValue, y);
        y += 12;

        // Concepto
        doc.setFont('helvetica', 'bold');
        doc.text('Por concepto de:', xLabel, y);
        doc.setFont('helvetica', 'normal');
        const concepto = pago.proforma
            ? `Tratamiento Odontológico - Plan #${pago.proforma.numero}`
            : 'Tratamiento Odontológico';
        doc.text(concepto, xValue, y);
        y += 12;

        // Forma de Pago
        doc.setFont('helvetica', 'bold');
        doc.text('Forma de Pago:', xLabel, y);
        doc.setFont('helvetica', 'normal');
        let fp = pago.formaPagoRel ? pago.formaPagoRel.forma_pago : pago.formaPago || 'Efectivo';
        if (pago.comisionTarjeta) fp += ` (${pago.comisionTarjeta.redBanco})`;
        doc.text(fp, xValue, y);
        y += 12;

        // Observaciones
        if (pago.observaciones) {
            doc.setFont('helvetica', 'bold');
            doc.text('Observaciones:', xLabel, y);
            doc.setFont('helvetica', 'normal');
            doc.text(pago.observaciones, xValue, y);
        }

        // Signatures
        const pageHeight = doc.internal.pageSize.height;

        doc.setDrawColor(0); // Reset for signatures
        doc.line(30, pageHeight - 50, 90, pageHeight - 50);
        doc.setFontSize(9);
        doc.text('Entregué Conforme', 60, pageHeight - 45, { align: 'center' });

        doc.line(120, pageHeight - 50, 180, pageHeight - 50);
        doc.text('Recibí Conforme', 150, pageHeight - 45, { align: 'center' });
        doc.text(clinicaActual?.nombre || 'CLINICAS LENS', 150, pageHeight - 40, { align: 'center' });

        // Footer
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        doc.setFontSize(8);


        const blobUrl = URL.createObjectURL(doc.output('blob'));
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
            printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
        } else {
            window.open(blobUrl, '_blank');
        }
    };

    const filteredPagos = pagos.filter(pago => {
        const term = searchTerm.toLowerCase();
        const pacienteName = pago.paciente ? `${pago.paciente.paterno} ${pago.paciente.nombre}`.toLowerCase() : '';
        const recibo = pago.recibo?.toLowerCase() || '';
        const factura = pago.factura?.toLowerCase() || '';
        return pacienteName.includes(term) || recibo.includes(term) || factura.includes(term);
    });

    // Reset to first page when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPagos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPagos.length / itemsPerPage);



    return (
        <div className="content-card">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <DollarSign className="text-blue-600" size={32} />
                        Lista de Pagos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Registro y seguimiento de pagos de pacientes</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                    <button
                        onClick={() => navigate('/pacientes')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        title="Seleccione un paciente para registrar un pago"
                    >
                        <DollarSign size={20} /> Registrar Pago (Buscar Paciente)
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por Paciente, Recibo o Factura..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Record Count Indicator */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                Mostrando {filteredPagos.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPagos.length)} de {filteredPagos.length} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plan de Trat.</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Recibo/Factura</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentItems.map((pago) => {
                            const isDollar = pago.moneda === 'Dólares';
                            const displayMonto = isDollar
                                ? `USD ${Number(pago.monto).toFixed(2)} (TC. ${Number(pago.tc).toFixed(2)})`
                                : `Bs ${Number(pago.monto).toFixed(2)}`;

                            const isLocked = userPermisos.includes('cerrar-caja') && clinicaActual?.fecha_cierre_caja && pago.fecha.split('T')[0] <= clinicaActual.fecha_cierre_caja.split('T')[0];

                            return (
                                <tr key={pago.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(pago.fecha)}</td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.paciente ? `${pago.paciente.paterno} ${pago.paciente.materno} ${pago.paciente.nombre}` : '-'}
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">{pago.proforma ? `No. ${pago.proforma.numero}` : '-'}</td>
                                    <td className="p-3 font-bold" style={{ color: isDollar ? '#16a34a' : '#2563eb' }}>{displayMonto}</td>

                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.formaPagoRel ? pago.formaPagoRel.forma_pago : ''}
                                        {pago.formaPagoRel?.forma_pago?.toLowerCase() === 'tarjeta' && pago.comisionTarjeta && ` (${pago.comisionTarjeta.redBanco})`}
                                    </td>
                                    <td className="p-3 text-gray-700 dark:text-gray-300">
                                        {pago.recibo ? `R: ${pago.recibo}` : ''}
                                        {pago.recibo && pago.factura ? ' / ' : ''}
                                        {pago.factura ? `F: ${pago.factura}` : ''}
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            onClick={() => generateReciboPDF(pago)}
                                            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Imprimir Recibo"
                                        >
                                            <Printer size={20} />
                                        </button>
                                        <button
                                            onClick={() => !isLocked && canEditPayments && navigate(`/pagos/edit/${pago.id}`)}
                                            disabled={!!(!canEditPayments || isLocked)}
                                            className={`p-2 rounded-lg shadow-md transition-all transform ${(!canEditPayments || isLocked) ? 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60' : 'bg-amber-400 hover:bg-amber-500 hover:-translate-y-0.5 text-white cursor-pointer'}`}
                                            title={isLocked ? 'Caja Cerrada para esta fecha' : canEditPayments ? 'Editar' : 'Sin permiso para editar pagos'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => !isLocked && canEditPayments && handleDelete(pago.id)}
                                            disabled={!!(!canEditPayments || isLocked)}
                                            className={`p-2 rounded-lg shadow-md transition-all transform ${(!canEditPayments || isLocked) ? 'bg-gray-300 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60' : 'bg-red-500 hover:bg-red-600 hover:-translate-y-0.5 text-white cursor-pointer'}`}
                                            title={isLocked ? 'Caja Cerrada para esta fecha' : canEditPayments ? 'Eliminar' : 'Sin permiso para eliminar pagos'}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {currentItems.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-5 text-center text-gray-500 dark:text-gray-400">
                                    No se encontraron pagos.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />


            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pagos"
                sections={manualSections}
            />
        </div >
    );
};

export default PagosList;
