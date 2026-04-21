import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';
import { formatDate } from '../utils/dateUtils';
import { Image as ImageIcon, ArrowLeft, Upload, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ProformaSlim { id: number; numero: number; fecha: string; total: number }
interface ImgData { id: number; nombre_archivo: string; ruta: string; fecha_creacion: string; descripcion?: string }

const PacienteTabImagenes: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [proformas, setProformas] = useState<ProformaSlim[]>([]);
    const [selectedPF, setSelectedPF] = useState<ProformaSlim | null>(null);
    const [images, setImages] = useState<ImgData[]>([]);
    const [loadingPFs, setLoadingPFs] = useState(true);
    const [loadingImgs, setLoadingImgs] = useState(false);
    const [filesToUpload, setFilesToUpload] = useState<{ file: File; descripcion: string }[]>([]);
    const [isUploadingMode, setIsUploadingMode] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const isDark = () => document.documentElement.classList.contains('dark');

    useEffect(() => {
        if (!id) return;
        api.get(`/proformas/paciente/${id}`)
            .then(r => setProformas(r.data))
            .catch(console.error)
            .finally(() => setLoadingPFs(false));
    }, [id]);

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

    const fetchImages = async (pfId: number) => {
        setLoadingImgs(true);
        try {
            const r = await api.get(`/proformas/${pfId}/imagenes`);
            setImages(r.data);
        } catch { setImages([]); }
        finally { setLoadingImgs(false); }
    };

    const handleSelectPF = (pf: ProformaSlim) => {
        setSelectedPF(pf);
        fetchImages(pf.id);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setFilesToUpload(Array.from(e.target.files).map(f => ({ file: f, descripcion: '' })));
        setIsUploadingMode(true);
    };

    const handleUploadAll = async () => {
        if (!selectedPF || !filesToUpload.length) return;
        Swal.fire({ title: 'Subiendo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        let ok = 0;
        for (const item of filesToUpload) {
            const fd = new FormData();
            fd.append('file', item.file);
            if (item.descripcion) fd.append('descripcion', item.descripcion);
            try {
                await api.post(`/proformas/${selectedPF.id}/imagenes`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                ok++;
            } catch { /* skip */ }
        }
        Swal.close();
        if (ok > 0) {
            setIsUploadingMode(false);
            setFilesToUpload([]);
            if (fileRef.current) fileRef.current.value = '';
            fetchImages(selectedPF.id);
            Swal.fire({ icon: 'success', title: `${ok} imagen(es) subida(s)`, timer: 1500, showConfirmButton: false, background: isDark() ? '#1f2937' : '#fff', color: isDark() ? '#f3f4f6' : '#000' });
        } else {
            Swal.fire({ icon: 'error', title: 'Error al subir imágenes', background: isDark() ? '#1f2937' : '#fff', color: isDark() ? '#f3f4f6' : '#000' });
        }
    };

    const handleDeleteImage = async (imgId: number) => {
        const r = await Swal.fire({ title: '¿Eliminar imagen?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', background: isDark() ? '#1f2937' : '#fff', color: isDark() ? '#f3f4f6' : '#000' });
        if (r.isConfirmed) {
            await api.delete(`/proformas/imagenes/${imgId}`);
            if (selectedPF) fetchImages(selectedPF.id);
        }
    };

    // — Upload mode ───────────────────────────────────────────────────────────
    if (isUploadingMode && selectedPF) {
        return (
            <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-4">
                    <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Upload size={18} className="text-blue-500" /> Subir Imágenes — Plan #{selectedPF.numero}
                    </h2>
                    <button onClick={() => { setIsUploadingMode(false); setFilesToUpload([]); }}
                        className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm">
                        Cancelar
                    </button>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {filesToUpload.map((item, i) => (
                        <div key={i} className="flex gap-3 items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border dark:border-gray-600">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={20} className="text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.file.name}</div>
                                <input
                                    type="text"
                                    placeholder="Descripción (opcional)"
                                    value={item.descripcion}
                                    onChange={e => {
                                        const f = [...filesToUpload];
                                        f[i].descripcion = e.target.value;
                                        setFilesToUpload(f);
                                    }}
                                    className="mt-1 w-full border dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg p-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-5 flex justify-end">
                    <button onClick={handleUploadAll}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                        <Upload size={16} /> Subir Todo
                    </button>
                </div>
            </div>
        );
    }

    // — Image gallery mode ────────────────────────────────────────────────────
    if (selectedPF) {
        return (
            <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
                <input type="file" ref={fileRef} multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
                <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setSelectedPF(null); setImages([]); }}
                            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                            <ArrowLeft size={16} /> Volver a planes
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <ImageIcon size={18} className="text-blue-500" />
                            Imágenes — Plan #{selectedPF.numero}
                        </h2>
                    </div>
                    <button onClick={() => fileRef.current?.click()}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm">
                        <Plus size={16} /> Agregar Imágenes
                    </button>
                </div>

                {loadingImgs ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <ImageIcon size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">No hay imágenes para este plan.</p>
                        <button onClick={() => fileRef.current?.click()}
                            className="bg-[#3498db] hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5">
                            Subir primera imagen
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map(img => (
                            <div key={img.id} className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all">
                                <img src={img.ruta} alt={img.nombre_archivo}
                                    className="w-full h-40 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                                    onClick={() => setLightboxIndex(images.findIndex(i => i.id === img.id))} />
                                {img.descripcion && (
                                    <div className="p-2 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border-t dark:border-gray-700 truncate">
                                        {img.descripcion}
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDeleteImage(img.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-lg transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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
    }

    // — Plan selector ─────────────────────────────────────────────────────────
    return (
        <div className="content-card bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2">
                <ImageIcon size={22} className="text-blue-500" /> Imágenes por Plan de Tratamiento
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Seleccione un plan para ver y gestionar sus imágenes.</p>
            {loadingPFs ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : proformas.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400">
                    <ImageIcon size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No hay planes de tratamiento. Cree uno primero.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {proformas.map(pf => (
                        <button key={pf.id} onClick={() => handleSelectPF(pf)}
                            className="text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <ImageIcon size={18} className="text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-800 dark:text-white text-sm">Plan #{pf.numero}</div>
                                    <div className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-0.5">Ver imágenes →</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PacienteTabImagenes;
