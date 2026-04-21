import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';

interface ChatbotIntento {
    id: number;
    keywords: string;
    action: 'CONSULTAR_CITA' | 'CONSULTAR_SALDO' | 'TEXTO_LIBRE' | 'CONSULTAR_PRESUPUESTO';
    replyTemplate?: string;
    active: boolean;
    target?: 'PACIENTE' | 'USUARIO';
}

const ChatbotIntentosConfig: React.FC = () => {
    const [intentos, setIntentos] = useState<ChatbotIntento[]>([]);
    const [loading, setLoading] = useState(false);

    const [editingIntento, setEditingIntento] = useState<ChatbotIntento | null>(null);
    const [editKeywords, setEditKeywords] = useState('');

    useEffect(() => {
        fetchIntentos();
    }, []);

    const fetchIntentos = async () => {
        setLoading(true);
        try {
            const response = await api.get('/chatbot/intentos');
            setIntentos(response.data);
        } catch (error) {
            console.error('Error fetching intents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (intento: ChatbotIntento) => {
        try {
            await api.put(`/chatbot/intentos/${intento.id}`, { active: !intento.active });
            setIntentos(intentos.map(i => i.id === intento.id ? { ...i, active: !i.active } : i));
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Estado actualizado correctamente',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error updating status:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar estado'
            });
            fetchIntentos();
        }
    };

    const handleEditClick = (intento: ChatbotIntento) => {
        setEditingIntento(intento);
        setEditKeywords(intento.keywords);
    };

    const handleSaveKeywords = async () => {
        if (!editingIntento) return;
        try {
            await api.put(`/chatbot/intentos/${editingIntento.id}`, { keywords: editKeywords });
            setIntentos(intentos.map(i => i.id === editingIntento.id ? { ...i, keywords: editKeywords } : i));
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Palabras clave actualizadas',
                timer: 1500,
                showConfirmButton: false
            });
            setEditingIntento(null);
        } catch (error) {
            console.error('Error updating keywords:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar palabras clave'
            });
        }
    };

    const [subTab, setSubTab] = useState<'PACIENTE' | 'USUARIO'>('PACIENTE');

    const filteredIntentos = intentos.filter(i => (i.target || 'PACIENTE') === subTab);

    return (
        <div className="p-2 md:p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Respuestas Automáticas</h3>

            {/* Sub-Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 gap-4">
                <button
                    onClick={() => setSubTab('PACIENTE')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium bg-transparent transition-colors border-b-2 outline-none focus:outline-none ${subTab === 'PACIENTE'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    Para Pacientes
                </button>
                <button
                    onClick={() => setSubTab('USUARIO')}
                    className={`flex items-center gap-2 px-4 py-2 font-medium bg-transparent transition-colors border-b-2 outline-none focus:outline-none ${subTab === 'USUARIO'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Para Usuarios
                </button>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">Cargando...</p>
                ) : (
                    <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg overflow-hidden">
                        <thead className="bg-[#f8f9fa] dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Palabras Clave</th>
                                <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Acción</th>
                                <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Respuesta / Detalle</th>
                                <th className="p-3 text-center font-bold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Activo/Inactivo</th>
                                <th className="p-3 text-center font-bold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredIntentos.map(intento => (
                                <tr key={intento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-900 dark:text-white font-medium">{intento.keywords}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            {intento.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-md truncate" title={intento.action === 'TEXTO_LIBRE' ? intento.replyTemplate : ''}>
                                        {intento.action === 'TEXTO_LIBRE' ? intento.replyTemplate : <span className="text-gray-400 dark:text-gray-500 italic">(Dinámico)</span>}
                                    </td>
                                    <td className="p-3 whitespace-nowrap text-center font-medium">

                                        <div
                                            onClick={() => handleToggleActive(intento)}
                                            className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out cursor-pointer ${intento.active ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-300 dark:bg-gray-500'}`}
                                            title={intento.active ? 'Desactivar' : 'Activar'}
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${intento.active ? 'translate-x-6' : ''}`}
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap text-center font-medium">
                                        <button
                                            onClick={() => handleEditClick(intento)}
                                            className="p-2.5 bg-yellow-400 hover:bg-yellow-500 text-white rounded-lg inline-flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Editar Palabras Clave"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredIntentos.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 italic">
                                        No hay reglas configuradas para {subTab === 'PACIENTE' ? 'pacientes' : 'usuarios'}.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit Modal */}
            {
                editingIntento && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black dark:bg-opacity-70 overflow-y-auto h-full w-full flex items-center justify-center z-[9999] p-2 sm:p-4">
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8 max-w-md w-full">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">Editar Palabras Clave</h3>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
                                    Palabras Clave (separadas por comas)
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 text-gray-700 dark:text-gray-200 border rounded-lg focus:outline-none focus:border-blue-500 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none text-sm transition-colors duration-200 ease-in-out"
                                    rows={4}
                                    value={editKeywords}
                                    onChange={(e) => setEditKeywords(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Ejemplo: presupuesto, costo, precio, cotizacion
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-start gap-3 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl mt-6 -mx-6 -mb-6">
                                <button
                                    onClick={handleSaveKeywords}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    Guardar
                                </button>
                                <button
                                    onClick={() => setEditingIntento(null)}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ChatbotIntentosConfig; // Force HMR
