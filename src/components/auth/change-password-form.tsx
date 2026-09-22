'use client';

import { FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { csrfFetch } from '@/shared/security/csrf-client';

interface ChangePasswordFormProps {
  onPasswordChanged: () => void;
}

export function ChangePasswordForm({ onPasswordChanged }: ChangePasswordFormProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t('auth.errPassMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await csrfFetch('/api/v1/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
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
        if (response.status === 401) {
          throw new Error(t('auth.currentPasswordIncorrect'));
        }
        throw new Error(t('auth.passwordChangeFailed'));
      }

      setSuccess(true);
      setTimeout(onPasswordChanged, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t('auth.passwordChangeFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-400">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">{t('auth.changePassword')}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              {t('auth.changePasswordSubtitle')}
            </span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{t('auth.changePassword')}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {t('auth.passwordSignOutNotice')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setError(null);
          }}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          {t('auth.dismiss')}
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-3 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="mb-3 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('auth.passwordChangedSuccess')}</span>
        </div>
      )}

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('auth.currentPassword')}</span>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('auth.newPassword')}</span>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('auth.confirmPassword')}</span>
          <input
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setShowPasswords((shown) => !shown)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showPasswords ? t('auth.hidePasswords') : t('auth.showPasswords')}
        </button>
        <button
          type="submit"
          disabled={loading || success}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
        >
          {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {t('auth.updatePassword')}
        </button>
      </div>
    </form>
  );
}
