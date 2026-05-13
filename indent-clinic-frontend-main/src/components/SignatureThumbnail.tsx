import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface SignatureThumbnailProps {
    pacienteId: number;
    className?: string;
}

const SignatureThumbnail: React.FC<SignatureThumbnailProps> = ({ pacienteId, className = '' }) => {
    const [signature, setSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        
        api.get<{ base64: string }>(`/pacientes/${pacienteId}/firma-base64`)
            .then(res => {
                if (isMounted) {
                    setSignature(res.data.base64);
                    setLoading(false);
                }
            })
            .catch(() => {
                // Fallback: If not found in direct field, maybe it hasn't been migrated yet
                api.get(`/firmas/documento/paciente/${pacienteId}`)
                    .then(res => {
                        if (!isMounted) return;
                        const signatures = Array.isArray(res.data) ? res.data : [];
                        if (signatures.length > 0) {
                            const sorted = signatures.sort((a, b) => 
                                new Date(b.createdAt || b.timestamp).getTime() - 
                                new Date(a.createdAt || a.timestamp).getTime()
                            );
                            const lastSign = sorted[0];
                            if (lastSign.firmaData && lastSign.firmaData.startsWith('data:image')) {
                                setSignature(lastSign.firmaData);
                                setLoading(false);
                            } else if (lastSign.id) {
                                api.get<{ base64: string }>(`/firmas/${lastSign.id}/base64`)
                                    .then(proxyRes => {
                                        if (isMounted) {
                                            setSignature(proxyRes.data.base64);
                                            setLoading(false);
                                        }
                                    })
                                    .catch(() => { if (isMounted) setLoading(false); });
                            } else { setLoading(false); }
                        } else { setLoading(false); }
                    })
                    .catch(() => { if (isMounted) setLoading(false); });
            });

        return () => { isMounted = false; };
    }, [pacienteId]);

    if (loading) {
        return <div className="w-16 h-8 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />;
    }

    if (!signature) {
        return <span className="text-xs text-gray-400">Sin firma</span>;
    }

    return (
        <img 
            src={signature} 
            alt="Firma" 
            className={`max-w-[80px] max-h-[40px] object-contain border border-gray-200 dark:border-gray-600 rounded bg-white ${className}`}
        />
    );
};

export default SignatureThumbnail;
