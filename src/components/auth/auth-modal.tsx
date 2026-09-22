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
  Edit2,
  KeyRound,
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { useAuthModal, AuthMode } from './auth-context';
import { useI18n } from '@/i18n/context';
import { getBangladeshMobileOperator } from '@/shared/utils/phone';
import { getBangladeshDistricts } from '@/shared/geo/bangladesh-geo';

type LoginStep = 'number' | 'unregistered' | 'otp' | 'password' | 'forgot';
type RegisterStep = 'number' | 'otp' | 'name' | 'password' | 'details' | 'success';

export function AuthModal() {
  const { isOpen, mode, setMode, closeAuthModal, loginSuccess } = useAuthModal();
  const { t: translate, locale } = useI18n();

  // Step state
  const [loginStep, setLoginStep] = useState<LoginStep>('number');
  const [registerStep, setRegisterStep] = useState<RegisterStep>('number');

  // Form Fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [passwordIdentifier, setPasswordIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetRequested, setResetRequested] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  // Register Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [selectedDivisionKey, setSelectedDivisionKey] = useState('dhaka');
  const [selectedDistrict, setSelectedDistrict] = useState('Dhaka');
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

  // Translations mapped from global i18n
  const t = {
    signIn: translate('auth.signIn'),
    register: translate('auth.register'),
    mobileNumber: translate('auth.mobileNumber'),
    mobilePlaceholder: translate('auth.mobilePlaceholder'),
    continue: translate('auth.continue'),
    usePassword: translate('auth.usePassword'),
    useOtp: translate('auth.useOtp'),
    verifyCode: translate('auth.verifyCode'),
    otpSentTo: translate('auth.otpSentTo'),
    resendIn: translate('auth.resendIn'),
    resendNow: translate('auth.resendNow'),
    changeNumber: translate('auth.changeNumber'),
    verifyAndLogin: translate('auth.verifyAndLogin'),
    unregisteredTitle: translate('auth.unregisteredTitle'),
    unregisteredDesc: (p: string) => translate('auth.unregisteredDesc', { phone: p }),
    continueToRegister: translate('auth.continueToRegister'),
    tryAnotherNumber: translate('auth.tryAnotherNumber'),
    stepName: translate('auth.stepName'),
    firstName: translate('auth.firstName'),
    lastName: translate('auth.lastName'),
    next: translate('auth.nextStep'),
    stepPassword: translate('auth.stepPassword'),
    passwordNotice: translate('auth.passwordNotice'),
    password: translate('auth.password'),
    confirmPassword: translate('auth.confirmPassword'),
    stepDetails: translate('auth.stepDetails'),
    detailsSub: translate('auth.detailsSub'),
    address: translate('auth.address'),
    addressPlaceholder: translate('auth.addressPlaceholder'),
    division: translate('auth.division'),
    city: translate('auth.city'),
    cityPlaceholder: translate('auth.cityPlaceholder'),
    birthday: translate('auth.birthday'),
    gender: translate('auth.gender'),
    male: translate('auth.male'),
    female: translate('auth.female'),
    other: translate('auth.other'),
    completeReg: translate('auth.completeReg'),
    skipNow: translate('auth.skipNow'),
    welcome: translate('auth.welcome'),
    welcomeSub: translate('auth.welcomeSub'),
    signInWithMobile: translate('auth.signInWithMobile'),
    signInWithMobileDesc: translate('auth.signInWithMobileDesc'),
    signInWithPassword: translate('auth.signInWithPassword'),
    signInWithPasswordDesc: translate('auth.signInWithPasswordDesc'),
    emailOrMobile: translate('auth.emailOrMobile'),
    createAccount: translate('auth.createAccount'),
    createAccountDesc: translate('auth.createAccountDesc'),
    step1of3: translate('auth.step1of3'),
    step2of3: translate('auth.step2of3'),
    step3of3: translate('auth.step3of3'),
    enterNameDesc: translate('auth.enterNameDesc'),
    firstNamePlaceholder: translate('auth.firstNamePlaceholder'),
    lastNamePlaceholder: translate('auth.lastNamePlaceholder'),
    safeAndEncrypted: translate('auth.safeAndEncrypted'),
    identitySystem: translate('auth.identitySystem'),
    devOtpLabel: translate('auth.devOtpLabel'),
    clickToFill: translate('auth.clickToFill'),
    close: translate('auth.close'),
    forgotPassword: translate('auth.forgotPassword'),
    forgotPasswordTitle: translate('auth.forgotPasswordTitle'),
    forgotPasswordDesc: translate('auth.forgotPasswordDesc'),
    emailAddress: translate('auth.emailAddress'),
    sendResetLink: translate('auth.sendResetLink'),
    resetRequestAccepted: translate('auth.resetRequestAccepted'),
    backToSignIn: translate('auth.backToSignIn'),
    openDevResetLink: translate('auth.openDevResetLink'),
    orContinueWith: translate('auth.orContinueWith'),
    continueWithGoogle: translate('auth.continueWithGoogle'),
    continueWithFacebook: translate('auth.continueWithFacebook'),
  };

  const divisionList = [
    { key: 'dhaka', name: translate('store.divisions.dhaka').split(',')[0] },
    { key: 'chittagong', name: translate('store.divisions.chittagong').split(',')[0] },
    { key: 'sylhet', name: translate('store.divisions.sylhet').split(',')[0] },
    { key: 'rajshahi', name: translate('store.divisions.rajshahi').split(',')[0] },
    { key: 'khulna', name: translate('store.divisions.khulna').split(',')[0] },
    { key: 'barisal', name: translate('store.divisions.barisal').split(',')[0] },
    { key: 'rangpur', name: translate('store.divisions.rangpur').split(',')[0] },
    { key: 'mymensingh', name: translate('store.divisions.mymensingh').split(',')[0] },
  ];

  const detectedOperator = phone.trim() ? getBangladeshMobileOperator(phone.trim()) : null;
  const availableDistricts = getBangladeshDistricts(selectedDivisionKey);

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
      setError(translate('auth.errEnterPhone'));
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
        throw new Error(checkData.error?.message || translate('auth.errCheckNumber'));
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
          throw new Error(otpData.error?.message || translate('auth.errSendOtp'));
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
      setError(translate('auth.errEnter6Digits'));
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
        throw new Error(data.error?.message || translate('auth.errInvalidCode'));
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
      setError(translate('auth.errEnterIdentifierPass'));
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
        throw new Error(data.error?.message || translate('auth.errInvalidCreds'));
      }

      loginSuccess(data.data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/password/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          locale: locale === 'bn' ? 'bn-BD' : 'en-BD',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(translate('auth.resetRequestFailed'));
      }
      setDevResetToken(data.data.devResetToken || null);
      setResetRequested(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : translate('auth.resetRequestFailed')
      );
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
      setError(translate('auth.errEnterPhone'));
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
        throw new Error(data.error?.message || translate('auth.errSendOtp'));
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
      setError(translate('auth.errEnter6Digits'));
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
        throw new Error(data.error?.message || translate('auth.errInvalidCode'));
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
      setError(translate('auth.errEnterFirstName'));
      return;
    }
    if (!lastName.trim()) {
      setError(translate('auth.errEnterLastName'));
      return;
    }

    setRegisterStep('password');
  };

  // 4. Password Submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (registerPassword.length < 8) {
      setError(translate('auth.errPassMin8'));
      return;
    }
    if (registerPassword !== confirmPassword) {
      setError(translate('auth.errPassMismatch'));
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
          division: skipOptional ? undefined : divisionList.find((d) => d.key === selectedDivisionKey)?.name || undefined,
          district: skipOptional ? undefined : selectedDistrict || undefined,
          city: skipOptional ? undefined : (city.trim() || selectedDistrict || undefined),
          birthday: skipOptional ? undefined : birthday || undefined,
          gender: skipOptional ? undefined : gender || undefined,
          clientType: 'WEB',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || translate('auth.errRegFailed'));
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
            {/* Close Button */}
            <button
              type="button"
              onClick={closeAuthModal}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              aria-label={t.close}
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
              <span>{t.devOtpLabel} <strong>{devOtpCode}</strong></span>
              <span className="text-[10px] uppercase underline text-amber-600">{t.clickToFill}</span>
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
                      {t.signInWithMobile}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {t.signInWithMobileDesc}
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
                        className={`w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl pl-20 ${detectedOperator ? 'pr-28' : 'pr-4'} py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition`}
                        autoFocus
                        required
                      />
                      {detectedOperator && (
                        <div className="absolute right-3 flex items-center pointer-events-none">
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-full shadow-xs">
                            {detectedOperator.name}
                          </span>
                        </div>
                      )}
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

                  <SocialOAuthButtons
                    orText={t.orContinueWith}
                    googleText={t.continueWithGoogle}
                    facebookText={t.continueWithFacebook}
                  />
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
                      {t.signInWithPassword}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {t.signInWithPasswordDesc}
                    </p>

                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      {t.emailOrMobile}
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

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(passwordIdentifier.includes('@') ? passwordIdentifier : '');
                        setResetRequested(false);
                        setDevResetToken(null);
                        setLoginStep('forgot');
                        setError(null);
                      }}
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
                    >
                      {t.forgotPassword}
                    </button>
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

                  <SocialOAuthButtons
                    orText={t.orContinueWith}
                    googleText={t.continueWithGoogle}
                    facebookText={t.continueWithFacebook}
                  />
                </form>
              )}

              {loginStep === 'forgot' && (
                <form
                  onSubmit={handlePasswordResetRequest}
                  className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{t.forgotPasswordTitle}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {t.forgotPasswordDesc}
                    </p>
                  </div>

                  {resetRequested ? (
                    <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800">
                      <div className="flex gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{t.resetRequestAccepted}</span>
                      </div>
                      {devResetToken && (
                        <a
                          href={`/reset-password?email=${encodeURIComponent(resetEmail.trim())}#token=${encodeURIComponent(devResetToken)}`}
                          className="mt-3 inline-flex font-bold text-emerald-900 underline"
                        >
                          {t.openDevResetLink}
                        </a>
                      )}
                    </div>
                  ) : (
                    <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                        {t.emailAddress}
                      </span>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(event) => setResetEmail(event.target.value)}
                        autoComplete="email"
                        maxLength={255}
                        required
                        autoFocus
                        className="w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100"
                        placeholder="name@example.com"
                      />
                    </label>
                  )}

                  {!resetRequested && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] px-4 py-3.5 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 transition disabled:opacity-50"
                    >
                      {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                      {t.sendResetLink}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('password');
                      setError(null);
                    }}
                    className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-500 transition hover:text-amber-700"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.backToSignIn}
                  </button>
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
                      {t.createAccount}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {t.createAccountDesc}
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
                        className={`w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 rounded-2xl pl-20 ${detectedOperator ? 'pr-28' : 'pr-4'} py-3 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition`}
                        autoFocus
                        required
                      />
                      {detectedOperator && (
                        <div className="absolute right-3 flex items-center pointer-events-none">
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-full shadow-xs">
                            {detectedOperator.name}
                          </span>
                        </div>
                      )}
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

                  <SocialOAuthButtons
                    orText={t.orContinueWith}
                    googleText={t.continueWithGoogle}
                    facebookText={t.continueWithFacebook}
                  />
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
                      {t.step1of3}
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{t.stepName}</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {t.enterNameDesc}
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
                          placeholder={t.firstNamePlaceholder}
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
                          placeholder={t.lastNamePlaceholder}
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
                      {t.step2of3}
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
                      {t.step3of3}
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
                          placeholder={t.addressPlaceholder}
                          className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] rounded-2xl px-4 py-2.5 text-xs text-slate-900 outline-none transition"
                        />
                      </div>

                      {/* Division & District */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {t.division}
                          </label>
                          <select
                            value={selectedDivisionKey}
                            onChange={(e) => {
                              const newDiv = e.target.value;
                              setSelectedDivisionKey(newDiv);
                              const dists = getBangladeshDistricts(newDiv);
                              if (dists.length > 0) setSelectedDistrict(dists[0].nameEn);
                            }}
                            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] rounded-2xl px-3 py-2 text-xs font-medium text-slate-900 outline-none"
                          >
                            {divisionList.map((d) => (
                              <option key={d.key} value={d.key}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            {locale === 'bn' ? 'জেলা (District)' : 'District'}
                          </label>
                          <select
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#F59E0B] rounded-2xl px-3 py-2 text-xs font-medium text-slate-900 outline-none"
                          >
                            {availableDistricts.map((dist) => (
                              <option key={dist.id} value={dist.nameEn}>
                                {locale === 'bn' ? dist.nameBn : dist.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Birthday & Gender */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
                            <User className="w-3.5 h-3.5 text-slate-400" />
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
            <span>{t.safeAndEncrypted}</span>
          </div>
          <span className="font-semibold text-slate-600">{t.identitySystem}</span>
        </div>
      </div>
    </div>
  );
}

function SocialOAuthButtons({
  orText,
  googleText,
  facebookText,
}: {
  orText: string;
  googleText: string;
  facebookText: string;
}) {
  const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/';

  return (
    <div className="space-y-3 pt-2">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {orText}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Google OAuth Button */}
        <a
          href={`/api/v1/auth/oauth/google?returnUrl=${encodeURIComponent(returnUrl)}`}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-2xl border border-slate-200 shadow-xs transition hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="truncate">Google</span>
        </a>

        {/* Facebook OAuth Button */}
        <a
          href={`/api/v1/auth/oauth/facebook?returnUrl=${encodeURIComponent(returnUrl)}`}
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-2xl border border-slate-200 shadow-xs transition hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
        >
          <svg className="w-4 h-4 shrink-0" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="truncate">Facebook</span>
        </a>
      </div>
    </div>
  );
}

