'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useI18n } from '@/i18n/context';
import { csrfFetch } from '@/shared/security/csrf-client';

export default function SellerLoginPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError(t('admin.identifierPasswordRequired') || 'Please provide your email/phone and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await csrfFetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          clientType: 'WEB',
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || 'Invalid merchant credentials.');
      }

      const user = data.data?.user;
      const roles: string[] = user?.roles || [];
      const hasSellerAccess =
        user?.sellerId ||
        roles.includes('SELLER_OWNER') ||
        roles.includes('SELLER_MANAGER') ||
        roles.includes('SELLER_STAFF');

      if (!hasSellerAccess) {
        // Automatically revoke session cookies if user has no merchant tenant
        await csrfFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
        throw new Error('Access denied. Your account is not registered as a merchant seller.');
      }

      // Successful seller login
      router.push('/seller/products');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Invalid merchant credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between relative overflow-hidden text-slate-900">
      {/* Ambient background glow accents */}
      <div className="pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlifLogo size="sm" href="/" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs uppercase tracking-widest font-mono font-bold text-[#FF6A00]">
              Seller Center
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center space-x-1 py-1.5 px-2.5 rounded-lg hover:bg-slate-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Return to Storefront</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-900/5 p-7 sm:p-9 relative z-10">
          {/* Brand Logo & Header */}
          <div className="text-center mb-6">
             <div className="flex justify-center mb-4">
                          <AlifLogo size="lg" href="/admin/login" />
                        </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight">
              Sign in to Seller Center
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Merchant operations, catalog management, and order fulfillment workspace.
            </p>
          </div>

          {/* Alert Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="seller-identifier"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Email Address or Bangladesh Mobile Phone
              </label>
              <input
                id="seller-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="merchant@example.com or +8801700000000"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="seller-password"
                  className="block text-xs font-bold text-slate-700"
                >
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs font-semibold text-[#FF6A00] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="seller-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-sm shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign in to Merchant Hub</span>
              )}
            </button>
          </form>

          {/* Footer Action */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Want to sell on AlifWorld? </span>
            <Link href="/seller/apply" className="font-bold text-[#FF6A00] hover:underline">
              Apply for Merchant Onboarding
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-400">
        © 2026 AlifWorld Merchant Hub. Authenticated merchant access required.
      </footer>
    </div>
  );
}
