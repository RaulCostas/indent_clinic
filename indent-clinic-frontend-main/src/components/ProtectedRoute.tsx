import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
    moduleId?: string; // Optional: if string, check specific module. If undefined, just check auth (if we had it here, but auth is usually handled by Layout or separate wrapper)
    // Actually, this component is for Module Permissions specifically.
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ moduleId }) => {
    console.log(`[ProtectedRoute] Checking module: ${moduleId || 'none'}`);
    const userString = localStorage.getItem('user');
    console.log(`[ProtectedRoute] userString from localStorage:`, userString);
    let user = null;
    try {
        user = userString ? JSON.parse(userString) : null;
    } catch (e) {
        console.error("[ProtectedRoute] Error parsing user from localStorage", e);
    }
    console.log(`[ProtectedRoute] Parsed user:`, user);

    // If no user object, or user exists but has no id (corrupt state), redirect to login
    if (!user || (user && typeof user !== 'object') || (user && !user.id)) {
        console.warn('[ProtectedRoute] Invalid user in localStorage, redirecting to /login');
        return <Navigate to="/login" replace />;
    }

    const permisos = (user && Array.isArray(user.permisos)) ? user.permisos : [];

    // If moduleId is provided and user has it in their "restricted" list (blacklisted)
    if (moduleId && permisos.includes(moduleId)) {
        // Redirect to home or unauthorized page
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
