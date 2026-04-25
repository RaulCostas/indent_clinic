import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

const IdleTimeoutHandler: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const timeoutRef = useRef<any>(null);
    
    // 15 minutes in milliseconds
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    
    const logout = useCallback(() => {
        const user = localStorage.getItem('user');
        if (!user) return;

        console.log('[IdleTimeoutHandler] Inactivity limit reached. Logging out...');
        
        // Clear session
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        
        // Notify user
        Swal.fire({
            title: 'Sesión Finalizada',
            text: 'Tu sesión ha cerrado automáticamente debido a 15 minutos de inactividad por seguridad.',
            icon: 'info',
            timer: 2000,
            showConfirmButton: false,
            allowOutsideClick: false
        }).then(() => {
            navigate('/login');
        });
    }, [navigate]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        // Only set timer if user is logged in and not on login page
        const user = localStorage.getItem('user');
        if (user && location.pathname !== '/login') {
            timeoutRef.current = setTimeout(logout, INACTIVITY_LIMIT);
        }
    }, [logout, INACTIVITY_LIMIT, location.pathname]);

    useEffect(() => {
        // Events that reset the inactivity timer
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        const handleActivity = () => resetTimer();

        // Initialize timer
        resetTimer();

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);

    return null; // This component doesn't render anything
};

export default IdleTimeoutHandler;
