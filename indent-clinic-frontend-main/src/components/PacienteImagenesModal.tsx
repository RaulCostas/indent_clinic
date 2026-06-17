import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { formatDate } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PacienteImagenesModalProps {
    isOpen: boolean;
    onClose: () => void;
    pacienteId: number | null;
}

interface Image {
    id: number;
    nombre_archivo: string;
    ruta: string;
    fecha_creacion: string;
    descripcion?: string;
}

interface Proforma {
    id: number;
    numero: number;
    fecha: string;
    total: number;
    estadoPresupuesto?: string;
}

const PacienteImagenesModal: React.FC<PacienteImagenesModalProps> = ({ isOpen, onClose, pacienteId }) => {
    const [proformas, setProformas] = useState<Proforma[]>([]);
    const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null);
    const [images, setImages] = useState<Image[]>([]);
    const [viewingImages, setViewingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeProformaIdForUpload, setActiveProformaIdForUpload] = useState<number | null>(null);
    const [filesToUpload, setFilesToUpload] = useState<{ file: File; descripcion: string }[]>([]);
    const [isUploadingMode, setIsUploadingMode] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (lightboxIndex === null) return;
            if (e.key === 'Escape') setLightboxIndex(null);
            if (e.key === 'ArrowLeft' && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
            if (e.key === 'ArrowRight' && lightboxIndex < images.length - 1) setLightboxIndex(lightboxIndex + 1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, images.length]);

    useEffect(() => {
        if (isOpen && pacienteId) {
            fetchProformas();
            setViewingImages(false);
            setImages([]);
            setSelectedProforma(null);
        }
    }, [isOpen, pacienteId]);

    const fetchProformas = async () => {
        if (!pacienteId) return;
        try {
            const response = await api.get(`/proformas/paciente/${pacienteId}`);
            setProformas(response.data);
        } catch (error) {
            console.error('Error fetching proformas:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron cargar los planes de tratamiento',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeProformaIdForUpload) return;
        const files = Array.from(e.target.files).map(f => ({ file: f, descripcion: '' }));
        setFilesToUpload(files);
        setIsUploadingMode(true);
    };

    const handleUploadAll = async () => {
        if (!activeProformaIdForUpload || filesToUpload.length === 0) return;

        let successCount = 0;

        Swal.fire({
            title: 'Subiendo imágenes...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
            background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        for (const item of filesToUpload) {
            const fd = new FormData();
            fd.append('file', item.file);
            if (item.descripcion) {
                fd.append('descripcion', item.descripcion);
            }
            try {
                await api.post(`/proformas/${activeProformaIdForUpload}/imagenes`, fd, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                successCount++;
            } catch (error) {
                console.error('Error uploading file:', item.file.name, error);
            }
        }

        Swal.close();
        if (successCount > 0) {
            Swal.fire({
                title: 'Éxito',
                text: `${successCount} imágenes subidas correctamente`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
            setIsUploadingMode(false);
            setFilesToUpload([]);
            if (viewingImages && selectedProforma?.id === activeProformaIdForUpload) {
                fetchImages(activeProformaIdForUpload);
            }
        } else {
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron subir las imágenes',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
        setActiveProformaIdForUpload(null);
    };

    const triggerUpload = (proformaId: number) => {
        setActiveProformaIdForUpload(proformaId);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const fetchImages = async (proformaId: number) => {
        try {
            const response = await api.get(`/proformas/${proformaId}/imagenes`);
            setImages(response.data);
            setViewingImages(true);
        } catch (error) {
            console.error('Error fetching images:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron cargar las imágenes',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    const handleViewImages = (proforma: Proforma) => {
        setSelectedProforma(proforma);
        fetchImages(proforma.id);
    };

    const handleBackToList = () => {
        setViewingImages(false);
        setImages([]);
        setSelectedProforma(null);
    };

    const handleDeleteImage = async (imageId: number) => {
        try {
            const result = await Swal.fire({
                title: '¿Estás seguro?',
                text: "No podrás revertir esto",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, eliminar',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });

            if (result.isConfirmed) {
                await api.delete(`/proformas/imagenes/${imageId}`);
                // Refresh list
                if (selectedProforma) {
                    fetchImages(selectedProforma.id);
                }
                Swal.fire({
                    title: 'Eliminado',
                    text: 'La imagen ha sido eliminada.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
                });
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar la imagen',
                icon: 'error',
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4 transition-all">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-gray-100 dark:border-gray-700 pb-3 sm:pb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <span className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-300">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </span>
                        {viewingImages
                            ? `Imágenes del Plan de Tratamiento #${selectedProforma?.numero}`
                            : 'Gestión de Imágenes por Plan de Tratamiento'}
                    </h3>
                    <div className="flex gap-2 sm:gap-3">
                        {viewingImages && (
                            <button
                                onClick={handleBackToList}
                                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-600 shadow-sm"
                            >
                                Volver a lista
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>

                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*"
                />

                {isUploadingMode ? (
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-600">
                        <h4 className="text-md sm:text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Añadir descripción a las imágenes
                        </h4>
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {filesToUpload.map((item, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-xs" title={item.file.name}>
                                            {item.file.name}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Escriba una descripción (Opcional)..."
                                            value={item.descripcion}
                                            onChange={(e) => {
                                                const newFiles = [...filesToUpload];
                                                newFiles[index].descripcion = e.target.value;
                                                setFilesToUpload(newFiles);
                                            }}
                                            className="mt-1.5 w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-600 pt-4">
                            <button
                                onClick={() => { setIsUploadingMode(false); setFilesToUpload([]); }}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                            >
                                <X size={16} /> Cancelar
                            </button>
                            <button
                                onClick={handleUploadAll}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-all hover:translate-y-[-1px]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Subir Todo
                            </button>
                        </div>
                    </div>
                ) : !viewingImages ? (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider"># Plan</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Terminado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {proformas.map((proforma, index) => (
                                    <tr key={proforma.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            #{proforma.numero}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                            {formatDate(proforma.fecha)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${proforma.estadoPresupuesto === 'terminado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {proforma.estadoPresupuesto === 'terminado' ? 'SÍ' : 'NO'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-3">
                                                <button
                                                    onClick={() => triggerUpload(proforma.id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                    Subir
                                                </button>
                                                <button
                                                    onClick={() => handleViewImages(proforma)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Ver
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {proformas.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="text-lg font-medium">No hay planes de tratamiento registrados para este paciente.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div>
                        {images.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-700/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No hay imágenes cargadas para este plan de tratamiento.</p>
                                <button
                                    onClick={() => triggerUpload(selectedProforma!.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md transition-transform hover:-translate-y-0.5"
                                >
                                    Subir Imágenes Ahora
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {images.map((img) => (
                                    <div key={img.id} className="relative group bg-white dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-md transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 flex flex-col">
                                        <div className="aspect-w-4 aspect-h-3 bg-gray-100 dark:bg-gray-800 cursor-pointer overflow-hidden flex-1" onClick={() => setLightboxIndex(images.findIndex(i => i.id === img.id))}>
                                            <img
                                                src={img.ruta}
                                                alt={img.nombre_archivo}
                                                className="object-cover w-full h-48 transition-transform duration-500 group-hover:scale-110"
                                            />
                                        </div>
                                        <div className="p-2 sm:p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium line-clamp-2 leading-snug" title={img.descripcion}>
                                                {img.descripcion ? img.descripcion : <span className="text-gray-400 italic text-xs">Sin descripción</span>}
                                            </p>
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDeleteImage(img.id)}
                                                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 shadow-lg transition-colors transform hover:scale-110"
                                                title="Eliminar imagen"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Botón flotante para agregar más imágenes si ya hay algunas */}
                        {images.length > 0 && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => triggerUpload(selectedProforma!.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold shadow-lg transition-transform hover:-translate-y-1 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Agregar más imágenes
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {lightboxIndex !== null && images[lightboxIndex] && (
                <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm transition-all" onClick={() => setLightboxIndex(null)}>
                    {/* Header & Close */}
                    <div className="absolute top-4 right-4 z-[10000] flex items-center gap-4">
                        <button onClick={() => setLightboxIndex(null)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Cerrar (Esc)">
                            <X size={28} />
                        </button>
                    </div>

                    {/* Title/Description overlay */}
                    <div className="absolute top-4 left-4 right-20 text-white z-[10000] pointer-events-none">
                        <div className="font-medium text-lg drop-shadow-md truncate">
                            {images[lightboxIndex].nombre_archivo}
                        </div>
                        {images[lightboxIndex].descripcion && (
                            <div className="text-sm text-gray-300 drop-shadow-md">
                                {images[lightboxIndex].descripcion}
                            </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                            {lightboxIndex + 1} de {images.length}
                        </div>
                    </div>

                    {/* Main Image */}
                    <img 
                        src={images[lightboxIndex].ruta} 
                        alt={images[lightboxIndex].nombre_archivo} 
                        className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />

                    {/* Navigation Arrows */}
                    {lightboxIndex > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }} 
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all glass-effect"
                            title="Anterior (Flecha Izquierda)"
                        >
                            <ChevronLeft size={36} />
                        </button>
                    )}
                    {lightboxIndex < images.length - 1 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all glass-effect"
                            title="Siguiente (Flecha Derecha)"
                        >
                            <ChevronRight size={36} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PacienteImagenesModal;
