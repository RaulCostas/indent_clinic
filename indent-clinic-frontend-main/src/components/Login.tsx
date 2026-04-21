import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';


import Swal from 'sweetalert2';
// import './Login.css'; // Removed for pure Tailwind design
import { useChat } from '../context/ChatContext';
import { useClinica } from '../context/ClinicaContext';
import { Building2, Mail, Lock } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const navigate = useNavigate();
    const { loginUser } = useChat();
    const { recargarClinicas } = useClinica();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Update chat context with new user
            loginUser(response.data.user);

            // Reload clinics so context is populated globally
            recargarClinicas();

            navigate('/');
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.response && error.response.data && error.response.data.message) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Inicio de Sesión',
                    text: error.response.data.message
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error de Inicio de Sesión',
                    text: 'Credenciales incorrectas o error de conexión'
                });
            }
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail });
            await Swal.fire({
                icon: 'info',
                title: 'Correo Enviado',
                text: 'Se ha enviado una nueva contraseña a tu correo.'
            });
            setShowForgot(false);
            setForgotEmail('');
        } catch (error: any) {
            console.error('Forgot password error:', error);
            const msg = error.response && error.response.data && error.response.data.message
                ? error.response.data.message
                : 'Error al procesar la solicitud.';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: msg,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            
            {/* Left Column: Visual Banner (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6] relative overflow-hidden items-center justify-center p-12">
                {/* Decorative floating blobs with blur */}
                <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
                
                <div className="relative z-10 text-white max-w-lg text-center">
                    <div className="flex justify-center mb-6">
                        <span className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
                            <Building2 className="h-12 w-12 text-white" strokeWidth={2} />
                        </span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-snug mb-6 text-white drop-shadow-lg flex flex-col gap-3">
                        <span>InDent Clinic</span>
                        <span>Selec Dental</span>
                        <span>Dent Studio</span>
                    </h1>
                    <p className="text-xl text-blue-100 font-light leading-relaxed">
                        Simplifica la administración de tu consultorio dental y enfócate en lo que importa: la salud de tus pacientes.
                    </p>
                </div>
            </div>

            {/* Right Column: Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">¡Hola de nuevo!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Ingresa a tu cuenta para continuar</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <Mail className="h-5 w-5" strokeWidth={2} />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 dark:text-white shadow-sm transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contraseña</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <Lock className="h-5 w-5" strokeWidth={2} />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 dark:text-white shadow-sm transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform transition-all duration-200"
                        >
                            Iniciar Sesión
                        </button>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => setShowForgot(true)}
                                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-none"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl transform transition-all scale-100">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">Recuperar Contraseña</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                            Ingresa tu correo para enviarte una nueva contraseña de restablecimiento.
                        </p>
                        
                        <form onSubmit={handleForgotSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                        <Mail className="h-5 w-5" strokeWidth={2} />
                                    </span>
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        placeholder="jemplo@correo.com"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                <button 
                                    type="submit" 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-98"
                                >
                                    Enviar Correo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForgot(false)}
                                    className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 rounded-xl border border-gray-200 dark:border-gray-600 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
