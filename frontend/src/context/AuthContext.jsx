import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, saveSession, getSession, clearSession, syncUserLibrary } from '../data/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const session = getSession();
            if (session) {
                await syncUserLibrary(session.id);
                setUser(session);
            }
            setLoading(false);
        })();
    }, []);

    const login = useCallback(async (username, password) => {
        const result = await loginUser(username, password);
        if (result.success) {
            await syncUserLibrary(result.user.id);
            setUser(result.user);
            saveSession(result.user);
        }
        return result;
    }, []);

    const register = useCallback(async (username, password) => {
        const result = await registerUser(username, password);
        if (result.success) {
            setUser(result.user);
            saveSession(result.user);
        }
        return result;
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        clearSession();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}