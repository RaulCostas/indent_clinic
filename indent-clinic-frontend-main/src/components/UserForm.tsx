import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import type { CreateUserDto } from '../types';
import ManualModal, { type ManualSection } from './ManualModal';
import { Eye, EyeOff } from 'lucide-react';


interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    id?: number | null;
    onSaveSuccess?: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, id, onSaveSuccess }) => {
    const [formData, setFormData] = useState<CreateUserDto>({
        name: '',
        email: '',
        password: '',
        estado: 'Activo',
    });
    const [showManual, setShowManual] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Seguridad',
            content: 'Al editar, deje la contraseña en blanco para mantener la actual. Las contraseñas se almacenan de forma segura.'
        }];

    useEffect(() => {
        if (isOpen) {
            if (id) {
                fetchUser(Number(id));
            } else {
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    estado: 'Activo',
                });
            }
        }
    }, [id, isOpen]);

    const fetchUser = async (userId: number) => {
        try {
            const response = await api.get(`/users/${userId}`);
            const { name, email, estado, foto } = response.data;
            setFormData({ name, email, estado, foto, password: '' }); // Don't populate password
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (id) {
                const updateData = { ...formData };
                if (!updateData.password) delete (updateData as any).password;
                await api.patch(`/users/${id}`, updateData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Usuario Actualizado',
                    text: 'Usuario actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await api.post('/users', formData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Usuario Creado',
                    text: 'Usuario creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }

            // Check if updated user is current logged-in user to update header photo
            const currentUserStr = localStorage.getItem('user');
            if (currentUserStr && id) {
                const currentUser = JSON.parse(currentUserStr);
                if (currentUser.id === Number(id)) {
                    // Refresh data in localStorage first (optional since Layout fetches it, but good practice)
                    // Actually Layout fetches from API, so just trigger event
                    window.dispatchEvent(new Event('user-updated'));
                }
            }

            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving user:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el usuario';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage
            });
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
                <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto transform transition-transform animate-slide-in-right">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-4">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <span className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </span>
                                {id ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="mb-4">
                                <label className="block mb-2 font-medium">Nombre:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Juan Pérez"

                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 font-medium">Email:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                        <polyline points="22,6 12,13 2,6"></polyline>
                                    </svg>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: correo@ejemplo.com"

                                    />
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 font-medium">Contraseña:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required={!id} // Required only for create
                                        placeholder={id ? 'Dejar en blanco para mantener la actual' : ''}
                                        className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none !bg-transparent !border-none !shadow-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 font-medium">Foto:</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setFormData({ ...formData, foto: reader.result as string });
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                                />
                                {formData.foto && (
                                    <div className="mt-3">
                                        <img src={formData.foto} alt="Vista previa" className="max-w-[100px] max-h-[100px] rounded border border-gray-200 dark:border-gray-600" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, foto: '' })}
                                            className="block mt-2 text-red-500 hover:text-red-700 border-none bg-transparent cursor-pointer text-sm font-semibold"
                                        >
                                            Eliminar foto
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="mb-4">
                                <label className="block mb-2 font-medium">Estado:</label>
                                <div className="relative">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                        <line x1="12" y1="2" x2="12" y2="12"></line>
                                    </svg>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    >
                                        <option value="" disabled>-- Seleccione --</option><option value="Activo">Activo</option>
                                        <option value="Inactivo">Inactivo</option>
                                    </select>
                                </div>
                            </div>
                            {/* Footer Buttons */}
                            <div className="flex justify-start gap-3 mt-8 p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl -mx-6 -mb-6">
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    {id ? 'Actualizar' : 'Guardar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Usuarios"
                sections={manualSections}
            />
        </>
    );
};

export default UserForm;
