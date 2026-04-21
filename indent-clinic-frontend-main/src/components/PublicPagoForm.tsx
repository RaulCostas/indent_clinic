import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { User, DollarSign, CreditCard, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getLocalDateString } from '../utils/dateUtils';

const PublicPagoForm: React.FC = () => {
    // Los formularios públicos son agnóticos a la sesión, no deben limpiarla preventivamente
    const { idOrSlug } = useParams<{ idOrSlug?: string }>();
    const [clinicaRealId, setClinicaRealId] = useState<number | null>(null);
    const [clinicaNombre, setClinicaNombre] = useState<string>('');
    const [clinicaLogo, setClinicaLogo] = useState<string>('');

    const [formData, setFormData] = useState({
        nombre_paciente: '',
        monto: '',
        formaPagoId: ''
    });

    const [formasPago, setFormasPago] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const initClinica = async () => {
            if (!idOrSlug) return;

            try {
                let matchedClinica = null;
                const isNumeric = /^\d+$/.test(idOrSlug);
                
                if (isNumeric) {
                    const response = await api.get(`/clinicas/${idOrSlug}`);
                    matchedClinica = response.data;
                } else {
                    const response = await api.get(`/clinicas/slug/${idOrSlug}`);
                    matchedClinica = response.data;
                }

                if (matchedClinica) {
                    setClinicaRealId(matchedClinica.id);
                    setClinicaNombre(matchedClinica.nombre);
                    if (matchedClinica.logo) {
                        setClinicaLogo(matchedClinica.logo);
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Sucursal no encontrada',
                        text: 'No se encontró una clínica con ese identificador. Por favor revise el enlace.',
                    });
                }
            } catch (error) {
                console.error("Error validando clínica", error);
            }
        };

        const fetchFormas = async () => {
            try {
                const response = await api.get('/forma-pago?limit=100');
                // The backend returns paginated data: { data: FormaPago[], total: number, ... }
                const items = response.data.data || [];
                // Filter active formas de pago
                const activas = items.filter((f: any) => f.estado === 'activo');
                setFormasPago(activas);
                if (activas.length > 0) {
                    setFormData(prev => ({ ...prev, formaPagoId: activas[0].id.toString() }));
                }
            } catch (error) {
                console.error("Error fetching formas de pago", error);
            }
        };

        initClinica();
        fetchFormas();
    }, [idOrSlug]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.nombre_paciente.trim() || !formData.monto || !formData.formaPagoId) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, complete todos los campos.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (!clinicaRealId) {
            Swal.fire({
                icon: 'error',
                title: 'Link Inválido',
                text: 'La URL no contiene el identificador válido de la sucursal. Por favor, asegúrese de usar el enlace correcto.',
            });
            return;
        }

        setLoading(true);
        try {
            await api.post('/pagos-tablet', {
                nombre_paciente: formData.nombre_paciente,
                monto: parseFloat(formData.monto),
                formaPagoId: parseInt(formData.formaPagoId),
                clinicaId: clinicaRealId,
                fecha: getLocalDateString()
            });

            await Swal.fire({
                icon: 'success',
                title: '¡Pago Registrado!',
                text: `Gracias por registrar su pago en ${clinicaNombre || 'nuestra clínica'}. Puedes pasar a recepción.`,
                showConfirmButton: false,
                timer: 3000
            });

            setFormData(prev => ({ ...prev, nombre_paciente: '', monto: '' }));
        } catch (error) {
            console.error("Error al registrar el pago", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al registrar el pago. Intente nuevamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNoPago = async () => {
        if (!formData.nombre_paciente.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Nombre requerido',
                text: 'Por favor, ingrese su nombre para saber quién nos visitó.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        if (!clinicaRealId) return;

        setLoading(true);
        try {
            await api.post('/pagos-tablet', {
                nombre_paciente: formData.nombre_paciente,
                monto: 0,
                formaPagoId: formasPago.length > 0 ? formasPago[0].id : 1,
                clinicaId: clinicaRealId,
                fecha: getLocalDateString(),
                observaciones: 'El paciente indicó que no pagará hoy.'
            });

            await Swal.fire({
                icon: 'info',
                title: '¡Gracias por visitarnos!',
                text: `Entendido ${formData.nombre_paciente}. ¡Que tenga un excelente día!`,
                showConfirmButton: false,
                timer: 3000
            });

            setFormData(prev => ({ ...prev, nombre_paciente: '', monto: '' }));
        } catch (error) {
            console.error("Error al registrar visita", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al registrar su visita. Intente nuevamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-[600px] bg-white rounded-xl shadow-lg p-6 md:p-10">
                <div className="text-center mb-8">
                    {clinicaLogo && (
                        <img src={clinicaLogo} alt="Clínica Logo" className="h-24 mx-auto mb-4 object-contain drop-shadow-sm" />
                    )}
                    <h2 className="text-3xl font-extrabold text-blue-900 tracking-tight">Registro de Pago</h2>
                    {clinicaNombre && <p className="text-blue-700 font-semibold mt-1">Sucursal: {clinicaNombre}</p>}
                    <p className="text-gray-500 mt-2 text-lg">Por favor, declare su pago a continuación</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Nombre Completo</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="text-gray-400 w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                name="nombre_paciente"
                                value={formData.nombre_paciente}
                                onChange={handleChange}
                                placeholder="Escriba su nombre completo"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 text-lg"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Monto (Bs.)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="text-gray-400 w-5 h-5" />
                            </div>
                            <input
                                type="number"
                                name="monto"
                                value={formData.monto}
                                onChange={handleChange}
                                min="0.1"
                                step="0.1"
                                placeholder="0.00"
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 text-lg"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2">Forma de Pago</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <CreditCard className="text-gray-400 w-5 h-5" />
                            </div>
                            <select
                                name="formaPagoId"
                                value={formData.formaPagoId}
                                onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:outline-none focus:ring-blue-500 text-lg appearance-none"
                                required
                            >
                                {formasPago.map((forma) => (
                                    <option key={forma.id} value={forma.id}>
                                        {forma.forma_pago}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            type="submit"
                            disabled={loading || !clinicaRealId}
                            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all shadow-lg flex justify-center items-center ${loading || !clinicaRealId ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}
                        >
                            {loading ? 'Registrando...' : (!clinicaRealId ? 'Enlace Incompleto/Inválido' : 'Confirmar Pago')}
                        </button>

                        <button
                            type="button"
                            onClick={handleNoPago}
                            disabled={loading || !clinicaRealId}
                            className={`w-full bg-amber-50 border border-amber-200 text-amber-700 font-bold py-4 px-6 rounded-lg text-xl transition-all shadow-sm flex justify-center items-center gap-2 ${loading || !clinicaRealId ? 'opacity-70 cursor-not-allowed' : 'hover:bg-amber-100 hover:-translate-y-0.5'}`}
                        >
                            <XCircle className="w-6 h-6" />
                            No pagaré hoy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PublicPagoForm;
