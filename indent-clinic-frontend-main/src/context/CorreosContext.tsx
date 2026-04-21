import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface CorreosContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    decrementUnreadCount: () => void;
}

const CorreosContext = createContext<CorreosContextType | undefined>(undefined);

export const useCorreos = () => {
    const context = useContext(CorreosContext);
    if (!context) {
        throw new Error('useCorreos must be used within a CorreosProvider');
    }
    return context;
};

export const CorreosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async (userId: number) => {
        try {
            const response = await api.get(`/correos/unread-count/${userId}`);
            setUnreadCount(response.data);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const refreshUnreadCount = async () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user && user.id) {
                    await fetchUnreadCount(user.id);
                }
            } catch (e) {
                console.error("Error parsing user in CorreosContext", e);
            }
        }
    };

    const decrementUnreadCount = () => {
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    useEffect(() => {
        refreshUnreadCount();

        // Poll every 30 seconds
        const interval = setInterval(refreshUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <CorreosContext.Provider value={{ unreadCount, refreshUnreadCount, decrementUnreadCount }}>
            {children}
        </CorreosContext.Provider>
    );
};
