import React, { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { Inventario, EgresoInventario } from '../types';
import { getLocalDateString } from '../utils/dateUtils';

interface EgresoInventarioFormProps {
    inventario: Inventario;
    egresoToEdit?: EgresoInventario;
    onClose: () => void;
    onSuccess: () => void;
}

const EgresoInventarioForm: React.FC<EgresoInventarioFormProps> = ({ inventario, egresoToEdit, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        fecha: egresoToEdit ? egresoToEdit.fecha : getLocalDateString(),
        cantidad: egresoToEdit ? egresoToEdit.cantidad : 0,
        fecha_vencimiento: egresoToEdit ? egresoToEdit.fecha_vencimiento || '' : ''
    });
    const [availableDates, setAvailableDates] = useState<{ fecha: string; stock: number }[]>([]);

    React.useEffect(() => {
        const fetchDates = async () => {
            try {
                // Returns array of objects now: { fecha, stock }
                const response = await api.get<any>(`/pedidos/vencimientos/${inventario.id}`);
                setAvailableDates(response.data);

                // Auto-select first date if available and not editing
                if (!egresoToEdit && response.data.length > 0) {
                    setFormData(prev => ({ ...prev, fecha_vencimiento: response.data[0].fecha }));
                }
            } catch (error) {
                console.error('Error fetching expiration dates:', error);
            }
        };
        fetchDates();
    }, [inventario.id, egresoToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                inventarioId: inventario.id,
                cantidad: Number(formData.cantidad),
                clinicaId: inventario.clinicaId
            };

            if (egresoToEdit) {
                await api.put(`/egreso-inventario/${egresoToEdit.id}`, payload);
            } else {
                await api.post('/egreso-inventario', payload);
            }

            await Swal.fire({
                icon: 'success',
                title: egresoToEdit ? 'Egreso Actualizado' : 'Egreso Registrado',
                text: egresoToEdit ? 'El egreso ha sido actualizado correctamente' : 'El egreso ha sido registrado correctamente',
                timer: 1500,
                showConfirmButton: false
            });

            onSuccess();
        } catch (error: any) {
            console.error('Error saving egreso:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Error al guardar el egreso'
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 relative max-h-[95vh] overflow-y-auto">
                <h3 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-[#1a202c] dark:text-white">
                    {egresoToEdit ? 'Editar Egreso:' : 'Egreso de:'} <span className="text-[#3498db] dark:text-[#5dade2]">{inventario.descripcion}</span>
                </h3>
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Fecha</label>
                        <input
                            type="date"
                            value={formData.fecha}
                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 bg-white dark:bg-gray-700 dark:text-white text-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Cantidad</label>
                        <div style={{ position: 'relative' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                            </svg>
                            <input
                                type="number"
                                value={formData.cantidad}
                                onChange={(e) => setFormData({ ...formData, cantidad: Number(e.target.value) })}
                                placeholder="0"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700 text-sm"
                                style={{ paddingLeft: '35px' }}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Fecha Vencimiento (Lote)</label>
                        <div style={{ position: 'relative' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <select
                                value={formData.fecha_vencimiento}
                                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 text-gray-900 dark:text-white appearance-none bg-white dark:bg-gray-700 text-sm"
                                style={{ paddingLeft: '35px' }}
                            >
                                <option value="">Sin lote específico (Opcional)</option>
                                {availableDates.map((date, idx) => (
                                    <option key={idx} value={date.fecha}>
                                        {date.fecha} (Stock: {date.stock})
                                    </option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-2xl mt-6 -mx-6 -mb-6">
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                            {egresoToEdit ? 'Actualizar' : 'Guardar'}
                        </button>
                        <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EgresoInventarioForm;
