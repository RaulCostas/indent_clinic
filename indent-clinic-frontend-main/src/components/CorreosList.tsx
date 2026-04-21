import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { Correo, User } from '../types';
import CorreosForm from './CorreosForm';
import { useCorreos } from '../context/CorreosContext';
import { formatDateTime } from '../utils/dateUtils';

interface CorreosListProps {
    // No props needed for now, getting user from localStorage
}

import ManualModal, { type ManualSection } from './ManualModal';

const CorreosList: React.FC<CorreosListProps> = () => {
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [correos, setCorreos] = useState<Correo[]>([]);
    const [selectedCorreo, setSelectedCorreo] = useState<Correo | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showManual, setShowManual] = useState(false);
    const { decrementUnreadCount } = useCorreos();

    const manualSections: ManualSection[] = [
        {
            title: 'Correos Internos',
            content: 'Sistema de mensajería interna para comunicarse con otros usuarios del sistema.'
        },
        {
            title: 'Bandejas',
            content: 'Use las pestañas "Recibidos" y "Enviados" para navegar por sus mensajes.'
        },
        {
            title: 'Redactar',
            content: 'Pulse el botón azul con el icono de lápiz (+) para escribir un nuevo correo.'
        },
        {
            title: 'Lectura',
            content: 'Seleccione un correo de la lista de la izquierda para leer su contenido completo a la derecha. Los correos no leídos se resaltan en negrita.'
        }];

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchCorreos();
        }
    }, [activeTab, currentUser]);

    const fetchCorreos = async () => {
        if (!currentUser) return;
        try {
            const endpoint = activeTab === 'inbox'
                ? `/correos/inbox/${currentUser.id}`
                : `/correos/sent/${currentUser.id}`;
            const response = await api.get(endpoint);
            setCorreos(response.data);
            setSelectedCorreo(null); // Deselect on tab switch
        } catch (error) {
            console.error('Error fetching correos:', error);
        }
    };

    const isRead = (correo: Correo) => {
        if (!currentUser) return true; // Fallback
        if (correo.destinatario?.id === currentUser.id) return correo.leido_destinatario;
        if (correo.copia?.id === currentUser.id) return correo.leido_copia;
        return true;
    };

    const handleCorreoClick = async (correo: Correo) => {
        setSelectedCorreo(correo);
        if (activeTab === 'inbox' && !isRead(correo)) {
            try {
                await api.patch(`/correos/${correo.id}/read`, { userId: currentUser?.id });

                // Update local state
                setCorreos(prev => prev.map(c => {
                    if (c.id !== correo.id) return c;

                    // Clone and update specific flag
                    const updated = { ...c };
                    if (currentUser && updated.destinatario?.id === currentUser.id) updated.leido_destinatario = true;
                    if (currentUser && updated.copia?.id === currentUser.id) updated.leido_copia = true;
                    return updated;
                }));
                // Update global unread count immediately
                decrementUnreadCount();
            } catch (error) {
                console.error('Error marking as read:', error);
            }
        }
    };




    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {/* Sidebar list of emails */}
            <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Correos Internos</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowManual(true)}
                            className="w-[30px] h-[30px] flex items-center justify-center bg-[#f1f1f1] dark:bg-gray-700 border border-[#ddd] dark:border-gray-600 rounded-full text-[#555] dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Ayuda / Manual"
                        >
                            ?
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-md transition-colors"
                            title="Redactar nuevo correo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div
                        onClick={() => setActiveTab('inbox')}
                        className={`flex-1 justify-center py-3 px-4 cursor-pointer flex items-center gap-2 transition-colors border-b-4 ${activeTab === 'inbox' ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-gray-800' : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        Recibidos
                    </div>
                    <div
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 justify-center py-3 px-4 cursor-pointer flex items-center gap-2 transition-colors border-b-4 ${activeTab === 'sent' ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold bg-white dark:bg-gray-800' : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Enviados
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
                    {correos.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No hay correos en esta bandeja.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                            {correos.map(correo => (
                                <li
                                    key={correo.id}
                                    onClick={() => handleCorreoClick(correo)}
                                    className={`p-4 cursor-pointer transition-colors border-l-4 ${selectedCorreo?.id === correo.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'} ${activeTab === 'inbox' && !isRead(correo) ? 'bg-white dark:bg-gray-800 font-bold border-l-blue-500' : 'text-gray-600 dark:text-gray-300'}`}
                                >
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className={`truncate text-sm ${activeTab === 'inbox' && !isRead(correo) ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-900 dark:text-white font-semibold'}`}>
                                            {activeTab === 'inbox'
                                                ? (correo.remitente?.name || 'Desconocido')
                                                : `Para: ${correo.destinatario?.name || 'Desconocido'}`
                                            }
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                                            {formatDateTime(correo.fecha_envio)}
                                        </span>
                                    </div>
                                    <h4 className={`text-sm mb-1 truncate ${activeTab === 'inbox' && !isRead(correo) ? 'text-gray-800 dark:text-gray-200 font-semibold' : 'text-gray-800 dark:text-gray-300'}`}>{correo.asunto}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{correo.mensaje}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Email Detail View */}
            <div className="flex-1 bg-white dark:bg-gray-800 p-8 overflow-y-auto">
                {selectedCorreo ? (
                    <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{selectedCorreo.asunto}</h2>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg">
                                        {activeTab === 'inbox'
                                            ? selectedCorreo.remitente?.name?.charAt(0) || '?'
                                            : selectedCorreo.destinatario?.name?.charAt(0) || '?'
                                        }
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {activeTab === 'inbox'
                                                ? selectedCorreo.remitente?.name
                                                : `Para: ${selectedCorreo.destinatario?.name}`
                                            }
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {activeTab === 'inbox'
                                                ? `<${selectedCorreo.remitente?.email}>`
                                                : `<${selectedCorreo.destinatario?.email}>`
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatDateTime(selectedCorreo.fecha_envio)}
                                </div>
                            </div>
                            {selectedCorreo.copia && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">CC:</span> {selectedCorreo.copia.name} &lt;{selectedCorreo.copia.email}&gt;
                                </div>
                            )}
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                            {selectedCorreo.mensaje}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-lg">Selecciona un correo para leerlo</p>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {showForm && (
                <CorreosForm
                    currentUser={currentUser}
                    onClose={() => {
                        setShowForm(false);
                        fetchCorreos(); // Refresh list after sending
                    }}
                />
            )}
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Correos"
                sections={manualSections}
            />
        </div>
    );
};

export default CorreosList;
