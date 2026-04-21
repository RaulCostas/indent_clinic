import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from './ManualModal';
import { useClinica } from '../context/ClinicaContext';
import FormaPagoForm from './FormaPagoForm';

interface OtrosIngresosFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | string | null;
    onSaveSuccess?: () => void;
}

const OtrosIngresosForm: React.FC<OtrosIngresosFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const { clinicaSeleccionada } = useClinica();
    const [formData, setFormData] = useState({
        fecha: (() => {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            return new Date(now.getTime() - offset).toISOString().split('T')[0];
        })(),
        detalle: '',
        monto: '',
        moneda: 'Bolivianos',
        formaPagoId: '',
        clinicaId: 0
    });
    const [formasPago, setFormasPago] = useState<any[]>([]);
    const [showManual, setShowManual] = useState(false);
    const [isFormaPagoModalOpen, setIsFormaPagoModalOpen] = useState(false);
    const [userPermisos, setUserPermisos] = useState<string[]>([]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserPermisos(Array.isArray(user.permisos) ? user.permisos : []);
            } catch (e) {}
        }
    }, []);

    const puedeCrearFormaPago = !userPermisos.includes('configuracion');

    const manualSections: ManualSection[] = [
        {
            title: 'Registro de Otros Ingresos',
            content: 'Registre ingresos externos. Especifique el detalle, monto, moneda y forma de pago.'
        },
        {
            title: 'Moneda',
            content: 'Seleccione la moneda (Bolivianos/Dólares) para un registro contable correcto.'
        }];

    useEffect(() => {
        if (isOpen) {
            fetchFormasPago();
            if (id) {
                api.get<any>(`/otros-ingresos/${id}`)
                    .then(response => {
                        const data = response.data;
                        setFormData({
                            fecha: new Date(data.fecha).toISOString().split('T')[0],
                            detalle: data.detalle,
                            monto: data.monto.toString(),
                            moneda: data.moneda,
                            formaPagoId: data.formaPago?.id?.toString() || '',
                            clinicaId: data.clinicaId || clinicaSeleccionada || 0
                        });
                    })
                    .catch(error => {
                        console.error('Error fetching ingreso:', error);
                    });
            } else {
                const now = new Date();
                const offset = now.getTimezoneOffset() * 60000;
                setFormData({
                    fecha: new Date(now.getTime() - offset).toISOString().split('T')[0],
                    detalle: '',
                    monto: '',
                    moneda: 'Bolivianos',
                    formaPagoId: '',
                    clinicaId: clinicaSeleccionada || 0
                });
            }
        }
    }, [id, isOpen]);

    const fetchFormasPago = async () => {
        try {
            const response = await api.get('/forma-pago');
            const activeFormasPago = (response.data.data || response.data || []).filter((fp: any) => fp.estado === 'activo');
            setFormasPago(activeFormasPago);
        } catch (error) {
            console.error('Error fetching formas de pago:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                monto: parseFloat(formData.monto),
                formaPagoId: parseInt(formData.formaPagoId),
                clinicaId: formData.clinicaId && formData.clinicaId !== 0 ? formData.clinicaId : null
            };

            if (id) {
                await api.patch(`/otros-ingresos/${id}`, payload);
                await Swal.fire({ icon: 'success', title: 'Ingreso Actualizado', timer: 1500, showConfirmButton: false });
            } else {
                await api.post('/otros-ingresos', payload);
                await Swal.fire({ icon: 'success', title: 'Ingreso Creado', timer: 1500, showConfirmButton: false });
            }
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving ingreso:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Error al guardar el ingreso' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
            <div className="w-full max-w-md h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                <div className="p-6">
                    {/* Header with Help button */}
                    <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <span className="p-2 bg-green-100 dark:bg-green-900 rounded-lg text-green-600 dark:text-green-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                            {id ? 'Editar Ingreso' : 'Nuevo Ingreso'}
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
                        {/* Fecha with Icon */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Fecha:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                            </div>
                        </div>

                        {/* Detalle with Icon */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Detalle:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-6 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                <textarea name="detalle" value={formData.detalle} onChange={handleChange} required rows={3} placeholder="Ingrese el motivo o detalle..." className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                            </div>
                        </div>

                        {/* Monto with Icon */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Monto:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <line x1="12" y1="1" x2="12" y2="23"></line>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                                <input type="number" step="0.01" name="monto" value={formData.monto} onChange={handleChange} required placeholder="0.00" className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                            </div>
                        </div>

                        {/* Moneda with Icon */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Moneda:</label>
                            <div className="relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <select name="moneda" value={formData.moneda} onChange={handleChange} className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm">
                                    <option value="Bolivianos">Bolivianos</option>
                                    <option value="Dólares">Dólares</option>
                                </select>
                            </div>
                        </div>

                        {/* Forma de Pago with Icon */}
                        <div>
                            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Forma de Pago:</label>
                            <div className="flex gap-2">
                                <div className="relative flex-grow">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                    </svg>
                                    <select name="formaPagoId" value={formData.formaPagoId} onChange={handleChange} required className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm">
                                        <option value="">Seleccione...</option>
                                        {formasPago.map(fp => ( <option key={fp.id} value={fp.id}>{fp.forma_pago}</option> ))}
                                    </select>
                                </div>
                                {puedeCrearFormaPago && (
                                    <button
                                        type="button"
                                        onClick={() => setIsFormaPagoModalOpen(true)}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-3 py-2 rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center transform hover:-translate-y-0.5"
                                        title="Añadir Forma de Pago"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl mt-6 -mx-6 -mb-6 shadow-inner">
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                {id ? 'Actualizar' : 'Guardar'}
                            </button>
                            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Cancelar
                            </button>
                        </div>
                    </form>

                    <ManualModal isOpen={showManual} onClose={() => setShowManual(false)} title="Manual - Otros Ingresos" sections={manualSections} />
                    {puedeCrearFormaPago && (
                        <div style={{ zIndex: 60 }} className="relative">
                            <FormaPagoForm isOpen={isFormaPagoModalOpen} onClose={() => setIsFormaPagoModalOpen(false)} onSaveSuccess={() => { fetchFormasPago(); setIsFormaPagoModalOpen(false); }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OtrosIngresosForm;
