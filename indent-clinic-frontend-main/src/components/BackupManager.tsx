import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { Plus, Download } from 'lucide-react';


interface BackupInfo {
    filename: string;
    size: number;
    createdAt: string;
    path: string;
}

const BackupManager: React.FC = () => {
    const navigate = useNavigate();
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [customPath, setCustomPath] = useState('');

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        try {
            const response = await api.get<BackupInfo[]>('/backup/list');
            setBackups(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching backups:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los backups'
            });
        }
    };

    const handleCreateBackup = async () => {
        const result = await Swal.fire({
            title: '¿Crear backup de la base de datos?',
            text: 'Se creará un archivo de respaldo con todos los datos actuales',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, crear backup',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                const data = customPath ? { customPath } : {};
                const response = await api.post<BackupInfo>('/backup/create', data);

                await Swal.fire({
                    icon: 'success',
                    title: '¡Backup creado!',
                    html: `<p><strong>Archivo:</strong> ${response.data.filename}</p>
                           <p><strong>Ubicación:</strong> ${response.data.path}</p>
                           <p><strong>Tamaño:</strong> ${formatFileSize(response.data.size)}</p>`,
                    confirmButtonText: 'OK'
                });

                // Clear custom path after successful backup
                setCustomPath('');
                fetchBackups();
            } catch (error: any) {
                console.error('Error creating backup:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'No se pudo crear el backup. Verifica que PostgreSQL esté instalado y configurado.'
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleRestoreBackup = async (filename: string) => {
        const result = await Swal.fire({
            title: '⚠️ ¿Restaurar base de datos?',
            html: `<p><strong>ADVERTENCIA:</strong> Esta acción eliminará TODOS los datos actuales y los reemplazará con los del backup.</p>
                   <p>Archivo: <strong>${filename}</strong></p>
                   <p style="color: red;">Esta acción NO se puede deshacer.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, restaurar',
            cancelButtonText: 'Cancelar',
            input: 'checkbox',
            inputPlaceholder: 'Entiendo que esto eliminará todos los datos actuales',
            inputValidator: (result) => {
                return !result && 'Debes confirmar que entiendes las consecuencias';
            }
        });

        if (result.isConfirmed) {
            setLoading(true);
            try {
                await api.post(`/backup/restore/${filename}`);

                await Swal.fire({
                    icon: 'success',
                    title: '¡Base de datos restaurada!',
                    text: 'La aplicación se recargará en 3 segundos...',
                    timer: 3000,
                    showConfirmButton: false
                });

                // Reload the application after restore
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } catch (error: any) {
                console.error('Error restoring backup:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'No se pudo restaurar el backup'
                });
                setLoading(false);
            }
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        const result = await Swal.fire({
            title: '¿Eliminar backup?',
            text: `Archivo: ${filename}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/backup/${filename}`);

                await Swal.fire({
                    icon: 'success',
                    title: '¡Backup eliminado!',
                    showConfirmButton: false,
                    timer: 1500
                });

                fetchBackups();
            } catch (error) {
                console.error('Error deleting backup:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo eliminar el backup'
                });
            }
        }
    };

    const handleDownloadBackup = async (filename: string) => {
        try {
            const response = await api.get(`/backup/download/${filename}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading backup:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo descargar el backup'
            });
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/configuration')}
                            className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 !p-0 shadow-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200"
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
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </span>
                            Backup de Base de Datos
                        </h1>
                    </div>
                </div>

                {/* Create Backup Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Crear Nuevo Backup</h2>

                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                            Ruta personalizada (opcional)
                        </label>
                        <input
                            type="text"
                            value={customPath}
                            onChange={(e) => setCustomPath(e.target.value)}
                            placeholder="Dejar VACÍO para usar ruta por defecto del servidor"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ⚠️ Si especificas una ruta personalizada, el backup NO aparecerá en la lista de abajo (solo se listan backups de la carpeta por defecto)
                        </p>
                    </div>

                    <button
                        onClick={handleCreateBackup}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {loading ? 'Creando backup...' : 'Crear Backup Ahora'}
                    </button>
                </div>

                {/* Backups List */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Backups Disponibles</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Total: {backups.length} backup{backups.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            onClick={fetchBackups}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                            title="Recargar lista"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Recargar
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        {backups.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Archivo</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tamaño</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha de Creación</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {backups.map((backup) => (
                                        <tr key={backup.filename} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {backup.filename}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                {formatFileSize(backup.size)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                {formatDate(backup.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleDownloadBackup(backup.filename)}
                                                        disabled={loading}
                                                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                                        title="Descargar"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRestoreBackup(backup.filename)}
                                                        disabled={loading}
                                                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                                        title="Restaurar"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBackup(backup.filename)}
                                                        disabled={loading}
                                                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold p-2.5 rounded-lg border-none flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                                        title="Eliminar"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                                <p className="text-lg font-medium">No hay backups disponibles</p>
                                <p className="text-sm mt-1">Crea tu primer backup usando el botón de arriba</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupManager;
