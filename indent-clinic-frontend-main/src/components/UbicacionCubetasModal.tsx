
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { TrabajoLaboratorio } from '../types';

interface UbicacionCubetasModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const UbicacionCubetasModal: React.FC<UbicacionCubetasModalProps> = ({ isOpen, onClose }) => {
    const [trabajosFuera, setTrabajosFuera] = useState<TrabajoLaboratorio[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTrabajosConCubetas();
        }
    }, [isOpen]);

    const fetchTrabajosConCubetas = async () => {
        setLoading(true);
        try {
            // 1. Fetch ALL Cubetas that are 'FUERA'
            const cubetasResponse = await api.get('/cubetas?dentro_fuera=FUERA&limit=1000');
            const cubetasFueraData = Array.isArray(cubetasResponse.data.data) ? cubetasResponse.data.data : cubetasResponse.data;
            console.log('🔍 DEBUG: Cubetas FUERA:', cubetasFueraData);
            console.log('🔍 DEBUG: First cubeta full object:', JSON.stringify(cubetasFueraData[0], null, 2));

            // 2. Fetch recent jobs to try to link, just in case valuable info is there
            const trabajosResponse = await api.get('/trabajos-laboratorios?limit=3000');
            const jobs = Array.isArray(trabajosResponse.data.data) ? trabajosResponse.data.data : trabajosResponse.data;
            console.log('🔍 DEBUG: Total jobs fetched:', jobs.length);
            console.log('🔍 DEBUG: First job full object:', JSON.stringify(jobs[0], null, 2));
            console.log('🔍 DEBUG: All job idCubeta values:', jobs.map((j: any) => ({ jobId: j.id, idCubeta: j.idCubeta, cubetaId: j.cubeta?.id })));

            // Map jobs by cubeta ID. Prefer active (non-terminated) jobs.
            const jobsByCubeta = new Map<number, any>();
            jobs.forEach((j: any) => {
                // Try to get cubeta ID from column or relation object
                const cId = Number(j.idCubeta || j.cubeta?.id);
                // Skip if no valid cubeta ID
                if (!cId) return;

                // Since the list comes ordered by ID DESC (newest first), 
                // the first job we encounter for a cubeta is the most recent one.
                if (!jobsByCubeta.has(cId)) {
                    jobsByCubeta.set(cId, j);
                    console.log(`🔍 DEBUG: Mapped cubeta ID ${cId} to job ID ${j.id}`);
                }
            });

            console.log('🔍 DEBUG: Jobs by cubeta map:', jobsByCubeta);

            // 3. Construct the display list based primarily on CUBETAS
            const combinedData = cubetasFueraData.map((cubeta: any) => {
                const job = jobsByCubeta.get(Number(cubeta.id));
                console.log(`🔍 DEBUG: For cubeta ${cubeta.id} (${cubeta.codigo}), found job:`, job);
                return {
                    id: job ? job.id : `orphaned-${cubeta.id}`,
                    cubeta: cubeta,
                    laboratorio: job ? job.laboratorio : null,
                    precioLaboratorio: job ? job.precioLaboratorio : null,
                    paciente: job ? job.paciente : null,
                    // Mock properties if job is missing
                    estado: job ? job.estado : 'Desconocido',
                } as any; // Cast to any or TrabajoLaboratorio to satisfy TS
            });

            console.log('🔍 DEBUG: Final combined data:', combinedData);
            setTrabajosFuera(combinedData);
        } catch (error) {
            console.error('Error fetching modal data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                    <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4" id="modal-title">
                                    Ubicación de Cubetas (FUERA)
                                </h3>

                                <div className="mt-2 overflow-x-auto max-h-[60vh]">
                                    {loading ? (
                                        <div className="text-center py-4 text-gray-500">Cargando...</div>
                                    ) : (
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cubeta</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Laboratorio</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Trabajo</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ubicación</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                {trabajosFuera.length > 0 ? (
                                                    trabajosFuera.map((trabajo) => (
                                                        <tr key={trabajo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                                {trabajo.cubeta?.descripcion}
                                                                <span className="text-gray-500 text-xs ml-1">({trabajo.cubeta?.codigo})</span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                                {trabajo.laboratorio?.laboratorio || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                                {trabajo.precioLaboratorio?.detalle || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                                {trabajo.paciente ? `${trabajo.paciente.nombre} ${trabajo.paciente.paterno} ` : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                                                    {trabajo.cubeta?.dentro_fuera}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                            No hay cubetas fuera.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UbicacionCubetasModal;
