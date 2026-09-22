'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Globe,
} from 'lucide-react';
import { PASSWORD_POLICY } from '@/shared/auth/token-policy';

export default function CustomerRegisterPage() {
  const [locale, setLocale] = useState<'bn' | 'en'>('bn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);

  // Password rules validation
  const rules = [
    { labelEn: 'At least 8 characters', labelBn: 'কমপক্ষে ৮টি অক্ষর', pass: password.length >= 8 },
    { labelEn: 'At least one uppercase letter (A-Z)', labelBn: 'একটি বড় হাতের অক্ষর (A-Z)', pass: /[A-Z]/.test(password) },
    { labelEn: 'At least one lowercase letter (a-z)', labelBn: 'একটি ছোট হাতের অক্ষর (a-z)', pass: /[a-z]/.test(password) },
    { labelEn: 'At least one number (0-9)', labelBn: 'একটি সংখ্যা (০-৯)', pass: /\d/.test(password) },
    { labelEn: 'At least one special character (!@#$...)', labelBn: 'একটি বিশেষ চিহ্ন (!@#$...)', pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ];

  const passScore = rules.filter((r) => r.pass).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে আপনার পুরো নাম লিখুন' : 'Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে একটি সঠিক ইমেইল দিন' : 'Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      setError(locale === 'bn' ? 'উভয় পাসওয়ার্ড এক হতে হবে' : 'Passwords do not match');
      return;
    }

    if (passScore < 5) {
      setError(locale === 'bn' ? 'পাসওয়ার্ডের সব শর্ত পূরণ করতে হবে' : 'Please meet all password requirements');
      return;
    }

    if (!acceptTerms) {
      setError(locale === 'bn' ? 'আপনাকে ব্যবহারের শর্তাবলী মেনে নিতে হবে' : 'You must accept the terms of service');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          locale: locale === 'bn' ? 'bn-BD' : 'en-BD',
          acceptTerms: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      setSuccess(data.data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
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
              Customer Store
            </span>
          </span>
        </Link>

        {/* Locale Selector */}
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

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {success ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {locale === 'bn' ? 'রেজিস্ট্রেশন সফল হয়েছে!' : 'Registration Successful!'}
              </h2>

              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                {success.message}
              </p>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 text-left mb-6 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">{locale === 'bn' ? 'ইমেইল:' : 'Email:'}</span>
                  <span className="font-semibold text-white">{success.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{locale === 'bn' ? 'গ্রাহক আইডি:' : 'Customer ID:'}</span>
                  <span className="font-mono text-emerald-400">{success.userId}</span>
                </div>
                {success.devVerificationCode && (
                  <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-amber-400">
                    <span>Dev Verification Code:</span>
                    <span className="font-mono font-bold text-sm bg-amber-400/20 px-2 py-0.5 rounded border border-amber-400/30">
                      {success.devVerificationCode}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/verify-email?email=${encodeURIComponent(success.email)}`}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                >
                  {locale === 'bn' ? 'ইমেইল ভেরিফাই করুন' : 'Verify Email Address'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-sm transition-all flex items-center justify-center"
                >
                  {locale === 'bn' ? 'লগইন করুন' : 'Sign In'}
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <div>
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                  {locale === 'bn' ? 'নতুন একাউন্ট তৈরি করুন' : 'Create an Account'}
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm">
                  {locale === 'bn'
                    ? 'আলিফওয়ার্ল্ড কাস্টমার ক্লাবে যুক্ত হন এবং ১০০% নির্ভুল কেনাকাটা উপভোগ করুন।'
                    : 'Join AlifWorld Customer Club for verified commerce and rewards.'}
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs sm:text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {locale === 'bn' ? 'আপনার পুরো নাম' : 'Full Name'} <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder={locale === 'bn' ? 'উদাঃ তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {locale === 'bn' ? 'ইমেইল ঠিকানা' : 'Email Address'} <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="tanvir@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Phone Number (Optional) */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {locale === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile Number (Optional)'}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="01700112233"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {locale === 'bn' ? 'বাংলাদেশি নম্বর (১১ ডিজিট)' : '11-digit Bangladesh number (+880)'}
                  </span>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {locale === 'bn' ? 'পাসওয়ার্ড' : 'Password'} <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-800/50 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">{locale === 'bn' ? 'পাসওয়ার্ডের নিরাপত্তা মান:' : 'Password strength:'}</span>
                        <span className={`font-semibold ${passScore === 5 ? 'text-emerald-400' : passScore >= 3 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {passScore === 5 ? (locale === 'bn' ? 'নিরাপদ' : 'Strong') : passScore >= 3 ? (locale === 'bn' ? 'মাঝারি' : 'Medium') : (locale === 'bn' ? 'দুর্বল' : 'Weak')}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full flex-1 transition-all ${passScore >= 1 ? (passScore === 5 ? 'bg-emerald-500' : passScore >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${passScore >= 2 ? (passScore === 5 ? 'bg-emerald-500' : passScore >= 3 ? 'bg-amber-500' : 'bg-rose-500') : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${passScore >= 3 ? (passScore === 5 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${passScore >= 4 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 transition-all ${passScore === 5 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pt-1">
                        {rules.map((rule, idx) => (
                          <div key={idx} className={`flex items-center gap-1.5 ${rule.pass ? 'text-emerald-400' : 'text-slate-500'}`}>
                            <CheckCircle2 className={`w-3.5 h-3.5 ${rule.pass ? 'text-emerald-400' : 'text-slate-600'}`} />
                            <span>{locale === 'bn' ? rule.labelBn : rule.labelEn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {locale === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'} <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Terms of Service */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded bg-slate-800 border-slate-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                    />
                    <span>
                      {locale === 'bn' ? (
                        <>
                          আমি আলিফওয়ার্ল্ডের{' '}
                          <Link href="/terms" className="text-emerald-400 hover:underline">ব্যবহারের শর্তাবলী</Link>{' '}
                          ও{' '}
                          <Link href="/privacy" className="text-emerald-400 hover:underline">গোপনীয়তা নীতি</Link>{' '}
                          মেনে নিচ্ছি।
                        </>
                      ) : (
                        <>
                          I accept the{' '}
                          <Link href="/terms" className="text-emerald-400 hover:underline">Terms of Service</Link>{' '}
                          and{' '}
                          <Link href="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link>.
                        </>
                      )}
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-60 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{locale === 'bn' ? 'একাউন্ট তৈরি করুন' : 'Create Account'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
                {locale === 'bn' ? 'ইতিমধ্যে একাউন্ট আছে?' : 'Already have an account?'}{' '}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                  {locale === 'bn' ? 'লগইন করুন' : 'Sign in'}
                </Link>
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
