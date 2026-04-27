import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

const IdleTimeoutHandler: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const checkIntervalRef = useRef<any>(null);
    const lastActivityKey = 'lastActivityTime';
    
    // 15 minutes in milliseconds
    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    
    const logout = useCallback(() => {
        const user = localStorage.getItem('user');
        if (!user) return;

        console.log('[IdleTimeoutHandler] Logging out due to inactivity...');
        
        // Clear session
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem(lastActivityKey);
        
        // Notify user
        Swal.fire({
            title: 'Sesión Finalizada',
            text: 'Tu sesión ha cerrado automáticamente debido a 15 minutos de inactividad por seguridad.',
            icon: 'info',
            timer: 3000,
            showConfirmButton: false,
            allowOutsideClick: false
        }).then(() => {
            navigate('/login');
        });
    }, [navigate]);

    const updateLastActivity = useCallback(() => {
        const user = localStorage.getItem('user');
        if (user && location.pathname !== '/login') {
            localStorage.setItem(lastActivityKey, Date.now().toString());
        }
    }, [location.pathname]);

    // Throttled version of updateLastActivity to avoid excessive storage writes
    const lastUpdateTimeRef = useRef<number>(0);
    const handleActivity = useCallback(() => {
        const now = Date.now();
        if (now - lastUpdateTimeRef.current > 5000) { // Update every 5 seconds at most
            updateLastActivity();
            lastUpdateTimeRef.current = now;
        }
    }, [updateLastActivity]);

    const checkInactivity = useCallback(() => {
        const user = localStorage.getItem('user');
        
        // If no user is logged in, we don't need to check for inactivity
        if (!user || location.pathname === '/login') {
            if (checkIntervalRef.current) {
                // We can stop checking if we are on login page
                // but we keep the interval to detect when user logs back in if the component stays mounted
            }
            return;
        }

        const lastActivity = localStorage.getItem(lastActivityKey);
        if (!lastActivity) {
            // If no last activity recorded but user is logged in, initialize it
            updateLastActivity();
            return;
        }

        const elapsedSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        
        // Check if limit exceeded
        if (elapsedSinceLastActivity >= INACTIVITY_LIMIT) {
            logout();
        }
    }, [logout, location.pathname, updateLastActivity, INACTIVITY_LIMIT]);

    useEffect(() => {
        // Initialize last activity if not present
        updateLastActivity();

        // Events that reset the inactivity timer
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click'
        ];

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Set interval to check inactivity every 30 seconds
        // This handles tab suspension and multi-tab synchronization
        checkIntervalRef.current = setInterval(checkInactivity, 30000);

        // Also listen for storage events to sync logout across tabs immediately
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'user' && !e.newValue && location.pathname !== '/login') {
                navigate('/login');
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Cleanup
        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [handleActivity, checkInactivity, updateLastActivity, location.pathname, navigate]);

    return null; // This component doesn't render anything
};

export default IdleTimeoutHandler;

