import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import api from '../services/api';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import type { GrupoInventario } from '../types';
import GrupoInventarioForm from './GrupoInventarioForm';
import { Printer, Package } from 'lucide-react';


interface PaginatedResponse {
    data: GrupoInventario[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const GrupoInventarioList: React.FC = () => {
    const navigate = useNavigate();
    const [grupos, setGrupos] = useState<GrupoInventario[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Grupos',
            content: 'Aquí puede administrar los grupos de inventario para categorizar productos (ej. Medicamentos, Suministros). Use "+ Nuevo Grupo" para crear uno.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para grupos activos, el botón rojo cambia el estado a "Inactivo". Para grupos inactivos, aparece un botón verde que permite reactivarlos.'
        }];

    useEffect(() => {
        fetchGrupos();
    }, [currentPage, searchTerm]);

    const fetchGrupos = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/grupo-inventario?${params}`);

            const data = response.data?.data || [];
            const totalPages = response.data?.totalPages || 1;
            const total = response.data?.total || 0;

            setGrupos(data);
            setTotalPages(totalPages);
            setTotal(total);
        } catch (error) {
            console.error('Error fetching grupos:', error);
            setGrupos([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja grupo?',
            text: 'El grupo pasará a estado inactivo.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/grupo-inventario/${id}`, { estado: 'inactivo' });
                await Swal.fire({ icon: 'success', title: '¡Grupo dado de baja!', showConfirmButton: false, timer: 1500 });
                fetchGrupos();
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo dar de baja', 'error');
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar grupo?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/grupo-inventario/${id}`, { estado: 'activo' });
                await Swal.fire({ icon: 'success', title: '¡Grupo reactivado!', showConfirmButton: false, timer: 1500 });
                fetchGrupos();
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'No se pudo reactivar', 'error');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleCreate = () => {
        setSelectedId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id: number) => {
        setSelectedId(id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedId(null);
    };

    const handleSaveSuccess = () => {
        fetchGrupos();
        handleCloseModal();
    };



    const handlePrint = async () => {
        try {
            // Fetch ALL records for printing
            const response = await api.get<PaginatedResponse>(`/grupo-inventario?page=1&limit=9999${searchTerm ? `&search=${searchTerm}` : ''}`);
            const allGrupos = response.data?.data || [];

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                document.body.removeChild(iframe);
                return;
            }


            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lista de Grupos de Inventario</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                        
                        @page {
                            size: A4;
                            margin: 2cm 1.5cm 3cm 1.5cm;
                        }
                        
                        body {
                            font-family: 'Inter', sans-serif;
                            margin: 0;
                            padding: 0;
                            color: #1e293b;
                        }
                        
                        .header {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 3px solid #3b82f6;
                        }
                        
                        h1 {
                            color: #1e3a8a;
                            margin: 0;
                            font-size: 26px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: separate;
                            border-spacing: 0;
                            margin-top: 20px;
                            font-size: 13px;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            overflow: hidden;
                        }
                        
                        th {
                            background-color: #2563eb;
                            color: white;
                            padding: 12px 10px;
                            text-align: left;
                            font-weight: 600;
                            border-bottom: 1px solid #1d4ed8;
                        }
                        
                        td {
                            padding: 10px;
                            border-bottom: 1px solid #e2e8f0;
                            color: #334155;
                        }
                        
                        tr:last-child td {
                            border-bottom: none;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f8fafc;
                        }
                        
                        .status-active {
                            color: #059669;
                            font-weight: 600;
                        }
                        
                        .status-inactive {
                            color: #dc2626;
                            font-weight: 600;
                        }
                        
                        @media print {
                            th {
                                background-color: #2563eb !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            tr:nth-child(even) {
                                background-color: #f8fafc !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Lista de Grupos de Inventario</h1>
                    </div>
                   
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Grupo</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allGrupos.map((g: GrupoInventario, index: number) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${g.grupo || '-'}</td>
                                    <td class="${g.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                                        ${g.estado ? (g.estado.charAt(0).toUpperCase() + g.estado.slice(1)) : 'Inactivo'}
                                    </td>
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
                    // Remove iframe after sufficient time
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 2000);
                }
            };

            doPrint();
        } catch (error: any) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión: ' + (error.message || 'Error desconocido'));
        }
    };

    if (loading) {
        return <div className="text-center p-4">Cargando...</div>;
    }

    return (
        <div className="content-card p-6 bg-gray-50 dark:bg-gray-800 min-h-screen">
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
                            <Package className="text-blue-600" size={32} />
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                                Grupos de Inventario
                            </h2>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de categorías y grupos de productos</p>
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
                        onClick={handleCreate}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Grupo
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar grupo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setCurrentPage(1);
                            }}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grupo</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {grupos.map((grupo, index) => (
                            <tr key={grupo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{grupo.grupo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded text-sm ${grupo.estado === 'activo'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                        }`}>
                                        {grupo.estado}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                    <button
                                        onClick={() => handleEdit(grupo.id)}
                                        className="p-2.5 bg-amber-400 hover:bg-amber-500 text-white rounded-lg inline-flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {grupo.estado === 'activo' ? (
                                        <button
                                            onClick={() => handleDelete(grupo.id)}
                                            className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg inline-flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Dar de baja"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivate(grupo.id)}
                                            className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg inline-flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5"
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
            {grupos.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay grupos registrados.'}
                </div>
            )}

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Grupos de Inventario"
                sections={manualSections}
            />

            {/* Modal Form */}
            <GrupoInventarioForm
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                id={selectedId}
                onSaveSuccess={handleSaveSuccess}
            />
        </div>
    );
};

export default GrupoInventarioList;
