'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Phone,
  Lock,
  Mail,
  User,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Globe,
  Edit2,
  ChevronRight,
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { useAuthModal, AuthMode } from './auth-context';

type LoginStep = 'number' | 'unregistered' | 'otp' | 'password';
type RegisterStep = 'number' | 'otp' | 'name' | 'password' | 'details' | 'success';

export function AuthModal() {
  const { isOpen, mode, setMode, closeAuthModal, loginSuccess } = useAuthModal();

  // Language state
  const [locale, setLocale] = useState<'bn' | 'en'>('bn');

  // Step state
  const [loginStep, setLoginStep] = useState<LoginStep>('number');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('number');

  // Form Fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [passwordIdentifier, setPasswordIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [division, setDivision] = useState('Dhaka');
  const [city, setCity] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');

  // UI helpers
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [verificationTicket, setVerificationTicket] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset states when mode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (mode === 'login') {
        setLoginStep('number');
      } else {
        setRegisterStep('number');
      }
      setOtp(['', '', '', '', '', '']);
    }
  }, [isOpen, mode]);

  // Cooldown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0 && (loginStep === 'otp' || registerStep === 'otp')) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown, loginStep, registerStep]);

  if (!isOpen) return null;

  // Translations
  const t = {
    signIn: locale === 'bn' ? 'লগইন' : 'Sign In',
    register: locale === 'bn' ? 'নিবন্ধন' : 'Register',
    mobileNumber: locale === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number',
    mobilePlaceholder: '01XXXXXXXXX',
    continue: locale === 'bn' ? 'এগিয়ে যান' : 'Continue',
    usePassword: locale === 'bn' ? 'পাসওয়ার্ড দিয়ে লগইন করুন' : 'Sign in with password',
    useOtp: locale === 'bn' ? 'মোবাইল ওটিপি দিয়ে লগইন করুন' : 'Sign in with Mobile OTP',
    verifyCode: locale === 'bn' ? 'যাচাইকরণ কোড' : 'Verification Code',
    otpSentTo:
      locale === 'bn'
        ? '৬-সংখ্যার ওটিপি কোড পাঠানো হয়েছে এই নম্বরে:'
        : 'A 6-digit OTP code has been sent to:',
    resendIn: locale === 'bn' ? 'পুনরায় কোড পাঠান:' : 'Resend code in:',
    resendNow: locale === 'bn' ? 'কোড পুনরায় পাঠান' : 'Resend Code',
    changeNumber: locale === 'bn' ? 'নম্বর পরিবর্তন' : 'Change number',
    verifyAndLogin: locale === 'bn' ? 'যাচাই ও লগইন করুন' : 'Verify & Sign In',
    unregisteredTitle: locale === 'bn' ? 'কোনো অ্যাকাউন্ট পাওয়া যায়নি' : 'Account Not Found',
    unregisteredDesc: (p: string) =>
      locale === 'bn'
        ? `${p} নম্বর দিয়ে কোনো অ্যাকাউন্ট নেই। আপনি কি নতুন অ্যাকাউন্ট তৈরি করতে চান?`
        : `No account exists with ${p}. Would you like to create a new account or try another number?`,
    continueToRegister: locale === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Continue to Register',
    tryAnotherNumber: locale === 'bn' ? 'অন্য নম্বর দিয়ে চেষ্টা করুন' : 'Login with another number',
    stepName: locale === 'bn' ? 'আপনার নাম' : 'Your Name',
    firstName: locale === 'bn' ? 'নামের প্রথম অংশ' : 'First Name',
    lastName: locale === 'bn' ? 'নামের শেষ অংশ' : 'Last Name',
    next: locale === 'bn' ? 'পরবর্তী ধাপ' : 'Next Step',
    stepPassword: locale === 'bn' ? 'পাসওয়ার্ড সেট করুন' : 'Set Password',
    passwordNotice:
      locale === 'bn'
        ? 'পরবর্তী লগইনের জন্য এই পাসওয়ার্ডটি ব্যবহার করবেন'
        : 'Use this password for your next logins',
    password: locale === 'bn' ? 'পাসওয়ার্ড' : 'Password',
    confirmPassword: locale === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password',
    stepDetails: locale === 'bn' ? 'ঐচ্ছিক প্রোফাইল তথ্য' : 'Optional Profile Details',
    detailsSub:
      locale === 'bn'
        ? 'এই তথ্যগুলো ঐচ্ছিক। আপনি চাইলে এখনই পূরণ করতে পারেন অথবা পরে যোগ করতে পারেন।'
        : 'These details are optional. You can add them now or complete them later in your profile.',
    address: locale === 'bn' ? 'ডেলিভারি ঠিকানা' : 'Delivery Address',
    division: locale === 'bn' ? 'বিভাগ' : 'Division',
    city: locale === 'bn' ? 'শহর / উপজেলা' : 'City / Upazila',
    birthday: locale === 'bn' ? 'জন্মদিন' : 'Birthday',
    gender: locale === 'bn' ? 'লিঙ্গ' : 'Gender',
    male: locale === 'bn' ? 'পুরুষ' : 'Male',
    female: locale === 'bn' ? 'মহিলা' : 'Female',
    other: locale === 'bn' ? 'অন্যান্য' : 'Other',
    completeReg: locale === 'bn' ? 'নিবন্ধন সম্পন্ন করুন' : 'Complete Registration',
    skipNow: locale === 'bn' ? 'এখনই নয়, পরে করব' : 'Skip for Now',
    welcome: locale === 'bn' ? 'আলিফওয়ার্ল্ড-এ আপনাকে স্বাগতম!' : 'Welcome to AlifWorld!',
    welcomeSub:
      locale === 'bn'
        ? 'আপনার অ্যাকাউন্ট এবং ৪টি ওয়ালেট সফলভাবে প্রস্তুত হয়েছে।'
        : 'Your account and 4 segregated wallets are ready for shopping.',
  };

  const divisions = [
    'Dhaka',
    'Chattogram',
    'Sylhet',
    'Rajshahi',
    'Khulna',
    'Barishal',
    'Rangpur',
    'Mymensingh',
  ];

  // OTP handlers
  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const focusIdx = Math.min(pasted.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  };

  // --- FLOW A: LOGIN ACTIONS ---

  // 1. Check Phone on Login Submit
  const handleLoginPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে মোবাইল নম্বর দিন' : 'Please enter your mobile number');
      return;
    }

    setLoading(true);
    try {
      // Check if user exists
      const checkRes = await fetch('/api/v1/auth/phone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const checkData = await checkRes.json();

      if (!checkRes.ok || !checkData.success) {
        throw new Error(checkData.error?.message || 'Failed to check number');
      }

      if (!checkData.data.exists) {
        // User not registered -> prompt to Register or Login with Another
        setLoginStep('unregistered');
      } else {
        // User exists -> dispatch login OTP
        const otpRes = await fetch('/api/v1/auth/phone/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, purpose: 'LOGIN' }),
        });
        const otpData = await otpRes.json();

        if (!otpRes.ok || !otpData.success) {
          throw new Error(otpData.error?.message || 'Failed to send OTP');
        }

        setCooldown(60);
        setDevOtpCode(otpData.data.devOtpCode || null);
        setLoginStep('otp');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify Login OTP
  const handleVerifyLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const code = otp.join('');
    if (code.length < 6) {
      setError(
        locale === 'bn'
          ? 'অনুগ্রহ করে সম্পূর্ণ ৬-সংখ্যার কোড দিন'
          : 'Please enter all 6 digits of the code'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/phone/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code, clientType: 'WEB' }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid verification code');
      }

      loginSuccess(data.data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Password Login Option
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordIdentifier.trim() || !loginPassword) {
      setError(
        locale === 'bn'
          ? 'অনুগ্রহ করে ইমেইল/নম্বর ও পাসওয়ার্ড দিন'
          : 'Please enter your identifier and password'
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: passwordIdentifier.trim(),
          password: loginPassword,
          clientType: 'WEB',
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid credentials');
      }

      loginSuccess(data.data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FLOW B: REGISTER ACTIONS ---

  // 1. Submit Phone on Register
  const handleRegisterPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError(locale === 'bn' ? 'অনুগ্রহ করে মোবাইল নম্বর দিন' : 'Please enter your mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, purpose: 'REGISTRATION' }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to send registration OTP');
      }

      setCooldown(60);
      setDevOtpCode(data.data.devOtpCode || null);
      setRegisterStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify Register OTP
  const handleVerifyRegisterOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const code = otp.join('');
    if (code.length < 6) {
      setError(locale === 'bn' ? '৬-সংখ্যার কোড দিন' : 'Please enter 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/phone/verify-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid verification code');
      }

      setVerificationTicket(data.data.verificationTicket);
      // Advance to Name step!
      setRegisterStep('name');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Name Submit
  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) {
      setError(locale === 'bn' ? 'প্রথম নাম দিন' : 'First name is required');
      return;
    }
    if (!lastName.trim()) {
      setError(locale === 'bn' ? 'শেষ নাম দিন' : 'Last name is required');
      return;
    }

    setRegisterStep('password');
  };

  // 4. Password Submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (registerPassword.length < 8) {
      setError(locale === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'Password must be at least 8 characters');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setError(locale === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি' : 'Passwords do not match');
      return;
    }

    setRegisterStep('details');
  };

  // 5. Complete Registration (with or without optional details)
  const handleCompleteRegistration = async (skipOptional = false) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/phone/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          verificationTicket,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: registerPassword,
          address: skipOptional ? undefined : address.trim() || undefined,
          division: skipOptional ? undefined : division,
          city: skipOptional ? undefined : city.trim() || undefined,
          birthday: skipOptional ? undefined : birthday || undefined,
          gender: skipOptional ? undefined : gender || undefined,
          clientType: 'WEB',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Registration completion failed');
      }

      setRegisterStep('success');
      setTimeout(() => {
        loginSuccess(data.data.user);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={closeAuthModal}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200 text-slate-900">
        {/* Top Header Bar */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 bg-[#FAF9F6]">
          <AlifLogo size="sm" />

          <div className="flex items-center gap-3">
            {/* Locale Toggle */}
            <button
              type="button"
              onClick={() => setLocale(locale === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 transition"
              title="Toggle Language"
            >
              <Globe className="w-3 h-3 text-slate-500" />
              <span>{locale === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={closeAuthModal}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs (Only shown when not deep in multi-step wizard) */}
        {(loginStep === 'number' || loginStep === 'password' || registerStep === 'number') &&
          registerStep !== 'success' && (
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setLoginStep('number');
                    setError(null);
                  }}
                  className={`py-2.5 rounded-xl transition-all ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setRegisterStep('number');
                    setError(null);
                  }}
                  className={`py-2.5 rounded-xl transition-all ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.register}
                </button>
              </div>
            </div>
          )}

        {/* Modal Body Container with Smooth Transition Animations */}
        <div className="p-6 sm:p-8">
          {/* Global Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-600 text-xs font-medium animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Dev Mode OTP Autofill Pill */}
          {devOtpCode && (loginStep === 'otp' || registerStep === 'otp') && (
            <div
              onClick={() => {
                const digits = devOtpCode.split('');
                setOtp(digits);
              }}
              className="mb-4 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-[11px] text-amber-800 font-semibold cursor-pointer hover:bg-amber-100 transition"
            >
              <span>Development OTP: <strong>{devOtpCode}</strong></span>
              <span className="text-[10px] uppercase underline text-amber-600">Click to fill</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FLOW A: LOGIN FLOW                                                        */}
          {/* ========================================================================= */}
          {mode === 'login' && (
            <div className="transition-all duration-300">
              {/* 1. LOGIN NUMBER STEP */}
              {loginStep === 'number' && (
                <form
                  onSubmit={handleLoginPhoneSubmit}
                  className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">
                      {locale === 'bn' ? 'মোবাইল দিয়ে লগইন করুন' : 'Sign in with Mobile'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {locale === 'bn'
                        ? 'আপনার মোবাইল নম্বর লিখুন। আমরা একটি ওটিপি কোড পাঠাব।'
                        : 'Enter your phone number to receive a 6-digit verification code.'}
                    </p>

                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      {t.mobileNumber}
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1 text-xs font-bold text-slate-700 pointer-events-none select-none">
                        <span>🇧🇩</span>
                        <span>+880</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="1700112233"
                        className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl pl-20 pr-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>{t.continue}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep('password');
                        setError(null);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-[#F59E0B] transition"
                    >
                      {t.usePassword} →
                    </button>
                  </div>
                </form>
              )}

              {/* 2. UNREGISTERED PROMPT STEP (User not registered on number submit) */}
              {loginStep === 'unregistered' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-[#F59E0B] mx-auto flex items-center justify-center font-bold">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{t.unregisteredTitle}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {t.unregisteredDesc(phone)}
                    </p>
                  </div>

                  {/* Option 1: Continue to Register */}
                  <button
                    type="button"
                    onClick={async () => {
                      setMode('register');
                      setRegisterStep('number');
                      // Automatically send OTP for this number and advance!
                      setLoading(true);
                      try {
                        const res = await fetch('/api/v1/auth/phone/send-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ phone: phone.trim(), purpose: 'REGISTRATION' }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setDevOtpCode(data.data.devOtpCode || null);
                          setCooldown(60);
                          setRegisterStep('otp');
                        } else {
                          setError(data.error?.message);
                        }
                      } catch (err: any) {
                        setError(err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <span>{t.continueToRegister}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Option 2: Try Another Number */}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('number');
                      setError(null);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-2xl text-xs transition"
                  >
                    {t.tryAnotherNumber}
                  </button>
                </div>
              )}

              {/* 3. LOGIN OTP STEP */}
              {loginStep === 'otp' && (
                <form
                  onSubmit={handleVerifyLoginOtp}
                  className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-black text-slate-900">{t.verifyCode}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep('number');
                          setError(null);
                        }}
                        className="text-xs text-[#F59E0B] hover:underline font-bold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{t.changeNumber}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t.otpSentTo} <strong className="text-slate-800 font-mono">{phone}</strong>
                    </p>
                  </div>

                  {/* 6-Digit PIN Inputs */}
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="w-12 h-14 sm:w-13 sm:h-16 text-center text-xl font-black bg-[#F8FAFC] border-2 border-slate-200 focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-100 rounded-2xl text-slate-900 outline-none transition"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  {/* Resend Cooldown */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {cooldown > 0 ? (
                      <span className="font-medium">
                        {t.resendIn} <strong className="text-amber-600 font-mono">{cooldown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const res = await fetch('/api/v1/auth/phone/send-otp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ phone: phone.trim(), purpose: 'LOGIN' }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              setCooldown(60);
                              setDevOtpCode(data.data.devOtpCode || null);
                            } else {
                              setError(data.error?.message);
                            }
                          } catch (err: any) {
                            setError(err.message);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="text-[#F59E0B] font-bold hover:underline"
                      >
                        {t.resendNow}
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.join('').length < 6}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t.verifyAndLogin}</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 4. PASSWORD LOGIN OPTION */}
              {loginStep === 'password' && (
                <form
                  onSubmit={handlePasswordLogin}
                  className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">
                      {locale === 'bn' ? 'পাসওয়ার্ড দিয়ে প্রবেশ করুন' : 'Sign in with Password'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {locale === 'bn'
                        ? 'আপনার ইমেইল অথবা মোবাইল নম্বর এবং পাসওয়ার্ড দিন'
                        : 'Enter your email or phone and your password'}
                    </p>

                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      {locale === 'bn' ? 'ইমেইল অথবা মোবাইল' : 'Email or Mobile'}
                    </label>
                    <input
                      type="text"
                      value={passwordIdentifier}
                      onChange={(e) => setPasswordIdentifier(e.target.value)}
                      placeholder="name@example.com / 01XXXXXXXXX"
                      className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none transition"
                      autoFocus
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      {t.password}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl pl-4 pr-11 py-3 text-sm text-slate-900 outline-none transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <span>{t.signIn}</span>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep('number');
                        setError(null);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-[#F59E0B] transition"
                    >
                      ← {t.useOtp}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* FLOW B: REGISTER FLOW                                                     */}
          {/* ========================================================================= */}
          {mode === 'register' && (
            <div className="transition-all duration-300">
              {/* 1. REGISTER NUMBER STEP */}
              {registerStep === 'number' && (
                <form
                  onSubmit={handleRegisterPhoneSubmit}
                  className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">
                      {locale === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create an Account'}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {locale === 'bn'
                        ? 'আপনার মোবাইল নম্বর লিখুন। আমরা একটি ওটিপি কোড পাঠাব।'
                        : 'Enter your phone number to get started with an OTP.'}
                    </p>

                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      {t.mobileNumber}
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 flex items-center gap-1 text-xs font-bold text-slate-700 pointer-events-none select-none">
                        <span>🇧🇩</span>
                        <span>+880</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="1700112233"
                        className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl pl-20 pr-4 py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>{t.continue}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 2. REGISTER OTP STEP */}
              {registerStep === 'otp' && (
                <form
                  onSubmit={handleVerifyRegisterOtp}
                  className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-black text-slate-900">{t.verifyCode}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setRegisterStep('number');
                          setError(null);
                        }}
                        className="text-xs text-[#F59E0B] hover:underline font-bold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{t.changeNumber}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      {t.otpSentTo} <strong className="text-slate-800 font-mono">{phone}</strong>
                    </p>
                  </div>

                  {/* 6-Digit PIN Inputs */}
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="w-12 h-14 sm:w-13 sm:h-16 text-center text-xl font-black bg-[#F8FAFC] border-2 border-slate-200 focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-100 rounded-2xl text-slate-900 outline-none transition"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    {cooldown > 0 ? (
                      <span className="font-medium">
                        {t.resendIn} <strong className="text-amber-600 font-mono">{cooldown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const res = await fetch('/api/v1/auth/phone/send-otp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ phone: phone.trim(), purpose: 'REGISTRATION' }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              setCooldown(60);
                              setDevOtpCode(data.data.devOtpCode || null);
                            }
                          } catch {}
                          setLoading(false);
                        }}
                        className="text-[#F59E0B] font-bold hover:underline"
                      >
                        {t.resendNow}
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.join('').length < 6}
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    ) : (
                      <>
                        <span>{t.next}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* 3. REGISTER NAME STEP */}
              {registerStep === 'name' && (
                <form
                  onSubmit={handleNameSubmit}
                  className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div>
                    <div className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-full mb-1">
                      {locale === 'bn' ? 'ধাপ ১/৩' : 'Step 1 of 3'}
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{t.stepName}</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {locale === 'bn' ? 'আপনার পুরো নাম লিখুন' : 'Please enter your first and last name'}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                          {t.firstName}
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={locale === 'bn' ? 'তানভীর' : 'Tanvir'}
                          className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                          autoFocus
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                          {t.lastName}
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={locale === 'bn' ? 'আহমেদ' : 'Ahmed'}
                          className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    <span>{t.next}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* 4. REGISTER PASSWORD STEP */}
              {registerStep === 'password' && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div>
                    <div className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-full mb-1">
                      {locale === 'bn' ? 'ধাপ ২/৩' : 'Step 2 of 3'}
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{t.stepPassword}</h3>

                    {/* Explicit Notice as requested */}
                    <div className="my-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{t.passwordNotice}</span>
                    </div>

                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                          {t.password}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl pl-4 pr-11 py-3 text-sm text-slate-900 outline-none transition"
                            autoFocus
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                          {t.confirmPassword}
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl px-4 py-3 text-sm text-slate-900 outline-none transition"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    <span>{t.next}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* 5. REGISTER OPTIONAL DETAILS STEP (Address, Birthday, Gender) */}
              {registerStep === 'details' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div>
                    <div className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[11px] rounded-full mb-1">
                      {locale === 'bn' ? 'ধাপ ৩/৩ (ঐচ্ছিক)' : 'Step 3 of 3 (Optional)'}
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{t.stepDetails}</h3>
                    <p className="text-xs text-slate-500 mb-3">{t.detailsSub}</p>

                    <div className="space-y-3">
                      {/* Address */}
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.address}</span>
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder={locale === 'bn' ? 'রোড, বাড়ি নং, এলাকা...' : 'Road, House, Area...'}
                          className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] rounded-2xl px-4 py-2.5 text-xs text-slate-900 outline-none transition"
                        />
                      </div>

                      {/* Division & City */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {t.division}
                          </label>
                          <select
                            value={division}
                            onChange={(e) => setDivision(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] rounded-2xl px-3 py-2 text-xs font-medium text-slate-900 outline-none"
                          >
                            {divisions.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">{t.city}</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder={locale === 'bn' ? 'যেমন: গুলশান' : 'e.g. Gulshan'}
                            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      {/* Birthday & Gender */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{t.birthday}</span>
                          </label>
                          <input
                            type="date"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{t.gender}</span>
                          </label>
                          <div className="flex gap-1">
                            {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setGender(gender === g ? '' : g)}
                                className={`flex-1 py-2 text-[10px] font-bold rounded-xl border transition ${
                                  gender === g
                                    ? 'bg-[#F59E0B] text-slate-950 border-[#F59E0B]'
                                    : 'bg-[#F8FAFC] text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {g === 'MALE' ? t.male : g === 'FEMALE' ? t.female : t.other}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complete Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleCompleteRegistration(false)}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-slate-950 font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t.completeReg}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCompleteRegistration(true)}
                      disabled={loading}
                      className="w-full text-slate-500 hover:text-slate-800 font-semibold py-2 px-4 rounded-xl text-xs transition"
                    >
                      {t.skipNow} →
                    </button>
                  </div>
                </div>
              )}

              {/* 6. REGISTER SUCCESS STEP */}
              {registerStep === 'success' && (
                <div className="py-8 text-center space-y-3 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{t.welcome}</h3>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                    {t.welcomeSub}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Safe &amp; Encrypted</span>
          </div>
          <span className="font-semibold text-slate-600">AlifWorld Identity</span>
        </div>
      </div>
    </div>
  );
}
