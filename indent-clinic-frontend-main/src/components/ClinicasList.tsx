import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ManualModal, { type ManualSection } from './ManualModal';
import Pagination from './Pagination';
import Swal from 'sweetalert2';
import { useClinica } from '../context/ClinicaContext';
import ClinicaForm from './ClinicaForm';
import { Printer, Hospital } from 'lucide-react';
import { getLogoUrl } from '../utils/formatters';


interface Clinica {
    id: number;
    nombre: string;
    direccion?: string;
    telefono?: string;
    codigoPaisCelular?: string;
    celular?: string;
    activo: boolean;
    horario_atencion?: string;
    createdAt?: string;
    logo?: string;
}



const ClinicasList: React.FC = () => {
    const navigate = useNavigate();
    const { recargarClinicas } = useClinica();
    const [clinicas, setClinicas] = useState<Clinica[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedEditId, setSelectedEditId] = useState<number | null>(null);
    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Clínicas',
            content: 'Aquí puede administrar las sucursales o clínicas del sistema. Use el botón "+ Nueva Clínica" para registrar una nueva.'
        },
        {
            title: 'Selector Global',
            content: 'Una vez creadas las clínicas, aparecerá un selector "🏥" en el header que permite filtrar toda la información del sistema por clínica.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para clínicas activas, el botón rojo cambia el estado a "Inactivo". Para clínicas inactivas, aparece un botón verde que permite reactivarlas.'
        }];

    useEffect(() => {
        fetchClinicas();
    }, [currentPage, searchTerm]);

    const fetchClinicas = async () => {
        try {
            // El backend de clínicas devuelve un array plano, adaptamos a paginado manual
            const response = await api.get<Clinica[]>('/clinicas');
            let all = response.data;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                all = all.filter(c =>
                    c.nombre.toLowerCase().includes(term) ||
                    (c.direccion || '').toLowerCase().includes(term) ||
                    (c.telefono || '').includes(term) ||
                    (c.celular || '').includes(term)
                );
            }

            setTotal(all.length);
            setTotalPages(Math.ceil(all.length / limit) || 1);
            const start = (currentPage - 1) * limit;
            setClinicas(all.slice(start, start + limit));
        } catch (error) {
            console.error('Error fetching clinicas:', error);
            Swal.fire('Error', 'Error al cargar las clínicas', 'error');
        }
    };



    const handleDesactivar = async (c: Clinica) => {
        const result = await Swal.fire({
            title: '¿Dar de baja clínica?',
            text: `La clínica "${c.nombre}" pasará a estado Inactivo.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await api.delete(`/clinicas/${c.id}`);
                await Swal.fire({ icon: 'success', title: '¡Clínica dada de baja!', showConfirmButton: false, timer: 1500 });
                fetchClinicas();
                recargarClinicas();
            } catch {
                Swal.fire('Error', 'No se pudo dar de baja', 'error');
            }
        }
    };

    const handleReactivar = async (c: Clinica) => {
        const result = await Swal.fire({
            title: '¿Reactivar clínica?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await api.patch(`/clinicas/${c.id}`, { activo: true });
                await Swal.fire({ icon: 'success', title: '¡Clínica reactivada!', showConfirmButton: false, timer: 1500 });
                fetchClinicas();
                recargarClinicas();
            } catch {
                Swal.fire('Error', 'No se pudo reactivar', 'error');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePrint = async () => {
        try {
            const response = await api.get<Clinica[]>('/clinicas');
            let all = response.data;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                all = all.filter(c =>
                    c.nombre.toLowerCase().includes(term) ||
                    (c.direccion || '').toLowerCase().includes(term)
                );
            }

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) { document.body.removeChild(iframe); return; }


            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lista de Clínicas</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        @page { size: A4; margin: 2cm 1.5cm 3cm 1.5cm; }
                        body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #1e293b; }
                        .header { display: flex; align-items: center; justify-content: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
                        h1 { color: #1e3a8a; margin: 0; font-size: 26px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                        table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                        th { background-color: #2563eb; color: white; padding: 12px 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #1d4ed8; }
                        td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
                        tr:last-child td { border-bottom: none; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .status-active { color: #059669; font-weight: 600; }
                        .status-inactive { color: #dc2626; font-weight: 600; }
                        @media print {
                            th { background-color: #2563eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            tr:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Lista de Clínicas</h1>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombre</th>
                                <th>Dirección</th>
                                <th>Teléfono</th>
                                <th>Celular</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${all.map((c, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${c.nombre}</td>
                                    <td>${c.direccion || '—'}</td>
                                    <td>${c.telefono || '—'}</td>
                                    <td>${c.codigoPaisCelular || ''} ${c.celular || '—'}</td>
                                    <td class="${c.activo ? 'status-active' : 'status-inactive'}">${c.activo ? 'Activo' : 'Inactivo'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            const doPrint = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(iframe)) document.body.removeChild(iframe);
                    }, 2000);
                }
            };

            doPrint();
        } catch (error: any) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión: ' + (error.message || 'Error desconocido'));
        }
    };

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
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
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <Hospital className="text-blue-600" size={32} />
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                                Sedes Clínicas
                            </h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión y configuración de las sucursales del sistema</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-center md:justify-end items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>

                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handlePrint}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                    <button
                        onClick={() => { setSelectedEditId(null); setIsFormOpen(true); }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nueva Clínica
                    </button>
                </div>
            </div>



            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, dirección, teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2 text-gray-600 dark:text-gray-400 text-sm">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Logo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dirección</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Teléfono</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Celular</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {clinicas.map((c, index) => (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                    {(currentPage - 1) * limit + index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-700 border dark:border-gray-600 flex items-center justify-center overflow-hidden shadow-sm">
                                        {c.logo ? (
                                            <img src={getLogoUrl(c.logo) || ''} alt={c.nombre} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                                    {c.nombre}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                                    {c.direccion || <span className="text-gray-400 italic">—</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                    {c.telefono || <span className="text-gray-400 italic">—</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                    {c.celular
                                        ? <span>{c.codigoPaisCelular || '+591'} {c.celular}</span>
                                        : <span className="text-gray-400 italic">—</span>
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded text-sm ${c.activo ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                        {c.activo ? 'activo' : 'inactivo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                    <button
                                        onClick={() => { setSelectedEditId(c.id); setIsFormOpen(true); }}
                                        className="bg-[#ffc107] hover:bg-yellow-600 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {c.activo ? (
                                        <button
                                            onClick={() => handleDesactivar(c)}
                                            className="bg-[#dc3545] hover:bg-red-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            title="Dar de baja"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivar(c)}
                                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                            title="Reactivar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {clinicas.length === 0 && (
                <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay clínicas registradas'}
                </p>
            )}

            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Clínicas"
                sections={manualSections}
            />

            <ClinicaForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                id={selectedEditId}
                onSaveSuccess={() => {
                    fetchClinicas();
                    setIsFormOpen(false);
                }}
            />
        </div>
    );
};

export default ClinicasList;
