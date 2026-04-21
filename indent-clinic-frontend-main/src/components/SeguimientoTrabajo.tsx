import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { SeguimientoTrabajo, TrabajoLaboratorio } from '../types';
import Swal from 'sweetalert2';
import { formatDate , getLocalDateString } from '../utils/dateUtils';

const SeguimientoTrabajoComponent: React.FC = () => {
    const { workId } = useParams<{ workId: string }>();
    const navigate = useNavigate();
    const [history, setHistory] = useState<SeguimientoTrabajo[]>([]);
    const [loading, setLoading] = useState(true);
    const [trabajoInfo, setTrabajoInfo] = useState<TrabajoLaboratorio | null>(null);

    const [formData, setFormData] = useState({
        fecha: getLocalDateString(),
        envio_retorno: 'Envio',
        observaciones: ''
    });

    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        if (workId) {
            fetchData();
        }
    }, [workId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [historyRes, workRes] = await Promise.all([
                api.get<SeguimientoTrabajo[]>(`/seguimiento-trabajo?trabajoId=${workId}`),
                api.get<TrabajoLaboratorio>(`/trabajos-laboratorios/${workId}`)
            ]);
            setHistory(historyRes.data);
            setTrabajoInfo(workRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            Swal.fire('Error', 'No se pudo cargar la información del seguimiento', 'error');
        } finally {
            setLoading(false);
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
            if (editingId) {
                await api.patch(`/seguimiento-trabajo/${editingId}`, {
                    ...formData,
                    trabajoLaboratorioId: Number(workId),
                    clinicaId: trabajoInfo?.clinicaId || null
                });
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Seguimiento actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/seguimiento-trabajo', {
                    ...formData,
                    trabajoLaboratorioId: Number(workId),
                    clinicaId: trabajoInfo?.clinicaId || null
                });
                await Swal.fire({
                    icon: 'success',
                    title: 'Registrado',
                    text: 'Seguimiento registrado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }

            setFormData({
                fecha: getLocalDateString(),
                envio_retorno: 'Envio',
                observaciones: ''
            });
            setEditingId(null);
            fetchData(); // Reload history
        } catch (error) {
            console.error('Error saving tracking:', error);
            Swal.fire('Error', 'No se pudo guardar el seguimiento', 'error');
        }
    };

    const handleEdit = (item: SeguimientoTrabajo) => {
        setFormData({
            fecha: item.fecha,
            envio_retorno: item.envio_retorno,
            observaciones: item.observaciones
        });
        setEditingId(item.id);
    };

    const handleCancelEdit = () => {
        setFormData({
            fecha: getLocalDateString(),
            envio_retorno: 'Envio',
            observaciones: ''
        });
        setEditingId(null);
    };

    const handleDelete = async (id: number) => {
        if (await Swal.fire({
            title: '¿Eliminar registro?',
            text: "No podrás revertir esto",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(result => result.isConfirmed)) {
            try {
                await api.delete(`/seguimiento-trabajo/${id}`);
                fetchData();
                Swal.fire('Eliminado', 'El registro ha sido eliminado.', 'success');
            } catch (error) {
                console.error('Error deleting:', error);
                Swal.fire('Error', 'No se pudo eliminar el registro', 'error');
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    Seguimiento de Trabajo #{workId}
                </h2>
                <button
                    onClick={() => navigate('/trabajos-laboratorios')}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2"
                >
                    Volver a la Lista
                </button>
            </div>

            {/* Info Card */}
            {trabajoInfo && (
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-wrap gap-6 text-sm text-blue-900 dark:text-blue-100 shadow-sm">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 dark:text-blue-300">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <div>
                            <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Paciente</span>
                            <span className="font-semibold">{trabajoInfo.paciente?.nombre} {trabajoInfo.paciente?.paterno}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 dark:text-blue-300">
                            <path d="M2 12h20"></path>
                            <path d="M12 2v20"></path>
                        </svg>
                        <div>
                            <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Laboratorio</span>
                            <span className="font-semibold">{trabajoInfo.laboratorio?.laboratorio}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 dark:text-blue-300">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                        <div>
                            <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Trabajo</span>
                            <span className="font-semibold">{trabajoInfo.precioLaboratorio?.detalle}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 dark:text-blue-300">
                            <line x1="18" y1="20" x2="18" y2="10"></line>
                            <line x1="12" y1="20" x2="12" y2="4"></line>
                            <line x1="6" y1="20" x2="6" y2="14"></line>
                        </svg>
                        <div>
                            <span className="font-bold block text-xs uppercase text-blue-400 dark:text-blue-300">Estado</span>
                            <span className="font-semibold">{trabajoInfo.estado}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                    <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 pb-2 flex items-center gap-2">
                        {editingId ? (
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Editar Movimiento
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Registrar Movimiento
                            </div>
                        )}
                    </h3>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </div>
                                <input
                                    type="date"
                                    name="fecha"
                                    value={formData.fecha}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100"
                                    required
                                />
                            </div>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Movimiento</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                </div>
                                <select
                                    name="envio_retorno"
                                    value={formData.envio_retorno}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none text-gray-900 dark:text-gray-100"
                                >
                                    <option value="" disabled>-- Seleccione --</option><option value="Envio">Envío (Al Laboratorio)</option>
                                    <option value="Retorno">Retorno (Del Laboratorio)</option>
                                </select>
                            </div>
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                            <div className="relative">
                                <div className="absolute top-3 left-3 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </div>
                                <textarea
                                    name="observaciones"
                                    value={formData.observaciones}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all text-gray-900 dark:text-gray-100"
                                    placeholder="Detalles adicionales..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                type="submit"
                                className={`flex-1 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${editingId
                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                            >
                                {editingId ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                        Actualizar
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                        Guardar
                                    </>
                                )}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* History List Section */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200 border-b dark:border-gray-700 pb-2 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Historial de Movimientos
                    </h3>

                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 mb-3"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path></svg>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No hay movimientos registrados.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {history.map((item) => (
                                <div key={item.id} className="flex justify-between items-start p-4 rounded-lg bg-white dark:bg-gray-700/40 border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner ${item.envio_retorno === 'Envio'
                                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300'
                                            : 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300'
                                            }`}>
                                            {item.envio_retorno === 'Envio' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`font-bold text-lg ${item.envio_retorno === 'Envio' ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'
                                                    }`}>
                                                    {item.envio_retorno}
                                                </span>
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-600 flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                    {formatDate(item.fecha)}
                                                </span>
                                            </div>
                                            {item.observaciones ? (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg">{item.observaciones}</p>
                                            ) : (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sin observaciones</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="bg-yellow-400 hover:bg-yellow-500 text-white p-2 rounded-lg transition-colors shadow-sm"
                                            title="Editar registro"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors shadow-sm"
                                            title="Eliminar registro"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SeguimientoTrabajoComponent;
