import React from 'react';

interface Firma {
  id: number;
  tipoFirma: string;
  firmaData: string;
  usuario: {
    nombre: string;
    apellido: string;
  };
  rolFirmante: string;
  timestamp: string;
  verificado: boolean;
}

interface SignatureDisplayProps {
  firmas: Firma[];
  onDelete?: (id: number) => void;
}

const SignatureDisplay: React.FC<SignatureDisplayProps> = ({ firmas, onDelete }) => {
  if (!firmas || firmas.length === 0) {
    return (
      <div className="no-signatures">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="no-signatures-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <p>No hay firmas registradas para este documento</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-BO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="signatures-container">
      <h3 className="signatures-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        Firmas Digitales ({firmas.length})
      </h3>

      <div className="signatures-list">
        {firmas.map((firma) => (
          <div key={firma.id} className="signature-card">
            <div className="signature-header">
              <div className="signature-info">
                <div className="signature-user">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span className="user-name">
                    {firma.usuario.nombre} {firma.usuario.apellido}
                  </span>
                  <span className="user-role">({firma.rolFirmante})</span>
                </div>
                <div className="signature-timestamp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {formatDate(firma.timestamp)}
                </div>
              </div>
              {firma.verificado && (
                <div className="verified-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Verificada
                </div>
              )}
            </div>

            {onDelete && (
              <button
                className="delete-btn"
                onClick={() => onDelete(firma.id)}
                title="Eliminar Firma"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}

            <div className="signature-image-container">
              <img
                src={firma.firmaData}
                alt={`Firma de ${firma.usuario.nombre}`}
                className="signature-image"
              />
              <div className="signature-type-badge">
                {firma.tipoFirma === 'dibujada' ? 'Dibujada' : 'Imagen'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .signatures-container {
          margin-top: 2rem;
        }

        .signatures-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 1rem 0;
        }

        .signatures-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .signature-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          background: #f9fafb;
        }

        .signature-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .delete-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #fee2e2;
            color: #ef4444;
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            min-width: 32px;
            min-height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            z-index: 10;
        }

        .delete-btn svg {
            display: block;
            min-width: 18px;
            min-height: 18px;
            stroke: currentColor;
            stroke-width: 2px;
        }

        .delete-btn:hover {
            background: #fecaca;
            color: #dc2626;
            transform: scale(1.1);
        }

        .signature-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            background: #f9fafb;
            position: relative;
        }

        .signature-info {
          flex: 1;
        }

        .signature-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .user-name {
          font-weight: 600;
          color: #1f2937;
        }

        .user-role {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .signature-timestamp {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .verified-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          background: #d1fae5;
          color: #065f46;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .signature-image-container {
          position: relative;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1rem;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .signature-image {
          max-width: 100%;
          max-height: 150px;
          object-fit: contain;
        }

        .signature-type-badge {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          padding: 0.25rem 0.625rem;
          background: #3b82f6;
          color: white;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .no-signatures {
          text-align: center;
          padding: 3rem 1rem;
          color: #9ca3af;
        }

        .no-signatures-icon {
          margin: 0 auto 1rem;
          opacity: 0.5;
        }

        .no-signatures p {
          margin: 0;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
};

export default SignatureDisplay;
