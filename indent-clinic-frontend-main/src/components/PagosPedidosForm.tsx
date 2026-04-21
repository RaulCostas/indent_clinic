import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Pedidos } from '../types';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { getLocalDateString } from '../utils/dateUtils';
import { useClinica } from '../context/ClinicaContext';
import FormaPagoForm from './FormaPagoForm';


interface FormaPago {
    id: number;
    forma_pago: string;
}

interface PagosPedidosFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    preSelectedPedidoId?: number | string | null;
    onSaveSuccess?: () => void;
}

const PagosPedidosForm: React.FC<PagosPedidosFormProps> = ({ isOpen, onClose, id, preSelectedPedidoId, onSaveSuccess }) => {
    const { clinicaSeleccionada } = useClinica();
    const isEditMode = !!id;

    const [pedidos, setPedidos] = useState<Pedidos[]>([]);
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [idPedido, setIdPedido] = useState(preSelectedPedidoId || '');
    const [fecha, setFecha] = useState(getLocalDateString());
    const [monto, setMonto] = useState('');
    const [factura, setFactura] = useState('');
    const [recibo, setRecibo] = useState('');
    const [formaPago, setFormaPago] = useState('');
    const [clinicaId, setClinicaId] = useState<number>(0);
    const [showManual, setShowManual] = useState(false);

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

    const manualSections: ManualSection[] = [
        {
            title: 'Pagos de Pedidos',
            content: 'Registre pagos a proveedores por pedidos realizados. Seleccione el pedido pendiente y registre el monto, factura y forma de pago.'
        },
        {
            title: 'Factura y Recibo',
            content: 'Ingrese el número de factura del proveedor y el número de recibo interno para mantener un registro completo de la transacción.'
        },
        {
            title: 'Actualización Automática',
            content: 'Al registrar el pago, el sistema actualiza automáticamente el estado del pedido a "Pagado" y registra la fecha de pago.'
        }];

    useEffect(() => {
        const fetchData = async () => {
            if (!isOpen) return;
            try {
                const clinicaParam = clinicaSeleccionada ? `?clinicaId=${clinicaSeleccionada}` : '';
                // Fetch Unpaid Pedidos and Payment Methods parallel
                const [pedidosRes, formasRes] = await Promise.all([
                    api.get<Pedidos[]>(`/pedidos${clinicaParam}`),
                    api.get<any>('/forma-pago?limit=100')
                ]);

                const allPedidos = pedidosRes.data;
                const formasList = formasRes.data.data || formasRes.data;
                setFormasPago(formasList);

                if (formasList.length > 0 && !isEditMode) {
                    setFormaPago(formasList[0].forma_pago);
                }

                if (isEditMode) {
                    const response = await api.get(`/pagos-pedidos/${id}`);
                    const pago = response.data;
                    setIdPedido(pago.idPedido || pago.pedido?.id);
                    setFecha(pago.fecha);
                    setMonto(pago.monto);
                    setFactura(pago.factura || '');
                    setRecibo(pago.recibo || '');
                    setFormaPago(pago.forma_pago);
                    setClinicaId(pago.clinicaId || 0);

                    setPedidos(allPedidos);
                } else {
                    setClinicaId(clinicaSeleccionada || 0);
                    // In create mode, show unpaid. If we have a pre-selected ID (even if paid?? No, assume valid), include it.
                    // Actually if we are paying it, it shouldn't be paid yet.
                    setPedidos(allPedidos.filter(p => !p.Pagado));

                    // If pre-selected, auto-fill amount
                    if (preSelectedPedidoId) {
                        const selected = allPedidos.find(p => p.id === Number(preSelectedPedidoId));
                        if (selected) {
                            setMonto(selected.Total.toString());
                        }
                    }
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, isOpen, isEditMode, preSelectedPedidoId, clinicaSeleccionada]);




    const handlePedidoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value;
        setIdPedido(pid);

        // Auto-fill amount if a pedido is selected AND we are not in edit mode (or user wants to reset?)
        // Better to only auto-fill if user manually changes it.
        const selected = pedidos.find(p => p.id === Number(pid));
        if (selected) {
            setMonto(selected.Total.toString());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                fecha,
                idPedido: Number(idPedido),
                monto: Number(monto),
                factura,
                recibo,
                forma_pago: formaPago,
                clinicaId: clinicaId !== 0 ? clinicaId : null
            };

            if (isEditMode) {
                await api.put(`/pagos-pedidos/${id}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Pago Actualizado',
                    text: 'Pago actualizado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/pagos-pedidos', payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Pago Registrado',
                    text: 'Pago registrado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving pago:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar el pago'
            });
        }
    };

    if (!isOpen) return null;

    if (loading) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
                <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-700 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </span>
                                {isEditMode ? 'Editar Pago de Pedido' : 'Nuevo Pago de Pedido'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowManual(true)}
                                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                title="Ayuda / Manual"
                            >
                                ?
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">


                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Seleccione Pedido</label>
                                <div style={{ position: 'relative' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                    </svg>
                                    <select
                                        value={idPedido}
                                        onChange={handlePedidoChange}
                                        className="w-full border border-gray-300 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                        required
                                        disabled={isEditMode} // Disable changing pedido in edit mode to avoid complex logic of reverting old pedido status
                                    >
                                        <option value="">-- Seleccione un Pedido --</option>
                                        {pedidos.map(p => (
                                            <option key={p.id} value={p.id}>
                                                #{p.id} - {p.proveedor?.proveedor} - Total: {p.Total} {p.Pagado ? '(Pagado)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {isEditMode && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">El pedido no se puede cambiar en modo edición.</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Fecha Pago</label>
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
                                            onChange={e => setFecha(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Monto</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                            <line x1="12" y1="1" x2="12" y2="23"></line>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                        </svg>
                                        <input
                                            type="number" step="0.01"
                                            value={monto}
                                            onChange={e => setMonto(e.target.value)}
                                            placeholder="Ej: 150.00"
                                            className="w-full border border-gray-300 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Nro. Factura</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        <input
                                            type="text"
                                            value={factura}
                                            onChange={e => setFactura(e.target.value)}
                                            placeholder="Ej: 123456"
                                            className="w-full border border-gray-300 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Nro. Recibo</label>
                                    <div style={{ position: 'relative' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                            <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <path d="M2 15h10"></path>
                                            <path d="M9 18l3-3-3-3"></path>
                                        </svg>
                                        <input
                                            type="text"
                                            value={recibo}
                                            onChange={e => setRecibo(e.target.value)}
                                            placeholder="Ej: 987654"
                                            className="w-full border border-gray-300 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 dark:text-gray-300 font-medium text-sm mb-2">Forma de Pago</label>
                                <div className="flex gap-2 relative">
                                    <div className="relative flex-grow">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                            <line x1="1" y1="10" x2="23" y2="10"></line>
                                        </svg>
                                        <select
                                            value={formaPago}
                                            onChange={e => setFormaPago(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                                        >
                                            <option value="" disabled>-- Seleccione --</option>
                                            {formasPago.length > 0 ? (
                                                formasPago.map(fp => (
                                                    <option key={fp.id} value={fp.forma_pago}>{fp.forma_pago}</option>
                                                ))
                                            ) : (
                                                <option value="Efectivo">Efectivo (Default)</option>
                                            )}
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

                            <div className="flex justify-start gap-4 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl -mx-6 -mb-6">
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {isEditMode ? 'Actualizar' : 'Guardar'}
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
                    </div>
                </div>
            </div>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Pagos de Pedidos"
                sections={manualSections}
            />

            {/* Modal Creación Rápida Forma de Pago */}
            {puedeCrearFormaPago && (
                <div style={{ zIndex: 60 }} className="relative">
                    <FormaPagoForm
                        isOpen={isFormaPagoModalOpen}
                        onClose={() => setIsFormaPagoModalOpen(false)}
                        onSaveSuccess={() => {
                            api.get('/forma-pago?limit=100').then((formasRes) => {
                                const formasList = formasRes.data.data || formasRes.data;
                                setFormasPago(formasList);
                                if (formasList.length > 0 && !formaPago) {
                                  setFormaPago(formasList[formasList.length - 1].forma_pago);
                                }
                            });
                            setIsFormaPagoModalOpen(false);
                        }}
                    />
                </div>
            )}
        </>
    );
};

export default PagosPedidosForm;
