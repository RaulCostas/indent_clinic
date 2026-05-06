import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Clinica {
    id: number;
    nombre: string;
    activo: boolean;
    direccion?: string;
    monedaDefault?: string;
    logo?: string;
    qr_pago?: string;
    fecha_cierre_caja?: string;
}


interface ClinicaContextType {
    clinicas: Clinica[];
    clinicaSeleccionada: number | null; // null = Todas
    setClinicaSeleccionada: (id: number | null) => void;
    clinicaActual: Clinica | null;
    loading: boolean;
    recargarClinicas: () => void;
}

const ClinicaContext = createContext<ClinicaContextType>({
    clinicas: [],
    clinicaSeleccionada: null,
    setClinicaSeleccionada: () => { },
    clinicaActual: null,
    loading: false,
    recargarClinicas: () => { },
});

export const useClinica = () => useContext(ClinicaContext);

export const ClinicaProvider = ({ children }: { children: ReactNode }) => {
    const [clinicas, setClinicas] = useState<Clinica[]>([]);
    const [clinicaSeleccionada, setClinicaSeleccionadaState] = useState<number | null>(() => {
        const saved = localStorage.getItem('clinicaSeleccionada');
        return saved ? parseInt(saved) : null;
    });
    const [loading, setLoading] = useState(false);

    const cargarClinicas = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/clinicas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Solo clínicas activas
            setClinicas(res.data.filter((c: Clinica) => c.activo));
        } catch (err) {
            console.error('Error cargando clínicas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarClinicas();
    }, []);

    const setClinicaSeleccionada = (id: number | null) => {
        setClinicaSeleccionadaState(id);
        if (id === null) {
            localStorage.removeItem('clinicaSeleccionada');
        } else {
            localStorage.setItem('clinicaSeleccionada', String(id));
        }
    };

    const clinicaActual = clinicaSeleccionada
        ? clinicas.find(c => c.id === clinicaSeleccionada) || null
        : null;

    return (
        <ClinicaContext.Provider value={{
            clinicas,
            clinicaSeleccionada,
            setClinicaSeleccionada,
            clinicaActual,
            loading,
            recargarClinicas: cargarClinicas,
        }}>
            {children}
        </ClinicaContext.Provider>
    );
};
