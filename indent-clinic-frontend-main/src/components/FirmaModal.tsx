import React, { useRef, useState, useEffect } from 'react';
import { Eraser, X, Check } from 'lucide-react';

interface FirmaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSign: (signatureBase64: string) => void;
    title?: string;
    subtitle?: string;
}

const FirmaModal: React.FC<FirmaModalProps> = ({ isOpen, onClose, onSign, title = 'Conformidad de Tratamiento', subtitle = 'Firme a continuación para confirmar la finalización del Plan de Tratamiento.' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                context.strokeStyle = '#000000';
                context.lineJoin = 'round';
                context.lineCap = 'round';
                context.lineWidth = 2;
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [isOpen]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) context.beginPath();
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        e.preventDefault(); // Prevent scrolling on touch

        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        context.lineTo(x, y);
        context.stroke();
        context.beginPath();
        context.moveTo(x, y);
    };

    const handleClear = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.beginPath();
            }
        }
    };

    const handleSave = () => {
        if (canvasRef.current) {
            // Validate if canvas is blank
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            // Un truco simple para verificar si está vacío es obtener la imageData y sumar los pixeles
            let isBlank = true;
            if (context) {
                const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
                isBlank = !pixelBuffer.some(color => color !== 0);
            }

            if (isBlank) {
                alert("Por favor, firme antes de confirmar.");
                return;
            }

            const dataUrl = canvas.toDataURL('image/png');
            onSign(dataUrl);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col items-center">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 w-full text-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                </div>

                <div className="p-6 w-full flex flex-col items-center">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 cursor-crosshair touch-none">
                        <canvas
                            ref={canvasRef}
                            width={400}
                            height={200}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full max-w-[400px] h-[200px] block"
                        />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 w-full flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 font-bold rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                    >
                        <Eraser className="w-5 h-5" />
                        Limpiar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                    >
                        <X className="w-4 h-4" />
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all hover:-translate-y-0.5"
                    >
                        <Check className="w-4 h-4" strokeWidth={3} />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FirmaModal;
