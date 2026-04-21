import React, { useEffect, useState } from 'react';
import api from '../services/api';
import type { Pedidos } from '../types';
import { formatDate } from '../utils/dateUtils';
import { Printer, X } from 'lucide-react';
import { useClinica } from '../context/ClinicaContext';


interface Props {
    isOpen: boolean;
    onClose: () => void;
    pedidoId: number | null;
}

const PedidoViewModal: React.FC<Props> = ({ isOpen, onClose, pedidoId }) => {
    const { clinicaActual } = useClinica();
    const [pedido, setPedido] = useState<Pedidos | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && pedidoId) {
            fetchData(pedidoId);
        } else {
            setPedido(null);
        }
    }, [isOpen, pedidoId]);

    const fetchData = async (id: number) => {
        try {
            setLoading(true);
            const response = await api.get<Pedidos>(`/pedidos/${id}`);
            setPedido(response.data);
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handlePrint = () => {
        if (!pedido) return;

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
                <title>Detalle de Pedido #${pedidoId}</title>
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

                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 20px;
                        font-size: 12px;
                    }

                    .info-item {
                        margin-bottom: 5px;
                    }

                    .label {
                        font-weight: bold;
                        color: #3498db;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                        font-size: 11px;
                    }
                    
                    th {
                        background-color: #3498db;
                        color: white;
                        padding: 10px 8px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #2980b9;
                    }
                    
                    td {
                        padding: 8px;
                        border: 1px solid #ddd;
                    }
                    
                    tr:nth-child(even) {
                        background-color: #f8f9fa;
                    }

                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    
                    .footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 10px 0;
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

                    .total-section {
                        margin-top: 20px;
                        text-align: right;
                        font-size: 14px;
                        font-weight: bold;
                    }

                    .observaciones {
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #f8f9fa;
                        border: 1px solid #ddd;
                        font-size: 11px;
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
                    <h1>Detalle de Pedido #${pedidoId}</h1>
                </div>

                <div class="info-grid">
                    <div>
                        <div class="info-item"><span class="label">Proveedor:</span> ${pedido.proveedor?.proveedor}</div>
                        <div class="info-item"><span class="label">Fecha:</span> ${formatDate(pedido.fecha)}</div>
                    </div>
                    <div>
                        <div class="info-item"><span class="label">Pagado:</span> ${pedido.Pagado ? 'SI' : 'NO'}</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th class="text-center">Cantidad</th>
                            <th class="text-right">Precio Unit.</th>
                            <th class="text-right">SubTotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(pedido.detalles || []).map((d) => `
                            <tr>
                                <td>${d.inventario?.descripcion}</td>
                                <td class="text-center">${d.cantidad}</td>
                                <td class="text-right">${Number(d.precio_unitario).toFixed(2)}</td>
                                <td class="text-right">${Number(d.cantidad * d.precio_unitario).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="total-section">
                    Total: ${Number(pedido.Total).toFixed(2)}
                </div>

                ${pedido.Observaciones ? `
                    <div class="observaciones">
                        <strong>Observaciones:</strong><br/>
                        ${pedido.Observaciones}
                    </div>
                ` : ''}


                
                <script>
                    window.onload = function() {
                        // Optional: auto print
                    };
                </script>
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
                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start w-full">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white" id="modal-title">
                                        Detalle del Pedido #{pedidoId}
                                    </h3>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-10">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : (
                                    pedido && (
                                        <div className="space-y-6">
                                            {/* Pedido Info */}
                                            <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-xl border border-blue-100 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-900 dark:text-gray-200 shadow-sm">
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-gray-400">Proveedor</span>
                                                    <span className="font-semibold">{pedido.proveedor?.proveedor}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-gray-400">Fecha</span>
                                                    <span className="font-semibold">{formatDate(pedido.fecha)}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-gray-400">Total</span>
                                                    <span className="font-semibold">{Number(pedido.Total).toFixed(2)}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold block text-xs uppercase text-blue-400 dark:text-gray-400">Pagado</span>
                                                    <span className={`font-semibold capitalize ${pedido.Pagado ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {pedido.Pagado ? 'SI' : 'NO'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Detalles (Productos) */}
                                            <div>
                                                <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-2 border-b dark:border-gray-600 pb-1">Productos</h4>
                                                {pedido.detalles && pedido.detalles.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                                <tr>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Producto</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cantidad</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Precio Unit.</th>
                                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SubTotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                                                                {pedido.detalles.map((detalle, index) => (
                                                                    <tr key={index}>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{detalle.inventario?.descripcion}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{detalle.cantidad}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{Number(detalle.precio_unitario).toFixed(2)}</td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{Number(detalle.cantidad * detalle.precio_unitario).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500 dark:text-gray-400 italic text-sm py-4">No hay detalles disponibles.</p>
                                                )}
                                            </div>

                                            {/* Observaciones */}
                                            {pedido.Observaciones && (
                                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                                    <span className="font-bold block text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Observaciones</span>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">{pedido.Observaciones}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
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
                            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
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

export default PedidoViewModal;
