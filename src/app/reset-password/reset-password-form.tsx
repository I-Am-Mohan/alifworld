'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useI18n } from '@/i18n/context';

export function ResetPasswordForm({ email }: { email: string }) {
  const { t } = useI18n();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [token, setToken] = useState('');
  const [linkReady, setLinkReady] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    setToken(fragment.get('token') || '');
    setLinkReady(true);
  }, []);

  const hasResetCredentials = Boolean(email && token);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(t('auth.errPassMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword, confirmPassword }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        const reason = body?.error?.details?.reason;
        if (reason === 'PASSWORD_COMPROMISED') {
          throw new Error(t('auth.passwordCompromised'));
        }
        if (reason === 'PASSWORD_REUSED') {
          throw new Error(t('auth.passwordReused'));
        }
        if (reason === 'RESET_TOKEN_INVALID' || response.status === 409) {
          throw new Error(t('auth.resetLinkInvalid'));
        }
        throw new Error(t('auth.passwordResetFailed'));
      }

      setComplete(true);
      window.history.replaceState({}, '', '/reset-password');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t('auth.passwordResetFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-cream px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <header className="flex items-center justify-between border-b border-slate-100 bg-brand-cream/80 px-5 py-4 sm:px-7">
          <AlifLogo size="sm" />
          <LanguageSwitcher />
        </header>

        <div className="p-6 sm:p-8">
          {!linkReady ? (
            <div className="flex min-h-56 items-center justify-center" role="status" aria-label={t('auth.loadingResetLink')}>
              <RefreshCw className="h-7 w-7 animate-spin text-amber-600" aria-hidden="true" />
            </div>
          ) : complete ? (
            <div className="text-center" role="status">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-slate-900">
                {t('auth.passwordResetCompleteTitle')}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
                {t('auth.passwordResetCompleteDesc')}
              </p>
              <Link
                href="/?auth=login"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-amber to-brand-amberHover px-5 py-3 text-sm font-bold text-brand-black shadow-md shadow-amber-500/20 transition hover:from-brand-amberHover hover:to-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              >
                {t('auth.signIn')}
              </Link>
            </div>
          ) : !hasResetCredentials ? (
            <div className="text-center" role="alert">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <AlertCircle className="h-8 w-8" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-slate-900">{t('auth.resetLinkInvalidTitle')}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('auth.resetLinkInvalid')}</p>
              <Link
                href="/?auth=login"
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
              >
                {t('auth.requestAnotherReset')}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <KeyRound className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-slate-900">{t('auth.createNewPassword')}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('auth.createNewPasswordDesc')}</p>

              {error && (
                <div role="alert" className="mt-5 flex gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs leading-relaxed text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">{t('auth.newPassword')}</span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    autoFocus
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">{t('auth.confirmPassword')}</span>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </label>

                <div className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                  <span>{t('auth.passwordRequirements')}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswords((shown) => !shown)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPasswords ? t('auth.hidePasswords') : t('auth.showPasswords')}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-amber to-brand-amberHover px-5 py-3 text-sm font-bold text-brand-black shadow-md shadow-amber-500/20 transition hover:from-brand-amberHover hover:to-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:opacity-50"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {t('auth.resetPassword')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
