'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  User,
  Laptop,
  Smartphone,
  ShieldCheck,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Globe,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { useAuthModal } from './auth-context';
import { useI18n } from '@/i18n/context';
import { ChangePasswordForm } from './change-password-form';

interface SessionItem {
  id: string;
  clientType: 'WEB' | 'MOBILE_FLUTTER' | 'POS' | 'ADMIN_PORTAL';
  deviceSummary: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export function AccountSessionModal() {
  const { user, isAccountOpen, closeAccountModal, logout } = useAuthModal();
  const { t } = useI18n();

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const fetchSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/v1/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data?.sessions)) {
          setSessions(data.data.sessions);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (isAccountOpen && user) {
      fetchSessions();
      setConfirmRevokeId(null);
      setConfirmRevokeOthers(false);
      setConfirmRevokeAll(false);
    }
  }, [isAccountOpen, user, fetchSessions]);

  if (!isAccountOpen || !user) return null;

  const handleRevokeSingle = async (sessionId: string) => {
    try {
      setActionLoadingId(sessionId);
      const res = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.isCurrent) {
          await logout();
          return;
        }
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setConfirmRevokeId(null);
        showToast(t('auth.deviceRevokedSuccess'));
      }
    } catch {
      // Ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      setActionLoadingId('others');
      const res = await fetch('/api/v1/auth/sessions/revoke-others', {
        method: 'POST',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setConfirmRevokeOthers(false);
        showToast(t('auth.otherDevicesRevokedSuccess'));
      }
    } catch {
      // Ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeAll = async () => {
    try {
      setActionLoadingId('all');
      const res = await fetch('/api/v1/auth/sessions/revoke-all', {
        method: 'POST',
      });
      if (res.ok) {
        showToast(t('auth.allDevicesRevokedSuccess'));
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch {
      // Ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="fixed inset-0 z-[9990] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 md:p-4">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[10000] bg-[#18181B] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-sm font-semibold border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Sheet / Modal Card */}
      <div className="w-full max-w-lg bg-white rounded-t-[2rem] md:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col relative animate-slide-up md:animate-scale-in">
        {/* Mobile Swipe Handle Indicator */}
        <div className="md:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-[#FAF9F6]/60">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-[#D97706] flex items-center justify-center font-black text-base shadow-sm">
              {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {user.name || t('auth.myAccount')}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <ShieldCheck className="w-3 h-3 mr-0.5 text-amber-600" />
                  {user.roles[0] || 'CUSTOMER'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {user.phone || user.email || t('auth.accountSettings')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAccountModal}
            aria-label={t('auth.close')}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable Device & Session List */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <section aria-labelledby="password-security-heading">
            <h4 id="password-security-heading" className="mb-3 text-sm font-bold text-slate-900">
              {t('auth.passwordSecurity')}
            </h4>
            <ChangePasswordForm onPasswordChanged={logout} />
          </section>

          {/* Active Devices Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t('auth.activeDevices')}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('auth.activeDevicesSubtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchSessions}
                disabled={loadingSessions}
                aria-label={t('auth.refreshDevices')}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                title={t('auth.refreshDevices')}
              >
                <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin text-amber-500' : ''}`} />
              </button>
            </div>

            {loadingSessions && sessions.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mb-2 text-[#F59E0B]" />
                <span className="text-xs font-semibold">Loading devices...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {t('auth.noActiveSessions')}
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      session.isCurrent
                        ? 'bg-amber-50/40 border-amber-200/80 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            session.isCurrent
                              ? 'bg-amber-500 text-black shadow-sm'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {session.clientType === 'MOBILE_FLUTTER' ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {session.deviceSummary}
                            </span>
                            {session.isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                {t('auth.currentDevice')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
                            {session.ipAddress && (
                              <span className="flex items-center space-x-1">
                                <Globe className="w-3 h-3 text-slate-400" />
                                <span>{session.ipAddress}</span>
                              </span>
                            )}
                            <span>•</span>
                            <span>
                              {session.isCurrent
                                ? t('auth.deviceActiveNow')
                                : new Date(session.lastActiveAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Log out Device Action Button */}
                      {!session.isCurrent && (
                        <div className="shrink-0">
                          {confirmRevokeId === session.id ? (
                            <div className="flex items-center space-x-1 animate-fade-in">
                              <button
                                type="button"
                                onClick={() => handleRevokeSingle(session.id)}
                                disabled={actionLoadingId === session.id}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                              >
                                {actionLoadingId === session.id ? '...' : t('auth.logoutDevice')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold rounded-lg transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeId(session.id)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 text-[11px] font-semibold text-slate-600 transition-colors cursor-pointer"
                            >
                              {t('auth.logoutDevice')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Revoke Other Devices Action */}
          {otherSessionsCount > 0 && (
            <div className="pt-1">
              {confirmRevokeOthers ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      {t('auth.confirmLogoutOthers')}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleRevokeOthers}
                      disabled={actionLoadingId === 'others'}
                      className="py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      {actionLoadingId === 'others' ? '...' : t('auth.logoutOtherDevices')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeOthers(false)}
                      className="py-1.5 px-3 bg-white border border-amber-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                    >
                      {t('auth.dismiss')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRevokeOthers(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                >
                  <Laptop className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('auth.logoutOtherDevices')} ({otherSessionsCount})</span>
                </button>
              )}
            </div>
          )}

          {/* Destructive Action: Global Revoke Everywhere */}
          <div className="pt-2 border-t border-slate-100">
            {confirmRevokeAll ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl animate-fade-in">
                <div className="flex items-start space-x-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-900 leading-relaxed font-medium">
                    {t('auth.confirmLogoutAll')}
                  </p>
                </div>
                <div className="mt-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRevokeAll}
                    disabled={actionLoadingId === 'all'}
                    className="py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    {actionLoadingId === 'all' ? '...' : t('auth.logoutAllDevices')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRevokeAll(false)}
                    className="py-1.5 px-3 bg-white border border-red-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    {t('auth.dismiss')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRevokeAll(true)}
                className="w-full py-2 text-red-600 hover:text-red-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('auth.logoutAllDevices')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer with Sign Out Button */}
        <div className="px-6 py-4 bg-[#FAF9F6] border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={closeAccountModal}
            className="py-2 px-4 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-200/60 transition-colors"
          >
            {t('auth.close')}
          </button>

          <button
            type="button"
            onClick={logout}
            className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center space-x-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('auth.signOut')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
