import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Inventario, EgresoInventario } from '../types';
import EgresoInventarioForm from './EgresoInventarioForm';

interface HistorialEgresosProps {
    inventario: Inventario;
    onClose: () => void;
}

const HistorialEgresos: React.FC<HistorialEgresosProps> = ({ inventario, onClose }) => {
    const [egresos, setEgresos] = useState<EgresoInventario[]>([]);
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [editingEgreso, setEditingEgreso] = useState<EgresoInventario | null>(null);

    useEffect(() => {
        fetchHistory();
    }, [fechaInicio, fechaFin]);

    const fetchHistory = async () => {
        try {
            const response = await api.get(`/egreso-inventario/historial`, {
                params: {
                    inventarioId: inventario.id,
                    ...(fechaInicio && { inicio: fechaInicio }),
                    ...(fechaFin && { fin: fechaFin })
                }
            });
            setEgresos(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
            // alert('Error al cargar el historial');
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleEditSuccess = () => {
        setEditingEgreso(null);
        fetchHistory();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-[#1a202c] dark:text-white">
                        Historial de Egresos: <span className="text-[#3498db] dark:text-[#5dade2]">{inventario.descripcion}</span>
                    </h3>
                </div>

                <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2 mt-4">Buscar por fecha</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Fecha Inicio</label>
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 bg-white dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Fecha Fin</label>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 bg-white dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cantidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vencimiento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {egresos.length > 0 ? (
                                egresos.map((egreso) => (
                                    <tr key={egreso.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{formatDate(egreso.fecha)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{egreso.cantidad}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(egreso.fecha_vencimiento)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditingEgreso(egreso)}
                                                    className="bg-[#ffc107] hover:bg-[#e0a800] text-white p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-0"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('¿Está seguro de eliminar este egreso? Se revertirá el stock.')) {
                                                            try {
                                                                await api.delete(`/egreso-inventario/${egreso.id}`);
                                                                fetchHistory();
                                                            } catch (error) {
                                                                console.error('Error deleting egreso:', error);
                                                                alert('Error al eliminar el egreso');
                                                            }
                                                        }
                                                    }}
                                                    className="bg-[#dc3545] hover:bg-[#c82333] text-white p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-0"
                                                    title="Eliminar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No hay egresos en este rango de fechas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Edit Modal */}
            {editingEgreso && (
                <div style={{ position: 'relative', zIndex: 60 }}>
                    <EgresoInventarioForm
                        inventario={inventario}
                        egresoToEdit={editingEgreso}
                        onClose={() => setEditingEgreso(null)}
                        onSuccess={handleEditSuccess}
                    />
                </div>
            )}
        </div>
    );
};

export default HistorialEgresos;
