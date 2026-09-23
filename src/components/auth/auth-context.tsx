'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, X } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { csrfFetch } from '@/shared/security/csrf-client';

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
  securityAlert: string | null;
  clearSecurityAlert: () => void;
  isAccountOpen: boolean;
  openAccountModal: () => void;
  closeAccountModal: () => void;
  openAuthModal: (initialMode?: AuthMode) => void;
  closeAuthModal: () => void;
  setMode: (mode: AuthMode) => void;
  loginSuccess: (userData: UserSessionState) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [user, setUser] = useState<UserSessionState | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const openAccountModal = () => {
    if (user && (user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('ADMIN'))) {
      router.push('/admin');
      return;
    }
    setIsAccountOpen(true);
  };

  const closeAccountModal = () => {
    setIsAccountOpen(false);
  };

  const clearSecurityAlert = () => {
    setSecurityAlert(null);
  };

  const refreshUser = async () => {
    try {
      setIsLoadingUser(true);
      let res = await fetch('/api/v1/auth/me');

      // If unauthorized (access token expired), attempt silent refresh using token family
      if (res.status === 401) {
        const refreshRes = await csrfFetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (refreshRes.ok) {
          // Tokens rotated successfully, retry me endpoint with new cookie
          res = await fetch('/api/v1/auth/me');
        } else {
          const refreshErr = await refreshRes.json().catch(() => null);
          if (refreshErr?.error?.code === 'REFRESH_TOKEN_REUSE_DETECTED') {
            setUser(null);
            setSecurityAlert(t('auth.securityAlertBreach'));
            return;
          }
        }
      }

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
    setSecurityAlert(null);
  };

  const logout = async () => {
    try {
      await csrfFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
    setUser(null);
    setIsAccountOpen(false);
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
        securityAlert,
        clearSecurityAlert,
        isAccountOpen,
        openAccountModal,
        closeAccountModal,
        openAuthModal,
        closeAuthModal,
        setMode,
        loginSuccess,
        logout,
        refreshUser,
      }}
    >
      {children}

      {/* Security Alert Dialog (Token Reuse / Breach Detected) */}
      {securityAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-200 p-6 sm:p-7 relative overflow-hidden">
            {/* Ambient Red Accent Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600 shadow-sm">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1 pr-6">
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {t('auth.securityAlertTitle')}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {securityAlert}
                </p>
              </div>
              <button
                type="button"
                onClick={clearSecurityAlert}
                aria-label={t('auth.close')}
                className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  clearSecurityAlert();
                  openAuthModal('login');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs sm:text-sm text-center shadow-sm transition-all active:scale-[0.98]"
              >
                {t('auth.signIn')}
              </button>
              <button
                type="button"
                onClick={clearSecurityAlert}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm text-center transition-all"
              >
                {t('auth.dismiss')}
              </button>
            </div>
          </div>
        </div>
      )}
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

