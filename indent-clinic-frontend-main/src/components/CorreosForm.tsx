import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { User } from '../types';
import { Plus } from 'lucide-react';


interface CorreosFormProps {
    currentUser: User | null;
    onClose: () => void;
}

const CorreosForm: React.FC<CorreosFormProps> = ({ currentUser, onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [destinatarioId, setDestinatarioId] = useState<number | ''>('');
    const [copiaId, setCopiaId] = useState<number | ''>('');
    const [asunto, setAsunto] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            // Filter out current user from potential recipients to avoid self-email confusion (optional, but good UX)
            // But sometimes people email themselves. Let's keep all.
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !destinatarioId) return;

        setSending(true);
        try {
            await api.post('/correos', {
                remitente_id: currentUser.id,
                destinatario_id: Number(destinatarioId),
                copia_id: copiaId ? Number(copiaId) : undefined,
                asunto,
                mensaje
            });
            await Swal.fire({
                icon: 'success',
                title: 'Correo Enviado',
                text: 'El correo ha sido enviado exitosamente',
                timer: 1500,
                showConfirmButton: false
            });
            onClose();
        } catch (error) {
            console.error('Error sending email:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al enviar el correo.'
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh]">
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-lg">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Nuevo Mensaje</h3>

                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
                    {/* From (Read-only) */}
                    <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center">
                        <label className="w-full sm:w-20 text-gray-500 font-medium text-left sm:text-right mb-1 sm:mb-0 sm:mr-4 text-sm">De:</label>
                        <div className="flex-1 text-gray-800 font-semibold bg-gray-100 px-3 py-2 rounded border border-gray-200 text-sm">
                            {currentUser?.name} &lt;{currentUser?.email}&gt;
                        </div>
                    </div>

                    {/* To */}
                    <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center">
                        <label className="w-full sm:w-20 text-gray-500 font-medium text-left sm:text-right mb-1 sm:mb-0 sm:mr-4 text-sm">Para:</label>
                        <select
                            value={destinatarioId}
                            onChange={(e) => setDestinatarioId(Number(e.target.value))}
                            required
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        >
                            <option value="">Seleccionar destinatario...</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* CC */}
                    <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center">
                        <label className="w-full sm:w-20 text-gray-500 font-medium text-left sm:text-right mb-1 sm:mb-0 sm:mr-4 text-sm">Copia:</label>
                        <select
                            value={copiaId}
                            onChange={(e) => setCopiaId(e.target.value ? Number(e.target.value) : '')}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        >
                            <option value="">(Opcional) Seleccionar copia...</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subject */}
                    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center relative">
                        <label className="w-full sm:w-20 text-gray-500 font-medium text-left sm:text-right mb-1 sm:mb-0 sm:mr-4 text-sm">Asunto:</label>
                        <input
                            type="text"
                            value={asunto}
                            onChange={(e) => setAsunto(e.target.value)}
                            required
                            placeholder="Asunto del correo"
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                        <div className="absolute left-0 sm:left-[6.5rem] top-8 sm:top-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                        </div>
                    </div>

                    {/* Message Body */}
                    <div className="flex-1 flex flex-col relative">
                        <textarea
                            value={mensaje}
                            onChange={(e) => setMensaje(e.target.value)}
                            required
                            placeholder="Escribe tu mensaje aquí..."
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-4 py-4 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none h-48 sm:h-64 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700"
                        />
                        <div className="absolute left-3 top-4 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                    </div>

                    <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl mt-auto -mx-6 -mb-6">
                        <button
                            type="submit"
                            disabled={sending}
                            className={`px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-md transition-all transform hover:-translate-y-0.5 hover:bg-green-700 flex items-center gap-2 text-sm ${sending ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {sending ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Enviar Mensaje
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
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

export default CorreosForm;
