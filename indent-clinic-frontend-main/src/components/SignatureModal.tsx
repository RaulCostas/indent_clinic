import React, { useState, useEffect } from 'react';
import SignatureCanvas from './SignatureCanvas';
import SignatureUpload from './SignatureUpload';
import SignatureDisplay from './SignatureDisplay';
import api from '../services/api';
import Swal from 'sweetalert2';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipoDocumento: 'presupuesto' | 'historia_clinica' | 'receta';
  documentoId: number;
  rolFirmante: 'paciente' | 'doctor' | 'personal' | 'administrador';
  onSuccess?: () => void;
  hideHistory?: boolean;
  closeOnSuccess?: boolean;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  tipoDocumento,
  documentoId,
  rolFirmante,
  onSuccess,
  hideHistory = false,
  closeOnSuccess = false,
}) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'upload'>('draw');
  const [isSaving, setIsSaving] = useState(false);
  const [existingSignatures, setExistingSignatures] = useState<any[]>([]);
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);

  useEffect(() => {
    if (isOpen && documentoId) {
      fetchExistingSignatures();
    }
  }, [isOpen, documentoId]);

  const fetchExistingSignatures = async () => {
    setIsLoadingSignatures(true);
    try {
      const response = await api.get(`/firmas/documento/${tipoDocumento}/${documentoId}`);
      setExistingSignatures(response.data);
    } catch (error) {
      console.error('Error fetching existing signatures:', error);
    } finally {
      setIsLoadingSignatures(false);
    }
  };

  if (!isOpen) return null;

  const generateDocumentHash = (data: any): string => {
    // Simple hash generation - in production, use a proper crypto library
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  const handleSaveSignature = async (signatureData: string) => {
    setIsSaving(true);

    try {
      // Get document data for hash generation
      const documentData = {
        tipoDocumento,
        documentoId,
        timestamp: new Date().toISOString(),
      };

      const hashDocumento = generateDocumentHash(documentData);

      // Get IP address and user agent
      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');

      const userAgent = navigator.userAgent;

      // Get user ID from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const usuarioId = user.id || 1; // Fallback to 1 if no user found

      // Save signature
      const response = await api.post('/firmas', {
        tipoDocumento,
        documentoId,
        tipoFirma: activeTab === 'draw' ? 'dibujada' : 'imagen',
        firmaData: signatureData,
        rolFirmante,
        hashDocumento,
        ipAddress,
        userAgent,
        usuarioId, // Add user ID
      });

      if (response.status === 201) {
        Swal.fire({
          icon: 'success',
          title: '¡Éxito!',
          text: 'Firma guardada exitosamente',
          timer: 1500,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });
        fetchExistingSignatures(); // Refresh local list
        onSuccess?.();
        if (closeOnSuccess) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Error al guardar firma:', error);
      alert('Error al guardar la firma. Por favor intente nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSignature = async (id: number) => {
    try {
      const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esto. La firma será eliminada permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
      });

      if (result.isConfirmed) {
        await api.delete(`/firmas/${id}`);

        await Swal.fire({
          title: '¡Eliminado!',
          text: 'La firma ha sido eliminada.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
        });

        fetchExistingSignatures(); // Refresh list
        onSuccess?.(); // Notify parent of change
      }
    } catch (error) {
      console.error('Error eliminating signature:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar la firma',
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
      });
    }
  };

  return (
    <div className="signature-modal-overlay" onClick={onClose}>
      <div className="signature-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="signature-modal-header">
          <h2>Firmar Documento</h2>
          <button onClick={onClose} className="btn-close" title="Cerrar">
            Cerrar
          </button>
        </div>

        <div className="signature-modal-tabs">
          <button
            className={`tab-button ${activeTab === 'draw' ? 'active' : ''}`}
            onClick={() => setActiveTab('draw')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
            </svg>
            Dibujar Firma
          </button>
          <button
            className={`tab-button ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Subir Imagen
          </button>
        </div>

        <div className="signature-modal-body">
          {/* Existing Signatures Section */}
          {isLoadingSignatures ? (
            <div className="text-center p-4 text-gray-500">Cargando firmas...</div>
          ) : (!hideHistory && existingSignatures.length > 0) && (
            <div className="existing-signatures-section">
              <SignatureDisplay
                firmas={existingSignatures}
                onDelete={handleDeleteSignature}
              />
              <div className="section-divider">
                <span>O firmar nuevamente</span>
              </div>
            </div>
          )}

          {activeTab === 'draw' ? (
            <SignatureCanvas
              onSave={handleSaveSignature}
              onCancel={onClose}
            />
          ) : (
            <SignatureUpload
              onSave={handleSaveSignature}
              onCancel={onClose}
            />
          )}
        </div>

        {isSaving && (
          <div className="saving-overlay">
            <div className="spinner"></div>
            <p>Guardando firma...</p>
          </div>
        )}
      </div>

      <style>{`
        .signature-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .signature-modal-content {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          position: relative;
        }

        .signature-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .signature-modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .btn-close {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          padding: 0.5rem 1rem;
          cursor: pointer;
          color: #4b5563;
          border-radius: 6px;
          transition: all 0.2s;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .btn-close:hover {
          background: #e5e7eb;
          color: #1f2937;
        }

        .signature-modal-tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 1.5rem;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #374151;
        }

        .tab-button.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .signature-modal-body {
          padding: 1.5rem;
        }

        .existing-signatures-section {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
        }

        .section-divider {
          display: flex;
          align-items: center;
          margin: 2rem 0;
          text-align: center;
        }

        .section-divider::before,
        .section-divider::after {
          content: "";
          flex: 1;
          border-bottom: 1px solid #e5e7eb;
        }

        .section-divider span {
          padding: 0 1rem;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          text-transform: uppercase;
        }

        .saving-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          border-radius: 12px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .saving-overlay p {
          margin: 0;
          color: #374151;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default SignatureModal;
