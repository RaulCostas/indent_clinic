import React, { useState } from 'react';
import { BarChart2 } from 'lucide-react';
import ManualModal, { type ManualSection } from './ManualModal';
import { Plus } from 'lucide-react';


const Estadisticas: React.FC = () => {
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Módulo de Estadísticas',
            content: 'Bienvenido al panel central de estadísticas. Aquí podrá navegar a diferentes reportes detallados.'
        },
        {
            title: 'Navegación',
            content: 'Utilice el menú lateral para acceder a estadísticas específicas como: Doctores, Especialidades, Pacientes Nuevos, Productos y Utilidades.'
        }];

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <BarChart2 className="text-blue-600" size={32} />
                        Estadísticas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis e indicadores clave del rendimiento clínico</p>
                </div>
                <button
                    onClick={() => setShowManual(true)}
                    style={{
                        backgroundColor: '#f1f1f1',
                        border: '1px solid #ddd',
                        padding: '6px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        fontSize: '14px',
                        color: '#555'
                    }}
                    title="Ayuda / Manual"
                    className="no-print"
                >
                    ?
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="dark:text-gray-300">Módulo de Estadísticas en construcción.</p>
            </div>

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Estadísticas"
                sections={manualSections}
            />
        </div>
    );
};

export default Estadisticas;
