'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AuthMode = 'login' | 'register';

export interface UserSessionState {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  roles: string[];
  permissions?: string[];
  sellerId?: string | null;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
}

interface AuthContextType {
  isOpen: boolean;
  mode: AuthMode;
  user: UserSessionState | null;
  isLoadingUser: boolean;
  openAuthModal: (initialMode?: AuthMode) => void;
  closeAuthModal: () => void;
  setMode: (mode: AuthMode) => void;
  loginSuccess: (userData: UserSessionState) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [user, setUser] = useState<UserSessionState | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const refreshUser = async () => {
    try {
      setIsLoadingUser(true);
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setUser(data.data);
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    refreshUser();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authParam = params.get('auth');
      if (authParam === 'login' || authParam === 'register') {
        setMode(authParam);
        setIsOpen(true);
      }
    }
  }, []);

  const openAuthModal = (initialMode: AuthMode = 'login') => {
    setMode(initialMode);
    setIsOpen(true);
  };

  const closeAuthModal = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined' && window.location.search.includes('auth=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
  };

  const loginSuccess = (userData: UserSessionState) => {
    setUser(userData);
    setIsOpen(false);
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isOpen,
        mode,
        user,
        isLoadingUser,
        openAuthModal,
        closeAuthModal,
        setMode,
        loginSuccess,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthProvider');
  }
  return context;
}
