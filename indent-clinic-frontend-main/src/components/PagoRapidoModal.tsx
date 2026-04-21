import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { getLocalDateString } from '../utils/dateUtils';
import type { Proforma } from '../types';

interface PagoRapidoModalProps {
    isOpen: boolean;
    onClose: () => void;
    pacienteId: number;
    deuda: {
        tratamiento: any;
        proforma: Proforma;
        saldo: number;
    } | null;
    onSuccess: () => void;
}

const PagoRapidoModal: React.FC<PagoRapidoModalProps> = ({ isOpen, onClose, pacienteId, deuda, onSuccess }) => {
    const [formasPago, setFormasPago] = useState<any[]>([]);
    const [comisiones, setComisiones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        fecha: getLocalDateString(),
        monto: '',
        moneda: 'Bolivianos',
        tc: 6.96,
        recibo: '',
        factura: '',
        formaPagoId: 0,
        comisionTarjetaId: 0,
        descuento: 0,
        observaciones: ''
    });

    useEffect(() => {
        if (isOpen && deuda) {
            setFormData(prev => ({
                ...prev,
                monto: String(deuda.saldo.toFixed(2)),
                descuento: Number(deuda.tratamiento.descuento || 0),
                fecha: getLocalDateString(),
                observaciones: ''
            }));
            fetchDependencies();
        }
    }, [isOpen, deuda]);

    const fetchDependencies = async () => {
        try {
            const [fpRes, comRes] = await Promise.all([
                api.get('/forma-pago?limit=100'),
                api.get('/comision-tarjeta')
            ]);
            
            const fpData = fpRes.data.data ? fpRes.data.data : fpRes.data;
            setFormasPago(fpData || []);
            
            if (fpData && fpData.length > 0) {
                const efectivo = fpData.find((fp: any) => fp.forma_pago.toLowerCase() === 'efectivo');
                if (efectivo) {
                    setFormData(prev => ({ ...prev, formaPagoId: efectivo.id }));
                }
            }
            
            const comData = comRes.data.data ? comRes.data.data : comRes.data;
            setComisiones((comData || []).filter((c: any) => c.estado === 'activo'));
        } catch (error) {
            console.error('Error fetching dependencies for modal:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name.includes('Id') || name === 'tc' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deuda) return;
        
        setLoading(true);
        try {
            let finalMonto = Number(formData.monto);
            let finalMoneda = formData.moneda;
            let finalObservaciones = formData.observaciones;

            if (formData.moneda === 'Dólares') {
                const obsDetalle = `(Cancelado en Dólares: $${formData.monto} - TC: ${formData.tc})`;
                finalObservaciones = finalObservaciones ? `${finalObservaciones} ${obsDetalle}` : obsDetalle;
            }

            const payload = {
                pacienteId: pacienteId,
                fecha: formData.fecha,
                monto: finalMonto,
                moneda: finalMoneda,
                tc: Number(formData.tc),
                recibo: formData.recibo,
                factura: formData.factura,
                formaPagoId: formData.formaPagoId > 0 ? formData.formaPagoId : undefined,
                observaciones: finalObservaciones,
                proformaId: deuda.proforma.id,
                comisionTarjetaId: 
                    formData.formaPagoId && formasPago.find(fp => fp.id === formData.formaPagoId)?.forma_pago?.toLowerCase() === 'tarjeta' && formData.comisionTarjetaId > 0
                        ? formData.comisionTarjetaId
                        : undefined,
                monto_comision: 
                    formData.formaPagoId && formasPago.find(fp => fp.id === formData.formaPagoId)?.forma_pago?.toLowerCase() === 'tarjeta' && formData.comisionTarjetaId > 0
                        ? (finalMonto * (comisiones.find(c => c.id === formData.comisionTarjetaId)?.monto || 0)) / 100
                        : undefined,
                historiaClinicaIds: [deuda.tratamiento.id],
                tratamientosDescuentos: { [deuda.tratamiento.id]: formData.descuento }
            };

            await api.post('/pagos', payload);
            
            Swal.fire({
                icon: 'success',
                title: 'Pago Registrado',
                text: 'El pago se registró exitosamente.',
                timer: 1500,
                showConfirmButton: false
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving pago:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Error al guardar el pago';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !deuda) return null;

    const selectedFormaPago = formasPago.find(fp => fp.id === formData.formaPagoId);
    const isTarjeta = selectedFormaPago?.forma_pago?.toLowerCase() === 'tarjeta';
    const isDolares = formData.moneda === 'Dólares';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto 
                ring-1 ring-gray-900/5 dark:ring-gray-100/10">
                
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="2" y1="10" x2="22" y2="10"></line>
                            </svg>
                        </span>
                        Pago Rápido de Tratamiento
                    </h3>
                </div>

                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tratamiento a pagar:</div>
                    <div className="font-bold text-orange-700 dark:text-orange-400 mt-1">{deuda.tratamiento.tratamiento}</div>
                    <div className="flex justify-between items-center mt-2 text-sm font-black">
                        <span className="text-gray-700 dark:text-gray-300">Deuda actual:</span>
                        <span className="text-red-600 dark:text-red-400">Bs. {deuda.saldo.toFixed(2)}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Pago</label>
                            <input
                                type="date"
                                name="fecha"
                                required
                                value={formData.fecha}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pago</label>
                            <select
                                name="formaPagoId"
                                required
                                value={formData.formaPagoId}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={0}>Seleccione forma de pago</option>
                                {formasPago.map(f => (
                                    <option key={f.id} value={f.id}>{f.forma_pago}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                            <select
                                name="moneda"
                                value={formData.moneda}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Bolivianos">Bolivianos</option>
                                <option value="Dólares">Dólares</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-start">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descuento (Bs)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="descuento"
                                value={formData.descuento}
                                onChange={(e) => {
                                    const desc = Math.max(0, Number(e.target.value));
                                    const subtotal = deuda.saldo;
                                    const newMonto = Math.max(0, subtotal - desc);
                                    setFormData(prev => ({
                                        ...prev,
                                        descuento: desc,
                                        monto: String(newMonto.toFixed(2))
                                    }));
                                }}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right font-medium"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {isDolares ? 'Monto a Pagar ($us)' : 'Monto a Pagar (Bs)'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="monto"
                                required
                                value={formData.monto}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-right font-bold text-lg"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {(isTarjeta || isDolares) && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            {isTarjeta && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        Comisión de Tarjeta
                                    </label>
                                    <select
                                        name="comisionTarjetaId"
                                        required={isTarjeta}
                                        value={formData.comisionTarjetaId}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value={0}>Seleccione Banco</option>
                                        {comisiones.map(c => (
                                            <option key={c.id} value={c.id}>{c.redBanco} - {c.monto}%</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {isDolares && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Tipo de Cambio
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="tc"
                                        value={formData.tc}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white text-right"
                                    />
                                    {Number(formData.monto) > 0 && (
                                        <div className="text-xs text-right mt-1 font-semibold text-gray-500">
                                            = Bs. {(Number(formData.monto) * formData.tc).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recibo (Opcional)</label>
                            <input
                                type="text"
                                name="recibo"
                                value={formData.recibo}
                                onChange={handleChange}
                                placeholder="Nº o Código"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Factura (Opcional)</label>
                            <input
                                type="text"
                                name="factura"
                                value={formData.factura}
                                onChange={handleChange}
                                placeholder="Nº de Factura"
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                        <input
                            type="text"
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl mt-6 -mx-5 -mb-5">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform transition-all shadow-md ${!loading ? 'hover:-translate-y-0.5' : 'opacity-50 cursor-not-allowed'}`}
                        >
                            {loading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                            )}
                            Registrar Pago
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
    );
};

export default PagoRapidoModal;
