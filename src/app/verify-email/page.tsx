'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Globe,
  Clock,
} from 'lucide-react';

export default function VerifyEmailPage() {
  const [locale, setLocale] = useState<'bn' | 'en'>('bn');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  // Read email from URL search params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) setEmail(emailParam);
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const fullCode = digits.join('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন' : 'Please provide a valid email address');
      return;
    }

    if (fullCode.length !== 6) {
      setError(locale === 'bn' ? '৬ ডিজিটের ভেরিফিকেশন কোড লিখুন' : 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: fullCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Verification failed');
      }

      setSuccess(data.data.message);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন' : 'Please provide a valid email address');
      return;
    }

    setResending(true);

    try {
      const res = await fetch('/api/v1/auth/email/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to resend verification code');
      }

      setCooldown(data.data.cooldownSeconds || 60);
      if (data.data.devVerificationCode) {
        setDevCode(data.data.devVerificationCode);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 p-0.5 border border-white/20">
            <Image src="/logo.png" alt="AlifWorld Logo" width={36} height={36} className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            AlifWorld
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
              Security
            </span>
          </span>
        </Link>

        {/* Locale Toggle */}
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/60 rounded-lg p-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <button
            onClick={() => setLocale('bn')}
            className={`px-2 py-1 rounded transition-colors ${locale === 'bn' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            বাংলা
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`px-2 py-1 rounded transition-colors ${locale === 'en' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            English
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {success ? (
            /* Success View */
            <div className="py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {locale === 'bn' ? 'ইমেইল ভেরিফিকেশন সফল!' : 'Email Verified!'}
              </h2>

              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                {success}
              </p>

              <Link
                href="/login"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <span>{locale === 'bn' ? 'লগইন করুন' : 'Proceed to Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Verification Form */
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                {locale === 'bn' ? 'ইমেইল ভেরিফাই করুন' : 'Verify Your Email'}
              </h1>

              <p className="text-slate-400 text-xs sm:text-sm mb-6">
                {locale === 'bn'
                  ? 'আপনার ইমেইলে পাঠানো ৬ ডিজিটের ওটিপি কোডটি লিখুন।'
                  : 'Enter the 6-digit OTP code sent to your email.'}
              </p>

              {error && (
                <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs sm:text-sm text-left">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {devCode && (
                <div className="mb-4 p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono">
                  Dev OTP Code: <span className="font-bold text-white">{devCode}</span>
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-5">
                {/* Email Display & Edit */}
                <div className="text-left">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {locale === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tanvir@example.com"
                    className="w-full px-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-left"
                  />
                </div>

                {/* 6 Digit Inputs */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2 text-left">
                    {locale === 'bn' ? '৬-ডিজিট ভেরিফিকেশন কোড' : '6-Digit Verification Code'}
                  </label>
                  <div className="flex justify-between gap-2">
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={idx === 0 ? handlePaste : undefined}
                        className="w-12 h-13 text-center text-xl font-bold bg-slate-800/90 border border-slate-700/90 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                    ))}
                  </div>
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={loading || fullCode.length !== 6}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{locale === 'bn' ? 'যাচাই করুন' : 'Verify Code'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend Controls */}
              <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{locale === 'bn' ? 'কোড পাননি?' : "Didn't get the code?"}</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="text-emerald-400 hover:text-emerald-300 font-medium disabled:text-slate-500 flex items-center gap-1.5 transition-colors"
                >
                  {resending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{cooldown}s {locale === 'bn' ? 'পরে আবার' : 'cooldown'}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{locale === 'bn' ? 'আবার পাঠান' : 'Resend Code'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} AlifWorld Marketplace Ltd. Bangladesh. All rights reserved.</p>
      </footer>
    </div>
  );
}
