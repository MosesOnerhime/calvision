import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/axios';

interface User { id: number; email: string; first_name: string; last_name: string; }
interface AuthResponse { access: string; refresh: string; user?: User; }
interface RegisterPayload { first_name: string; last_name: string; email: string; password: string; }
interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.get('/api/auth/me/')
        .then(r => setUser(r.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const applyAuthResponse = async (data: AuthResponse) => {
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    if (data.user) {
      setUser(data.user);
      return;
    }
    const me = await api.get('/api/auth/me/');
    setUser(me.data);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/api/auth/login/', { email, password });
    await applyAuthResponse(data);
  };

  const register = async (payload: RegisterPayload) => {
    const { data } = await api.post<AuthResponse>('/api/auth/register/', payload);
    await applyAuthResponse(data);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
