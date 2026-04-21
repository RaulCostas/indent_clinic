import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import api from '../services/api';
import Swal from 'sweetalert2';

interface PermisosModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

const PermisosModal: React.FC<PermisosModalProps> = ({ user, isOpen, onClose, onSave }) => {
    const [permisos, setPermisos] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && user.permisos) {
            setPermisos(user.permisos);
        } else {
            setPermisos([]);
        }
    }, [user]);

    const handleToggle = (permiso: string) => {
        setPermisos(prev =>
            prev.includes(permiso)
                ? prev.filter(p => p !== permiso)
                : [...prev, permiso]
        );
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.patch(`/users/${user.id}`, { permisos });
            Swal.fire({
                icon: 'success',
                title: 'Permisos actualizados',
                showConfirmButton: false,
                timer: 1500
            });
            onSave();
            onClose();
        } catch (error) {
            console.error('Error updating permissions:', error);
            Swal.fire('Error', 'No se pudieron actualizar los permisos', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const sections = [
        {
            title: 'Módulos Principales',
            items: [
                { id: 'agenda', label: 'Agenda' },
                { id: 'agenda-restringida', label: 'Agenda (Solo Lectura/Notas)' },
                { id: 'pacientes', label: 'Pacientes (Módulo)' },
                { id: 'pacientes-registro', label: ' - Registro de Pacientes' },
                { id: 'pagos', label: ' - Pagos' },
                { id: 'pacientes-deudores', label: ' - Pacientes Deudores' },
                { id: 'pacientes-pendientes', label: ' - Pacientes Pendientes' },
                { id: 'recetario', label: ' - Recetario' },
                { id: 'imagenes-pacientes', label: ' - Imágenes de Pacientes' },

                { id: 'doctores', label: 'Doctores (Módulo)' },
                { id: 'doctores-registro', label: ' - Registro de Doctores' },
                { id: 'pagos-doctores', label: ' - Pagos a Doctores' },

                { id: 'laboratorios', label: 'Laboratorios (Módulo)' },
                { id: 'laboratorios-registro', label: ' - Registro de Laboratorios' },
                { id: 'trabajos-laboratorios', label: ' - Trabajos Lab.' },
                { id: 'pagos-laboratorios', label: ' - Pagos a Laboratorios' },
                { id: 'precios-laboratorios', label: ' - Precios Lab.' },
                { id: 'cubetas', label: ' - Cubetas' },

                { id: 'proveedores', label: 'Proveedores (Módulo)' },
                { id: 'proveedores-registro', label: ' - Registro de Proveedores' },
                { id: 'pedidos', label: ' - Pedidos' },
                { id: 'pagos-pedidos', label: ' - Pagar Pedidos' },



                { id: 'personal', label: 'Personal (Módulo)' },
                { id: 'personal-registro', label: ' - Registro de Personal' },
                { id: 'vacaciones', label: ' - Vacaciones' },
                { id: 'calificacion', label: ' - Calificación' },
                { id: 'arancel', label: ' - Arancel' },

                { id: 'inventario', label: 'Inventario' },
                { id: 'otros-ingresos', label: 'Otros Ingresos' },
                { id: 'egresos', label: 'Egresos Diarios' },
                { id: 'gastos', label: 'Gastos Fijos' },
                { id: 'cerrar-caja', label: 'Boton Cerrar Caja (Hoja Diaria)' },
                { id: 'cruce-pagos', label: 'Boton Cruce de Pagos (Hoja Diaria)' },
                { id: 'hoja-diaria', label: 'Hoja Diaria' },
                { id: 'utilidades', label: 'Utilidades' },

                { id: 'estadisticas', label: 'Estadísticas (Módulo)' },
                { id: 'estadisticas-pacientes', label: ' - Estadísticas Pacientes' },
                { id: 'estadisticas-doctores', label: ' - Estadísticas Doctores' },
                { id: 'estadisticas-especialidades', label: ' - Estadísticas Especialidades' },
                { id: 'estadisticas-utilidades', label: ' - Estadísticas Utilidades' },
                { id: 'estadisticas-productos', label: ' - Estadísticas Productos' },

                { id: 'ventas-comerciales', label: 'Ventas Comerciales (Módulo)' },
                { id: 'catalogo-productos', label: ' - Catálogo Productos' },
                { id: 'ventas-productos', label: ' - Ventas de Productos' },
                { id: 'compras-productos', label: ' - Compra de Productos' },
                { id: 'reporte-comisiones', label: ' - Comisiones' },

                { id: 'configuracion', label: 'Configuración (Módulo)' },
                { id: 'usuarios', label: ' - Usuarios' },
                { id: 'config-clinicas', label: ' - Clínicas' },
                { id: 'cambiar-password', label: ' - Cambiar Contraseña' },
                { id: 'config-chatbot', label: ' - Chatbot (WhatsApp)' },
                { id: 'config-backup', label: ' - Backup (Base de Datos)' },
                { id: 'config-comision', label: ' - Comisión Tarjeta' },
                { id: 'config-especialidad', label: ' - Especialidades' },
                { id: 'config-forma-pago', label: ' - Formas de Pago' },
                { id: 'config-grupos', label: ' - Grupos Inventario' },
                { id: 'config-area-personal', label: ' - Área del Personal' },
            ]
        },
        {
            title: 'Mensajes de Inicio (Dashboard)',
            items: [
                { id: 'dashboard_cumpleanos', label: 'Cumpleaños (Pacientes y Personal)' },
                { id: 'dashboard_pacientes_no_registrados', label: 'Pacientes No Registrados (Seguimiento Clínico)' },
                { id: 'dashboard_trabajos_pendientes', label: 'Trabajos Terminados (Laboratorios)' },
                { id: 'dashboard_stock_minimo', label: 'Alerta de Stock Bajo' },
                { id: 'dashboard_gastos_vencidos', label: 'Gastos Fijos' },
            ]
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                        Restricciones de Acceso: <span className="text-blue-600">{user.name}</span>
                    </h3>

                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-xs sm:text-sm text-yellow-700">
                                Marque las casillas de los módulos que desea <strong>DENEGAR (Restringir)</strong> a este usuario.
                                <br />
                                <span className="text-xs text-gray-500">* Si la casilla está marcada, el usuario NO podrá ver ese módulo.</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    {sections.map(section => (
                        <div key={section.title} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                            <h4 className="font-bold text-sm sm:text-base text-gray-700 mb-2 sm:mb-3 border-b pb-2">{section.title}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                {section.items.map(item => (
                                    <label key={item.id} className="flex items-center space-x-2 sm:space-x-3 cursor-pointer p-2 hover:bg-gray-100 rounded transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={permisos.includes(item.id)}
                                            onChange={() => handleToggle(item.id)}
                                            className="form-checkbox h-4 w-4 sm:h-5 sm:w-5 text-red-600 rounded focus:ring-red-500 border-gray-300 transition duration-150 ease-in-out"
                                        />
                                        <span className={`text-xs sm:text-sm ${permisos.includes(item.id) ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                                            {item.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-start gap-3 rounded-b-xl mt-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                        )}
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermisosModal;
