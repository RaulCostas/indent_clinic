import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { useClinica } from '../context/ClinicaContext';

import ChatbotIntentosConfig from './ChatbotIntentosConfig';
import ManualModal, { type ManualSection } from './ManualModal';

interface InstanceState {
    status: string;
    qr: string | null;
    loading: boolean;
    connectingStartTime: number | null;
    showTimeoutWarning: boolean;
}

const ChatbotConfig: React.FC = () => {
    const navigate = useNavigate();
    const { clinicaActual } = useClinica();

    const [instances, setInstances] = useState<{ [key: number]: InstanceState }>({
        1: { status: 'disconnected', qr: null, loading: false, connectingStartTime: null, showTimeoutWarning: false },
        2: { status: 'disconnected', qr: null, loading: false, connectingStartTime: null, showTimeoutWarning: false }
    });

    const [activeTab, setActiveTab] = useState<'status' | 'intents'>('status');
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Chatbot WhatsApp (Multi-número)',
            content: 'Ahora puede conectar hasta 2 números de WhatsApp por clínica. Ambos números funcionarán de manera independiente pero compartirán las mismas reglas de respuesta.'
        },
        {
            title: 'Configuración de Instancias',
            content: 'Cada bloque representa un número de teléfono. Puede iniciar uno o ambos según su necesidad.'
        },
        {
            title: 'Estados de Conexión',
            content: 'Conectado (verde): El bot está activo. QR (imagen): Escanee para vincular. Iniciando (azul): Preparando el servicio.'
        }
    ];

    const updateInstanceState = (instance: number, updates: Partial<InstanceState>) => {
        setInstances(prev => ({
            ...prev,
            [instance]: { ...prev[instance], ...updates }
        }));
    };

    const fetchStatus = async (instance: number) => {
        if (!clinicaActual?.id) return;

        try {
            const response = await api.get(`/chatbot/${clinicaActual.id}/status?instance=${instance}&t=${Date.now()}`);
            const { status, qr } = response.data;

            const current = instances[instance];
            let newStartTime = current.connectingStartTime;
            let showWarning = current.showTimeoutWarning;

            if (status === 'connecting') {
                if (!newStartTime) {
                    newStartTime = Date.now();
                } else if (Date.now() - newStartTime > 45000) {
                    showWarning = true;
                }
            } else {
                newStartTime = null;
                showWarning = false;
            }

            updateInstanceState(instance, {
                status,
                qr,
                connectingStartTime: newStartTime,
                showTimeoutWarning: showWarning
            });
        } catch (error) {
            console.error(`Error fetching status for instance ${instance}:`, error);
        }
    };

    useEffect(() => {
        if (!clinicaActual?.id) return;

        const fetchAll = () => {
            fetchStatus(1);
            fetchStatus(2);
        };

        fetchAll();
        const interval = setInterval(fetchAll, 3000);
        return () => clearInterval(interval);
    }, [clinicaActual?.id]);

    const handleInitialize = async (instance: number) => {
        if (!clinicaActual?.id) return;
        updateInstanceState(instance, { loading: true, showTimeoutWarning: false, connectingStartTime: null });
        try {
            const response = await api.post(`/chatbot/${clinicaActual.id}/initialize?instance=${instance}`);
            if (response.data.error) throw new Error(response.data.error);
            fetchStatus(instance);
        } catch (error: any) {
            console.error(`Error initializing instance ${instance}:`, error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al iniciar el bot: ' + (error.response?.data?.error || error.response?.data?.message || error.message)
            });
        } finally {
            updateInstanceState(instance, { loading: false });
        }
    };

    const handleDisconnect = async (instance: number, skipConfirm = false) => {
        let shouldDisconnect = skipConfirm;
        if (!skipConfirm) {
            const result = await Swal.fire({
                title: `¿Desconectar WhatsApp #${instance}?`,
                text: "Se cerrará la sesión actual de este número.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, desconectar',
                cancelButtonText: 'Cancelar'
            });
            shouldDisconnect = result.isConfirmed;
        }

        if (shouldDisconnect) {
            updateInstanceState(instance, { loading: true });
            try {
                await api.post(`/chatbot/${clinicaActual?.id}/disconnect?instance=${instance}`);
                fetchStatus(instance);
                if (!skipConfirm) Swal.fire('Desconectado', 'El bot ha sido desconectado.', 'success');
            } catch (error) {
                console.error('Error disconnecting:', error);
                Swal.fire('Error', 'No se pudo desconectar.', 'error');
            } finally {
                updateInstanceState(instance, { loading: false });
            }
        }
    };

    const handleReset = async (instance: number) => {
        const result = await Swal.fire({
            title: `¿Reiniciar sesión #${instance}?`,
            text: "Esto eliminará la sesión actual para generar un nuevo QR. ¿Continuar?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reiniciar'
        });

        if (result.isConfirmed) {
            updateInstanceState(instance, { loading: true });
            try {
                await api.post(`/chatbot/${clinicaActual?.id}/reset?instance=${instance}`);
                await Swal.fire('Sesión reiniciada', 'Intente iniciar el bot nuevamente.', 'success');
                fetchStatus(instance);
            } finally {
                updateInstanceState(instance, { loading: false });
            }
        }
    };

    const renderInstance = (instance: number) => {
        const data = instances[instance];
        return (
            <div className="flex-1 min-w-[300px] bg-gray-50 dark:bg-gray-700/30 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full text-sm">#{instance}</span>
                        WhatsApp {instance}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${data.status === 'connected' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        data.status === 'qr' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            data.status === 'connecting' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-400'
                        }`}>
                        {data.status === 'qr' ? 'Esperando Escaneo' : data.status === 'connecting' ? 'Iniciando' : data.status === 'connected' ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center min-h-[300px]">
                    {data.status === 'connected' ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h4 className="text-lg font-bold text-green-600 dark:text-green-400 mb-6">¡Conexión Activa!</h4>
                            <button
                                onClick={() => handleDisconnect(instance, false)}
                                disabled={data.loading}
                                className="px-6 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-semibold hover:bg-red-200 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                            >
                                {data.loading ? '...' : 'Cerrar Sesión'}
                            </button>
                        </div>
                    ) : data.status === 'qr' && data.qr ? (
                        <div className="text-center">
                            <div className="p-3 bg-white rounded-lg shadow-sm mb-4 border border-gray-100">
                                <img src={data.qr} alt="QR Code" className="w-48 h-48 mx-auto" />
                            </div>
                            <p className="text-xs text-gray-500 mb-4 px-4 text-center">Escanee desde WhatsApp {'>'} Dispositivos vinculados</p>
                            <button
                                onClick={() => handleDisconnect(instance, true)}
                                disabled={data.loading}
                                className="px-4 py-1.5 bg-gray-500 text-white rounded-lg text-sm font-bold hover:bg-gray-600 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                            >
                                Cancelar
                            </button>
                        </div>
                    ) : data.status === 'connecting' ? (
                        <div className="text-center">
                            <div className="animate-spin text-blue-500 mb-4 inline-block">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <p className="text-gray-500 text-sm mb-4">Preparando servicio...</p>
                            {data.showTimeoutWarning && (
                                <button
                                    onClick={() => handleInitialize(instance)}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-all transform hover:-translate-y-0.5 mb-4"
                                >
                                    Reintentar ahora
                                </button>
                            )}
                            <button
                                onClick={() => handleDisconnect(instance, true)}
                                className="px-4 py-1.5 bg-red-400 text-white rounded-lg text-xs font-bold transition-all transform hover:-translate-y-0.5"
                            >
                                Detener
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="p-6 bg-gray-100 dark:bg-gray-600 rounded-full mb-6 inline-block text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <button
                                onClick={() => handleInitialize(instance)}
                                disabled={data.loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none"
                            >
                                {data.loading ? 'Iniciando...' : 'Conectar WhatsApp'}
                            </button>
                            <div className="mt-6 border-t border-gray-200 dark:border-gray-600 pt-4 w-full">
                                <button
                                    onClick={() => handleReset(instance)}
                                    className="text-xs font-semibold px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                >
                                    Reiniciar Sesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/configuration')}
                    className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 !p-0 shadow-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all transform hover:-translate-y-0.5"
                    title="Volver a Configuración"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-600 dark:text-gray-400"
                    >
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Chatbot WhatsApp</h2>
                <button
                    onClick={() => setShowManual(true)}
                    className="p-1 px-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-gray-500 hover:bg-gray-200 transition-all transform hover:-translate-y-0.5"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg px-2 pt-2">
                <button
                    onClick={() => setActiveTab('status')}
                    className={`flex items-center gap-2 px-5 py-3 text-base font-medium transition-colors border-b-4 rounded-t-lg outline-none focus:outline-none ${activeTab === 'status'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                        : 'border-transparent text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                        <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                        <line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                    Estado y Conexión
                </button>
                <button
                    onClick={() => setActiveTab('intents')}
                    className={`flex items-center gap-2 px-5 py-3 text-base font-medium transition-colors border-b-4 rounded-t-lg outline-none focus:outline-none ${activeTab === 'intents'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                        : 'border-transparent text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    Respuestas Automáticas
                </button>
            </div>


            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md min-h-[400px]">
                {activeTab === 'status' ? (
                    <div className="flex flex-col md:flex-row gap-8 items-stretch justify-center h-full">
                        {renderInstance(1)}
                        {renderInstance(2)}
                    </div>
                ) : (
                    <ChatbotIntentosConfig />
                )}
            </div>


            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Chatbot"
                sections={manualSections}
            />
        </div >
    );
};

export default ChatbotConfig;
