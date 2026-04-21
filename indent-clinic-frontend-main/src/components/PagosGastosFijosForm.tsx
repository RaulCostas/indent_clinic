import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { GastoFijo, PagoGastoFijo, FormaPago } from '../types';
import { useClinica } from '../context/ClinicaContext';
import FormaPagoForm from './FormaPagoForm';

interface PagosGastosFijosFormProps {
    gastoFijo: GastoFijo;
    existingPayment?: PagoGastoFijo | null;
    onClose: () => void;
    onSave: () => void;
}

const PagosGastosFijosForm: React.FC<PagosGastosFijosFormProps> = ({ gastoFijo, existingPayment, onClose, onSave }) => {
    const { clinicaSeleccionada, clinicas } = useClinica();
    const [fecha, setFecha] = useState(() => {
        const offset = new Date().getTimezoneOffset();
        const localDate = new Date(new Date().getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    });
    const [monto, setMonto] = useState<number | string>(gastoFijo.monto);
    const [moneda, setMoneda] = useState(gastoFijo.moneda);
    const [formaPagoId, setFormaPagoId] = useState<number | ''>('');
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [clinicaId, setClinicaId] = useState<number | string>(gastoFijo.clinicaId || clinicaSeleccionada || '');
    const [observaciones, setObservaciones] = useState('');

    // Modal Forma Pago
    const [isFormaPagoModalOpen, setIsFormaPagoModalOpen] = useState(false);
    const [userPermisos, setUserPermisos] = useState<string[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (error) {
                console.error('Error parseando usuario:', error);
            }
        }
    }, []);

    const puedeCrearFormaPago = !userPermisos.includes('configuracion');

    useEffect(() => {
        const fetchFormasPago = async () => {
            try {
                const response = await api.get('/forma-pago?limit=100');
                if (response.data && response.data.data) {
                    const activeFormasPago = (response.data.data || []).filter((fp: any) => fp.estado === 'activo');
                    setFormasPago(activeFormasPago);
                } else if (Array.isArray(response.data)) { // Fallback if API returns array directly
                    const activeFormasPago = response.data.filter((fp: any) => fp.estado === 'activo');
                    setFormasPago(activeFormasPago);
                }
            } catch (err) {
                console.error('Error fetching formas de pago:', err);
            }
        };
        fetchFormasPago();
    }, []);

    useEffect(() => {
        if (existingPayment) {
            setFecha(existingPayment.fecha);
            setMonto(existingPayment.monto);
            setMoneda(existingPayment.moneda);
            if (existingPayment.formaPagoId) {
                setFormaPagoId(existingPayment.formaPagoId);
            } else if (existingPayment.formaPago && typeof existingPayment.formaPago === 'object') {
                // @ts-ignore
                setFormaPagoId(existingPayment.formaPago.id);
            }
            setObservaciones(existingPayment.observaciones || '');
            if (existingPayment.clinicaId) {
                setClinicaId(existingPayment.clinicaId);
            }
        }
    }, [existingPayment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formaPagoId) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Por favor seleccione una forma de pago.' });
            return;
        }

        const data = {
            gastoFijoId: gastoFijo.id,
            fecha,
            monto: Number(monto),
            moneda,
            formaPagoId: Number(formaPagoId),
            observaciones,
            clinicaId: clinicaId ? Number(clinicaId) : null
        };

        try {
            if (existingPayment) {
                await api.patch(`/pagos-gastos-fijos/${existingPayment.id}`, data);
            } else {
                await api.post('/pagos-gastos-fijos', data);
            }

            await Swal.fire({
                icon: 'success',
                title: existingPayment ? 'Pago Actualizado' : 'Pago Registrado',
                text: existingPayment ? 'Pago actualizado exitosamente' : 'Pago registrado exitosamente',
                timer: 1500,
                showConfirmButton: false
            });

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving payment:', error);
            const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || 'Error desconocido';
            const detailMsg = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
            Swal.fire({
                icon: 'error',
                title: 'Error al Guardar',
                text: `Detalles: ${detailMsg}. Por favor intente nuevamente.`
            });
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <h3 className="text-2xl font-bold mb-6 text-[#1a202c] dark:text-white">
                {existingPayment ? 'Editar Pago' : 'Registrar Pago'}: <span className="text-[#3498db] dark:text-[#5dade2]">{gastoFijo.gasto_fijo}</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Clínica Selector */}
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Clínica</label>
                    <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        <select
                            value={clinicaId}
                            onChange={(e) => setClinicaId(e.target.value)}
                            required
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition-all text-gray-900 bg-white dark:text-white dark:bg-gray-700 appearance-none cursor-pointer"
                        >
                            <option value="" disabled className="dark:bg-gray-800">Seleccione Clínica...</option>
                            {clinicas.map((c: any) => (
                                <option key={c.id} value={c.id} className="dark:bg-gray-800">{c.nombre}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Fecha</label>
                    <div style={{ position: 'relative' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 text-gray-900 bg-white dark:text-white dark:bg-gray-700"
                            style={{ paddingLeft: '35px' }}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Monto</label>
                        <div style={{ position: 'relative' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            <input
                                type="number"
                                step="0.01"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                placeholder="Ej: 150.00"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 text-gray-900 bg-white dark:text-white dark:bg-gray-700"
                                style={{ paddingLeft: '35px' }}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Moneda</label>
                        <div style={{ position: 'relative' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            <select
                                value={moneda}
                                onChange={(e) => setMoneda(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 text-gray-900 bg-white dark:text-white dark:bg-gray-700 arrow-none"
                                style={{ paddingLeft: '35px' }}
                            >
                                <option value="" disabled>-- Seleccione --</option>
                                <option value="Bolivianos">Bolivianos</option>
                                <option value="Dólares">Dólares</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Forma de Pago</label>
                    <div className="flex gap-2 relative">
                        <div className="relative flex-grow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                            </svg>
                            <select
                                value={formaPagoId}
                                onChange={(e) => setFormaPagoId(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 text-gray-900 bg-white dark:text-white dark:bg-gray-700 appearance-none"
                                style={{ paddingLeft: '35px' }}
                            >
                                <option value="">Seleccione una forma de pago</option>
                                {formasPago.map((fp) => (
                                    <option key={fp.id} value={fp.id}>
                                        {fp.forma_pago}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {puedeCrearFormaPago && (
                            <button
                                type="button"
                                onClick={() => setIsFormaPagoModalOpen(true)}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center transform hover:-translate-y-0.5 transition-all active:scale-95 shadow-md"
                                title="Añadir Forma de Pago"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Observaciones</label>
                    <div style={{ position: 'relative' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '15px', pointerEvents: 'none' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Ingrese una descripción..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3498db] transition duration-200 text-gray-900 bg-white dark:text-white dark:bg-gray-700"
                            rows={3}
                            style={{ paddingLeft: '35px' }}
                        />
                    </div>
                </div>

                {/* Standardized Footer Buttons */}
                <div className="flex justify-start gap-4 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl -mx-6 -mb-6">
                    <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        {existingPayment ? 'Actualizar Pago' : 'Pagar'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Cancelar
                    </button>
                </div>
            </form>

            {/* Modal Creación Rápida Forma de Pago */}
            {puedeCrearFormaPago && (
                <div style={{ zIndex: 60 }} className="relative">
                    <FormaPagoForm
                        isOpen={isFormaPagoModalOpen}
                        onClose={() => setIsFormaPagoModalOpen(false)}
                        onSaveSuccess={() => {
                            // Fetch FormaPago without needing to reload the entire list manually,
                            // although we need to call fetchFormasPago
                            api.get('/forma-pago?limit=100').then((response) => {
                                const activeFormasPago = (response.data.data || response.data || []).filter((fp: any) => fp.estado === 'activo');
                                setFormasPago(activeFormasPago);
                            });
                            setIsFormaPagoModalOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default PagosGastosFijosForm;
