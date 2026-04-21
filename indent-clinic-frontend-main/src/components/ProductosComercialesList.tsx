import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';
import Pagination from './Pagination';
import type { ProductoComercial } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import ProductoComercialForm from './ProductoComercialForm';
import { useClinica } from '../context/ClinicaContext';
import { Package, Search, Plus, Edit2, Power, PowerOff, FileText, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getLocalDateString } from '../utils/dateUtils';

interface PaginatedResponse {
    data: ProductoComercial[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const ProductosComercialesList: React.FC = () => {
    const { clinicaSeleccionada } = useClinica();
    const [items, setItems] = useState<ProductoComercial[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | string | null>(null);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Catálogo de Productos',
            content: 'Aquí puede gestionar los productos destinados a la venta (cepillos, cremas, etc.).'
        },
        {
            title: 'Control de Stock',
            content: 'Los productos con stock bajo aparecerán resaltados en rojo.'
        },
        {
            title: 'Estados',
            content: 'Puede desactivar productos para que no aparezcan en el Punto de Venta sin borrarlos permanentemente.'
        }];

    useEffect(() => {
        fetchProductos();
    }, [currentPage, searchTerm, clinicaSeleccionada]);

    const fetchProductos = async (isExport = false) => {
        try {
            if (!isExport) setLoading(true);
            const params = new URLSearchParams({
                page: isExport ? '1' : currentPage.toString(),
                limit: isExport ? '9999' : limit.toString(),
            });

            if (clinicaSeleccionada) {
                params.append('clinicaId', clinicaSeleccionada.toString());
            }

            if (searchTerm) {
                params.append('search', searchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/productos-comerciales?${params}`);
            if (isExport) return response.data.data;
            
            setItems(response.data.data || []);
            setTotalPages(response.data.totalPages || 1);
            setTotal(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching productos:', error);
            if (!isExport) setItems([]);
            return [];
        } finally {
            if (!isExport) setLoading(false);
        }
    };

    const handleToggleStatus = async (item: ProductoComercial) => {
        const newStatus = item.estado.toLowerCase() === 'activo' ? 'inactivo' : 'activo';
        const result = await Swal.fire({
            title: `¿${newStatus === 'activo' ? 'Reactivar' : 'Desactivar'} producto?`,
            text: `El producto quedará ${newStatus.toLowerCase()}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'activo' ? '#16a34a' : '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/productos-comerciales/${item.id}`, { estado: newStatus });
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: `El producto ha sido ${newStatus === 'activo' ? 'reactivado' : 'desactivado'}.`,
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchProductos();
            } catch (error) {
                console.error('Error toggling status:', error);
                Swal.fire('Error', 'No se pudo cambiar el estado.', 'error');
            }
        }
    };

    const exportToExcel = async () => {
        const allItems = await fetchProductos(true);
        if (!Array.isArray(allItems)) return;

        const excelData = allItems.map(item => ({
            'Nombre': item.nombre,
            'Costo': item.costo,
            'Precio Venta': item.precio_venta,
            'Stock Actual': item.stock_actual,
            'Stock Mínimo': item.stock_minimo,
            'Estado': item.estado
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ProductosComerciales');
        XLSX.writeFile(wb, `productos_comerciales_${getLocalDateString()}.xlsx`);
    };

    const exportToPDF = async () => {
        const allItems = await fetchProductos(true);
        if (!Array.isArray(allItems)) return;

        const doc = new jsPDF();
        doc.text('Lista de Productos Comerciales', 14, 15);
        autoTable(doc, {
            head: [['Nombre', 'Costo', 'Precio Venta', 'Stock', 'Mínimo', 'Estado']],
            body: allItems.map(i => [i.nombre, i.costo, i.precio_venta, i.stock_actual, i.stock_minimo, i.estado]),
            startY: 20
        });
        doc.save(`productos_comerciales_${getLocalDateString()}.pdf`);
    };

    const handlePrint = async () => {
        const allItems = await fetchProductos(true);
        if (!Array.isArray(allItems)) return;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        const content = `
            <html>
                <head><title>Imprimir Productos</title><style>table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f2f2f2;}</style></head>
                <body>
                    <h2>Catálogo de Productos Comerciales</h2>
                    <table>
                        <thead><tr><th>Producto</th><th>Stock</th><th>Costo</th><th>Precio</th><th>Estado</th></tr></thead>
                        <tbody>${allItems.map(i => `<tr><td>${i.nombre}</td><td>${i.stock_actual}</td><td>${i.costo}</td><td>${i.precio_venta}</td><td>${i.estado}</td></tr>`).join('')}</tbody>
                    </table>
                </body>
            </html>`;
        doc.open();
        doc.write(content);
        doc.close();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    };

    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 transition-colors duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Package className="text-blue-600" size={32} />
                        Catálogo de Productos
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestione inventario de venta comercial</p>
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
                            onClick={exportToExcel}
                            className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 active:scale-95"
                            title="Exportar a Excel"
                        >
                            <FileText size={18} />
                            <span className="text-sm">Excel</span>
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 active:scale-95"
                            title="Exportar a PDF"
                        >
                            <Download size={18} />
                            <span className="text-sm">PDF</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2 active:scale-95"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-1 self-center"></div>

                    <button
                        onClick={() => {
                            setSelectedId(null);
                            setIsFormOpen(true);
                        }}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 active:scale-95"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col w-full md:w-1/3">
                    <div className="flex gap-2 mb-2">
                        <input
                            type="text"
                            placeholder="Buscar por nombre de producto..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="flex-grow pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs ml-1">
                        Mostrando {items.length === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">#</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Nombre del Producto</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Stock (Act/Min)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Costo (Bs.)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Venta (Bs.)</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Estado</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-widest">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Cargando productos...</td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 italic">
                                    No se encontraron productos comerciales.
                                </td>
                            </tr>
                        ) : (
                            items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{(currentPage - 1) * limit + index + 1}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                                        {item.nombre}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                                            item.stock_actual <= item.stock_minimo 
                                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                            : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                            {item.stock_actual} / {item.stock_minimo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {Number(item.costo).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                                        {Number(item.precio_venta).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                            item.estado.toLowerCase() === 'activo' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                        }`}>
                                            {item.estado.toLowerCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex justify-center gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedId(item.id);
                                                setIsFormOpen(true);
                                            }}
                                            className="p-2.5 bg-[#ffc107] text-white rounded-lg hover:bg-yellow-600 shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(item)}
                                            className={`p-2.5 rounded-lg text-white shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center ${
                                                item.estado.toLowerCase() === 'activo' 
                                                ? 'bg-[#dc3545] hover:bg-red-700' 
                                                : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                            title={item.estado.toLowerCase() === 'activo' ? 'Desactivar' : 'Activar'}
                                        >
                                            {item.estado.toLowerCase() === 'activo' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
            />

            <ProductoComercialForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                id={selectedId}
                onSaveSuccess={() => fetchProductos()}
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Catálogo Comercial"
                sections={manualSections}
            />
        </div>
    );
};

export default ProductosComercialesList;
