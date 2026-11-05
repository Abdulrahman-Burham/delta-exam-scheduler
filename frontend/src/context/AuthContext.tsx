'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, RoleEnum } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: RoleEnum | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  switchDemoUser: (email: string) => Promise<User>;
  clearError: () => void;
  getDashboardUrl: (role?: RoleEnum | null) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    setIsLoading(true);
    try {
      const me = await api.auth.getMe();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(email, password);
      // Store token as secondary fallback for legacy components
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
      }
      const me = await api.auth.getMe();
      setUser(me);
      return me;
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
      setIsLoading(false);
      window.location.href = '/login';
    }
  };

  const switchDemoUser = async (email: string): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.auth.switchDemoUser(email);
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
      }
      const me = await api.auth.getMe();
      setUser(me);
      return me;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getDashboardUrl = (targetRole?: RoleEnum | null): string => {
    const r = (targetRole || user?.role)?.toUpperCase();
    if (r === 'ADMIN') return '/admin/dashboard';
    if (r === 'DOCTOR' || r === 'PROFESSOR') return '/doctor/dashboard';
    if (r === 'TA') return '/ta/dashboard';
    return '/login';
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        switchDemoUser,
        clearError,
        getDashboardUrl,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
