import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import './Layout.css';
import ChatWidget from './Chat/ChatWidget';

import { useChat } from '../context/ChatContext';
import { useCorreos } from '../context/CorreosContext';
import { ThemeToggle } from './ThemeToggle';
import { useClinica } from '../context/ClinicaContext';
import { getLogoUrl } from '../utils/formatters';




const Layout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logoutUser } = useChat();
    const { unreadCount } = useCorreos();
    const { clinicas, clinicaSeleccionada, setClinicaSeleccionada, clinicaActual } = useClinica();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLabsOpen, setIsLabsOpen] = useState(false);
    const [isDoctorsOpen, setIsDoctorsOpen] = useState(false);
    const [isPatientsOpen, setIsPatientsOpen] = useState(false);
    const [isPersonalOpen, setIsPersonalOpen] = useState(false);
    const [isProvidersOpen, setIsProvidersOpen] = useState(false);
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const [isSalesOpen, setIsSalesOpen] = useState(false);


    // Permission Logic
    const [permisos, setPermisos] = useState<string[]>([]);

    const fetchUserData = async () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                // Try to parse just to get ID, but always fetch fresh from API
                const localUser = JSON.parse(userStr);

                if (localUser && localUser.id) {
                    console.log(`[Layout] Fetching fresh data for user ID: ${localUser.id}`);
                    const response = await api.get(`/users/${localUser.id}`);
                    const freshUser = response.data;
                    console.log(`[Layout] Received fresh user data:`, freshUser);

                    if (freshUser && freshUser.id) {
                        setCurrentUser(freshUser);

                        // Update permissions
                        const freshPermisos = Array.isArray(freshUser.permisos) ? freshUser.permisos : [];
                        setPermisos(freshPermisos);

                        // Update localStorage to keep it in sync
                        localStorage.setItem('user', JSON.stringify(freshUser));
                    } else {
                        console.warn('[Layout] API returned invalid user data, keeping local state');
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                // Fallback to local storage if API fails, but be careful
                try {
                    const user = JSON.parse(userStr);
                    setCurrentUser(user);
                    setPermisos(Array.isArray(user.permisos) ? user.permisos : []);
                } catch (e) {
                    setCurrentUser(null);
                    setPermisos([]);
                }
            }
        }
    };

    useEffect(() => {
        fetchUserData();

        // Listen for user updates (e.g. photo change)
        const handleUserUpdate = () => {
            fetchUserData();
        };

        window.addEventListener('user-updated', handleUserUpdate);

        return () => {
            window.removeEventListener('user-updated', handleUserUpdate);
        };
    }, []);



    const hasAccess = (moduleId: string) => {
        return !permisos.includes(moduleId);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        logoutUser();
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname === path ? 'active' : '';
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="dashboard-container">
            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
                onClick={closeSidebar}
            />

            <aside className={`sidebar ${isSidebarOpen ? 'active' : ''}`}>
                <div className="sidebar-header">
                    {clinicaActual && clinicaActual.logo ? (
                        <img 
                            src={getLogoUrl(clinicaActual.logo)} 
                            alt={clinicaActual.nombre} 
                            style={{ maxHeight: '45px', maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                        />
                    ) : (
                        <h1 className="sidebar-logo-text">
                            {clinicaActual ? clinicaActual.nombre : 'TODAS LAS CLINICAS'}
                        </h1>
                    )}
                    <button className="close-sidebar-btn" onClick={closeSidebar}>×</button>
                </div>
               <nav className="sidebar-nav">
                    <ul className="nav-list">
                        {hasAccess('agenda') && (
                            <li className="nav-item">
                                <Link
                                    to="/"
                                    className={`nav-link ${isActive('/')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                    Inicio
                                </Link>
                            </li>
                        )}
                        {hasAccess('agenda') && (
                            <li className="nav-item">
                                <Link
                                    to="/agenda"
                                    className={`nav-link ${isActive('/agenda')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    Agenda
                                </Link>
                            </li>
                        )}
                        {/* PACIENTES MENU */}
                        {hasAccess('pacientes') && (
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${isPatientsOpen || isActive('/pacientes') || isActive('/pacientes-deudores') ? 'active' : ''}`}
                                    onClick={() => setIsPatientsOpen(!isPatientsOpen)}
                                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                        Pacientes
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: isPatientsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                {isPatientsOpen && (
                                    <ul className="submenu-list" style={{ paddingLeft: '20px', listStyle: 'none', background: 'rgba(0,0,0,0.05)' }}>
                                        {hasAccess('pacientes-registro') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/pacientes"
                                                    className={`nav-link ${isActive('/pacientes')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                                    </svg>
                                                    Registro de Pacientes
                                                </Link>
                                            </li>
                                        )}

                                        {hasAccess('pacientes-deudores') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/pacientes-deudores"
                                                    className={`nav-link ${isActive('/pacientes-deudores')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                    </svg>
                                                    Pacientes Deudores
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('pacientes-pendientes') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/pacientes-pendientes"
                                                    className={`nav-link ${isActive('/pacientes-pendientes')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 16 14"></polyline>
                                                    </svg>
                                                    Pacientes Pendientes
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('recetario') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/recetario"
                                                    className={`nav-link ${isActive('/recetario')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                        <polyline points="14 2 14 8 20 8"></polyline>
                                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                                        <polyline points="10 9 9 9 8 9"></polyline>
                                                    </svg>
                                                    Recetario
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('imagenes-pacientes') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/imagenes-pacientes"
                                                    className={`nav-link ${isActive('/imagenes-pacientes')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                    Imágenes de Pacientes
                                                </Link>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </li>
                        )}


                        {/* DOCTORES MENU */}
                        {hasAccess('doctores') && (
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${isDoctorsOpen || isActive('/doctors') || isActive('/pagos-doctores') ? 'active' : ''}`}
                                    onClick={() => setIsDoctorsOpen(!isDoctorsOpen)}
                                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                        </svg>
                                        Doctores
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: isDoctorsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                {isDoctorsOpen && (
                                    <ul className="submenu-list" style={{ paddingLeft: '20px', listStyle: 'none', background: 'rgba(0,0,0,0.05)' }}>
                                        {hasAccess('doctores-registro') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/doctors"
                                                    className={`nav-link ${isActive('/doctors')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="12" cy="7" r="4"></circle>
                                                    </svg>
                                                    Registro de Doctores
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('pagos-doctores') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/pagos-doctores"
                                                    className={`nav-link ${isActive('/pagos-doctores')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                                    </svg>
                                                    Pagos a Doctores
                                                </Link>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </li>
                        )}

                        {/* LABORATORIOS */}
                        {hasAccess('laboratorios') && (
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${isLabsOpen || isActive('/laboratorios') || isActive('/trabajos-laboratorios') || isActive('/pagos-laboratorios') || isActive('/precios-laboratorios') || isActive('/cubetas') ? 'active' : ''}`}
                                    onClick={() => setIsLabsOpen(!isLabsOpen)}
                                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <path d="M10 2v7.31"></path>
                                            <path d="M14 2v7.31"></path>
                                            <path d="M8.5 2h7"></path>
                                            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                        </svg>
                                        Laboratorios
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: isLabsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                {isLabsOpen && (
                                    <ul className="submenu-list" style={{ paddingLeft: '20px', listStyle: 'none', background: 'rgba(0,0,0,0.05)' }}>
                                        {hasAccess('laboratorios-registro') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/laboratorios"
                                                    className={`nav-link ${isActive('/laboratorios')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M10 2v7.31"></path>
                                                        <path d="M14 2v7.31"></path>
                                                        <path d="M8.5 2h7"></path>
                                                        <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                                    </svg>
                                                    Registro de Laboratorios
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('trabajos-laboratorios') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/trabajos-laboratorios"
                                                    className={`nav-link ${isActive('/trabajos-laboratorios')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
                                                    </svg>
                                                    Trabajos Lab.
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('pagos-laboratorios') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/pagos-laboratorios"
                                                    className={`nav-link ${isActive('/pagos-laboratorios')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                                    </svg>
                                                    Pagos a Laboratorios
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('precios-laboratorios') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/precios-laboratorios"
                                                    className={`nav-link ${isActive('/precios-laboratorios')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                                    </svg>
                                                    Precios Lab.
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('cubetas') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/cubetas"
                                                    className={`nav-link ${isActive('/cubetas')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                                        <rect x="1" y="3" width="22" height="5"></rect>
                                                        <line x1="10" y1="12" x2="14" y2="12"></line>
                                                    </svg>
                                                    Cubetas
                                                </Link>
                                            </li>
                                        )}

                                    </ul>
                                )}
                            </li>
                        )}

                        {/* PROVEEDORES MENU */}
                        {hasAccess('proveedores') && (
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${isProvidersOpen || isActive('/proveedores') || isActive('/pedidos') ? 'active' : ''}`}
                                    onClick={() => setIsProvidersOpen(!isProvidersOpen)}
                                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <rect x="1" y="3" width="15" height="13"></rect>
                                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                            <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                            <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                        </svg>
                                        Proveedores
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: isProvidersOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                {isProvidersOpen && (
                                    <ul className="submenu-list" style={{ paddingLeft: '20px', listStyle: 'none', background: 'rgba(0,0,0,0.05)' }}>
                                        {hasAccess('proveedores-registro') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/proveedores"
                                                    className={`nav-link ${isActive('/proveedores')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <rect x="1" y="3" width="15" height="13"></rect>
                                                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                                                        <circle cx="5.5" cy="18.5" r="2.5"></circle>
                                                        <circle cx="18.5" cy="18.5" r="2.5"></circle>
                                                    </svg>
                                                    Registro de Proveedores
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('pedidos') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/pedidos"
                                                    className={`nav-link ${isActive('/pedidos')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                                    </svg>
                                                    Pedidos
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('pagos-pedidos') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/pagos-pedidos"
                                                    className={`nav-link ${isActive('/pagos-pedidos')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                                    </svg>
                                                    Pagar Pedidos
                                                </Link>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </li>
                        )}

                        {/* PERSONAL MENU */}
                        {hasAccess('personal') && (
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${isPersonalOpen || isActive('/personal') || isActive('/vacaciones') ? 'active' : ''}`}
                                    onClick={() => setIsPersonalOpen(!isPersonalOpen)}
                                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                        Personal
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: isPersonalOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                {isPersonalOpen && (
                                    <ul className="submenu-list" style={{ paddingLeft: '20px', listStyle: 'none', background: 'rgba(0,0,0,0.05)' }}>
                                        {hasAccess('personal-registro') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/personal"
                                                    className={`nav-link ${isActive('/personal')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="9" cy="7" r="4"></circle>
                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                    </svg>
                                                    Registro de Personal
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('vacaciones') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/vacaciones"
                                                    className={`nav-link ${isActive('/vacaciones')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                                                    </svg>
                                                    Vacaciones
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('calificacion') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/calificacion"
                                                    className={`nav-link ${isActive('/calificacion')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                                    </svg>
                                                    Calificación
                                                </Link>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </li>
                        )}


                        {/* ARANCELES - part of Presupuestos or ADMs? Or separate. Leaving open. */}
                        {hasAccess('arancel') && (
                            <li className="nav-item">
                                <Link
                                    to="/arancel"
                                    className={`nav-link ${isActive('/arancel')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    Aranceles
                                </Link>
                            </li>
                        )}

                        {hasAccess('inventario') && (
                            <li className="nav-item">
                                <Link
                                    to="/inventario"
                                    className={`nav-link ${isActive('/inventario')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                    </svg>
                                    Inventario
                                </Link>
                            </li>
                        )}

                        {hasAccess('otros-ingresos') && (
                            <li className="nav-item">
                                <Link
                                    to="/otros-ingresos"
                                    className={`nav-link ${isActive('/otros-ingresos')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <line x1="12" y1="19" x2="12" y2="5"></line>
                                        <polyline points="5 12 12 5 19 12"></polyline>
                                    </svg>
                                    Otros Ingresos
                                </Link>
                            </li>
                        )}

                        {/* EGRESOS - part of Caja Diaria? */}
                        {hasAccess('egresos') && (
                            <li className="nav-item">
                                <Link
                                    to="/egresos"
                                    className={`nav-link ${isActive('/egresos')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    Egresos Diarios
                                </Link>
                            </li>
                        )}

                        {hasAccess('gastos') && (
                            <li className="nav-item">
                                <Link
                                    to="/gastos-fijos"
                                    className={`nav-link ${isActive('/gastos-fijos')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                                        <polyline points="17 18 23 18 23 12"></polyline>
                                    </svg>
                                    Gastos Fijos
                                </Link>
                            </li>
                        )}
                        {hasAccess('hoja-diaria') && (
                            <li className="nav-item">
                                <Link
                                    to="/hoja-diaria"
                                    className={`nav-link ${isActive('/hoja-diaria')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    Hoja Diaria
                                </Link>
                            </li>
                        )}

                        {hasAccess('utilidades') && (
                            <li className="nav-item">
                                <Link
                                    to="/utilidades"
                                    className={`nav-link ${isActive('/utilidades')}`}
                                    onClick={closeSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                    Utilidades
                                </Link>
                            </li>
                        )}

                        {/* VENTAS COMERCIALES MENU */}
                        {hasAccess('ventas-comerciales') && (
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${isSalesOpen || isActive('/productos-comerciales') || isActive('/ventas-comerciales') || isActive('/reporte-comisiones') ? 'active' : ''}`}
                                    onClick={() => setIsSalesOpen(!isSalesOpen)}
                                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <circle cx="9" cy="21" r="1"></circle>
                                            <circle cx="20" cy="21" r="1"></circle>
                                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                        </svg>
                                        Ventas Comerciales
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: isSalesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                {isSalesOpen && (
                                    <ul className="submenu-list" style={{ paddingLeft: '20px', listStyle: 'none', background: 'rgba(0,0,0,0.05)' }}>
                                        {hasAccess('catalogo-productos') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/productos-comerciales"
                                                    className={`nav-link ${isActive('/productos-comerciales')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M21 8V21H3V8"></path>
                                                        <rect x="1" y="3" width="22" height="5"></rect>
                                                        <line x1="10" y1="12" x2="14" y2="12"></line>
                                                    </svg>
                                                    Catálogo Productos
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('ventas-productos') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/ventas-comerciales"
                                                    className={`nav-link ${isActive('/ventas-comerciales')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <circle cx="10" cy="20.5" r="1"></circle>
                                                        <circle cx="18" cy="20.5" r="1"></circle>
                                                        <path d="M2.5 2.5h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6l1.6-8.4H7.1"></path>
                                                    </svg>
                                                    Ventas de Productos
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('compras-productos') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/compras-productos"
                                                    className={`nav-link ${isActive('/compras-productos')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                                    </svg>
                                                    Compras de Productos
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('reporte-comisiones') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/reporte-comisiones"
                                                    className={`nav-link ${isActive('/reporte-comisiones')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                                    </svg>
                                                    Comisiones
                                                </Link>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </li>
                        )}
                        {hasAccess('estadisticas') && (
                            <li className="nav-item">
                                <div
                                    className={`nav-link ${isStatsOpen || isActive('/estadisticas') ? 'active' : ''}`}
                                    onClick={() => setIsStatsOpen(!isStatsOpen)}
                                    style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <line x1="18" y1="20" x2="18" y2="10"></line>
                                            <line x1="12" y1="20" x2="12" y2="4"></line>
                                            <line x1="6" y1="20" x2="6" y2="14"></line>
                                        </svg>
                                        Estadísticas
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ transform: isStatsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                                {isStatsOpen && (
                                    <ul className="submenu-list" style={{ paddingLeft: '20px', listStyle: 'none', background: 'rgba(0,0,0,0.05)' }}>
                                        {hasAccess('estadisticas-pacientes') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/estadisticas/pacientes-nuevos"
                                                    className={`nav-link ${isActive('/estadisticas/pacientes-nuevos')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="9" cy="7" r="4"></circle>
                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                    </svg>
                                                    Pacientes
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('estadisticas-doctores') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/estadisticas/doctores"
                                                    className={`nav-link ${isActive('/estadisticas/doctores')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="12" cy="7" r="4"></circle>
                                                    </svg>
                                                    Doctores
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('estadisticas-especialidades') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/estadisticas/especialidades"
                                                    className={`nav-link ${isActive('/estadisticas/especialidades')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                                                    </svg>
                                                    Especialidades
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('estadisticas-utilidades') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/estadisticas/utilidades"
                                                    className={`nav-link ${isActive('/estadisticas/utilidades')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                                    </svg>
                                                    Utilidades
                                                </Link>
                                            </li>
                                        )}
                                        {hasAccess('estadisticas-productos') && (
                                            <li className="nav-item">
                                                <Link
                                                    to="/estadisticas/productos"
                                                    className={`nav-link ${isActive('/estadisticas/productos')}`}
                                                    onClick={closeSidebar}
                                                    style={{ fontSize: '0.9em' }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                                    </svg>
                                                    Productos
                                                </Link>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </li>
                        )}



                        {hasAccess('configuracion') && (
                            <li className="nav-item">
                                <Link
                                    to="/configuration"
                                    className={`nav-link ${isActive('/configuration') || isActive('/personal-tipo') || isActive('/comision-tarjeta') || isActive('/especialidad') || isActive('/forma-pago') || isActive('/grupo-inventario') || isActive('/cambiar-password') ? 'active' : ''}`}
                                    onClick={closeSidebar}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                                            <circle cx="12" cy="12" r="3"></circle>
                                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                        </svg>
                                        Configuración
                                    </div>
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="main-content">
                <header className="top-header">
                    <div className="header-left">
                        <button className="hamburger-btn" onClick={toggleSidebar}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className="header-actions">
                        {currentUser && (
                            <div className="user-profile-header">
                                {currentUser.foto ? (
                                    <img src={currentUser.foto} alt={currentUser.name} className="user-avatar" />
                                ) : (
                                    <div className="user-avatar-placeholder">
                                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                )}
                                <span className="user-name dark:text-white">{currentUser.name}</span>
                            </div>
                        )}
                        <div className="header-buttons">
                            {/* Selector de Clínica */}
                            {clinicas.length > 0 && (
                                <div className="clinic-selector-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                                    <span className="clinic-label-mobile-hide" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary, #6b7280)', whiteSpace: 'nowrap' }}>
                                        🏥 Clínica:
                                    </span>
                                    <select
                                        value={clinicaSeleccionada ?? ''}
                                        onChange={e => setClinicaSeleccionada(e.target.value ? Number(e.target.value) : null)}
                                        className={`text-[14px] sm:text-[15px] font-bold py-1.5 px-4 rounded-xl border-2 outline-none cursor-pointer max-w-[200px] shadow-sm transition-all ${clinicaSeleccionada
                                            ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 shadow-blue-100 dark:shadow-blue-900/20"
                                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                        title="Filtrar por clínica"
                                    >
                                        <option value="">Todas las clínicas</option>
                                        {clinicas.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <ThemeToggle />

                            <button
                                onClick={() => navigate('/correos')}
                                className="header-icon-btn relative dark:text-white"
                                title="Correos"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            




                            <button
                                onClick={() => navigate('/')}
                                className="header-icon-btn dark:text-white"
                                title="Inicio"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="header-icon-btn logout-header-btn dark:text-white"
                                title="Cerrar Sesión"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
            <ChatWidget />

        </div>
    );
};

export default Layout;
