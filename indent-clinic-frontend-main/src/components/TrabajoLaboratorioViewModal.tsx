import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { TrabajoLaboratorio, SeguimientoTrabajo } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Printer, X } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';


interface Props {
    isOpen: boolean;
    onClose: () => void;
    trabajoId: number | null;
}

const TrabajoLaboratorioViewModal: React.FC<Props> = ({ isOpen, onClose, trabajoId }) => {
    const [history, setHistory] = useState<SeguimientoTrabajo[]>([]);
    const [trabajo, setTrabajo] = useState<TrabajoLaboratorio | null>(null);
    const [loading, setLoading] = useState(false);
    const { clinicaActual } = useClinica();

    useEffect(() => {
        if (isOpen && trabajoId) {
            fetchData(trabajoId);
        } else {
            setHistory([]);
            setTrabajo(null);
        }
    }, [isOpen, trabajoId]);

    const fetchData = async (id: number) => {
        try {
            setLoading(true);
            const [historyRes, workRes] = await Promise.all([
                api.get<SeguimientoTrabajo[]>(`/seguimiento-trabajo?trabajoId=${id}`),
                api.get<TrabajoLaboratorio>(`/trabajos-laboratorios/${id}`)
            ]);
            setHistory(historyRes.data);
            setTrabajo(workRes.data);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handlePrint = () => {
        if (!trabajo) return;

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
                <title>Detalle de Trabajo #${trabajo.id}</title>
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
                    .subtitle {
                        color: #7f8c8d;
                        font-size: 14px;
                        margin-top: 5px;
                    }
                    .info-section {
                        margin-bottom: 30px;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                    }
                    .info-item {
                        margin-bottom: 10px;
                    }
                    .label {
                        font-weight: bold;
                        color: #3498db;
                        font-size: 12px;
                        text-transform: uppercase;
                        display: block;
                        margin-bottom: 4px;
                    }
                    .value {
                        font-size: 14px;
                        color: #2c3e50;
                    }
                    .history-section {
                        margin-top: 30px;
                    }
                    .section-title {
                        font-size: 16px;
                        font-weight: bold;
                        color: #2c3e50;
                        margin-bottom: 15px;
                        border-bottom: 1px solid #bdc3c7;
                        padding-bottom: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                    }
                    th {
                        background-color: #3498db;
                        color: white;
                        padding: 8px;
                        text-align: left;
                        font-weight: bold;
                    }
                    td {
                        padding: 8px;
                        border-bottom: 1px solid #eee;
                    }
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }
                    .footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 10px 0;
                        background: white;
                    }
                    .footer-line {
                        border-top: 1px solid #333;
                        margin-bottom: 10px;
                    }
                    .footer-content {
                        display: flex;
                        justify-content: flex-end;
                        font-size: 10px;
                        color: #666;
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
                        <h1>Detalle de Trabajo de Laboratorio</h1>
                        <div class="subtitle">Orden #${trabajo.id}</div>
                    </div>
                </div>

                <div class="info-section">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">Paciente</span>
                            <span class="value">${trabajo.paciente?.nombre} ${trabajo.paciente?.paterno}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Laboratorio</span>
                            <span class="value">${trabajo.laboratorio?.laboratorio}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Trabajo</span>
                            <span class="value">${trabajo.precioLaboratorio?.detalle}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Piezas</span>
                            <span class="value">${trabajo.pieza}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Fecha Registro</span>
                            <span class="value">${formatDate(trabajo.fecha)}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Color</span>
                            <span class="value">${trabajo.color || '-'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Fecha Pedido</span>
                            <span class="value">${trabajo.fecha_pedido ? formatDate(trabajo.fecha_pedido) : '-'}</span>
                        </div>
                         <div class="info-item">
                            <span class="label">Fecha Terminado</span>
                            <span class="value">${trabajo.fecha_terminado ? formatDate(trabajo.fecha_terminado) : '-'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Estado</span>
                            <span class="value" style="text-transform: uppercase;">${trabajo.estado}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Pagado</span>
                            <span class="value" style="text-transform: uppercase;">${trabajo.pagado}</span>
                        </div>
                    </div>
                </div>

                <div class="history-section">
                    <div class="section-title">Historial de Seguimiento</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.length > 0 ? history.map(item => `
                                <tr>
                                    <td>${formatDate(item.fecha)}</td>
                                    <td>${item.envio_retorno}</td>
                                    <td>${item.observaciones || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="text-align: center; font-style: italic;">No hay movimientos registrados</td></tr>'}
                        </tbody>
                    </table>
                </div>



            </body>
            </html>
        `;

        doc.open();
        doc.write(printContent);
        doc.close();

        const logo = doc.querySelector('img');
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
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-200 dark:border-gray-700">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start w-full">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                                        Detalle del Trabajo #{trabajoId}
                                    </h3>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-10">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 dark:border-blue-400"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Trabajo Info */}
                                        {trabajo && (
                                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-900 dark:text-blue-100 shadow-sm">
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Paciente</span>
                                                    <span className="font-semibold">{trabajo.paciente?.nombre} {trabajo.paciente?.paterno}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Laboratorio</span>
                                                    <span className="font-semibold">{trabajo.laboratorio?.laboratorio}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Trabajo</span>
                                                    <span className="font-semibold">{trabajo.precioLaboratorio?.detalle}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Piezas</span>
                                                    <span className="font-semibold">{trabajo.pieza}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Fecha Registro</span>
                                                    <span className="font-semibold">{formatDate(trabajo.fecha)}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Color</span>
                                                    <span className="font-semibold">{trabajo.color || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Fecha Pedido</span>
                                                    <span className="font-semibold">{trabajo.fecha_pedido ? formatDate(trabajo.fecha_pedido) : '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Fecha Terminado</span>
                                                    <span className="font-semibold">{trabajo.fecha_terminado ? formatDate(trabajo.fecha_terminado) : '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Estado</span>
                                                    <span className="font-semibold capitalize">{trabajo.estado}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Pagado</span>
                                                    <span className={`font-semibold capitalize ${trabajo.pagado === 'si' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{trabajo.pagado}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Historial */}
                                        <div>
                                            <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-gray-700 pb-1">Historial de Seguimiento</h4>
                                            {history.length === 0 ? (
                                                <p className="text-gray-500 dark:text-gray-400 italic text-sm text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded border border-dashed border-gray-200 dark:border-gray-600">No hay movimientos registrados.</p>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {history.map((item) => (
                                                        <div key={item.id} className="flex gap-4 items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-600">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${item.envio_retorno === 'Envio'
                                                                ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300'
                                                                : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300'
                                                                }`}>
                                                                {item.envio_retorno === 'Envio' ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className={`font-bold text-sm ${item.envio_retorno === 'Envio' ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'
                                                                        }`}>
                                                                        {item.envio_retorno}
                                                                    </span>
                                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                                                                        {formatDate(item.fecha)}
                                                                    </span>
                                                                </div>
                                                                {item.observaciones ? (
                                                                    <p className="text-sm text-gray-600 dark:text-gray-300">{item.observaciones}</p>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sin observaciones</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t border-gray-200 dark:border-gray-600 items-center">
                        <button
                            onClick={handlePrint}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                        <button
                            type="button"
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            onClick={onClose}
                        >
                            <X size={18} />
                            <span className="text-sm">Cerrar</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrabajoLaboratorioViewModal;
