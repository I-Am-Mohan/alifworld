'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Store,
  Building2,
  FileText,
  MapPin,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Edit3,
  Info,
  ChevronRight,
  Save,
  Award,
  CreditCard,
  Truck,
  Upload,
  Copy,
  FileCheck,
  CheckCircle,
  Briefcase,
  User,
  Zap,
  Search,
  ShoppingCart,
  Phone,
  Mail,
  ChevronDown,
  Clipboard,
  Smartphone,
  X,
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useI18n } from '@/i18n/context';
import { useAuthModal } from '@/components/auth/auth-context';
import { csrfFetch } from '@/shared/security/csrf-client';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS,
  BANGLADESH_UPAZILAS,
} from '@/shared/geo/bangladesh-geo';

function FacebookIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type Application = {
  id: string;
  status: string;
  businessName: string;
  slug: string;
  tradeLicenseNumber: string | null;
  binNumber: string | null;
  tinNumber: string | null;
  version: number;
  reviewReason: string | null;
};

interface FormState {
  sellerName: string;
  mobileNumber: string;
  emailAddress: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  slug: string;
  merchantType: 'PROPRIETORSHIP' | 'CORPORATE' | 'BRAND_DISTRIBUTOR';
  tradeLicenseNumber: string;
  binNumber: string;
  tinNumber: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  streetAddress: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
}

const STEPS = [
  { id: 1, title: 'Seller Account', icon: User, desc: 'Credentials & verification' },
  { id: 2, title: 'Store Identity', icon: Store, desc: 'Business info & handle' },
  { id: 3, title: 'NBR Compliance', icon: FileText, desc: 'Trade license, BIN & TIN' },
  { id: 4, title: 'Logistics Location', icon: MapPin, desc: 'Warehouse & pickup address' },
  { id: 5, title: 'KYC Checklist', icon: ShieldCheck, desc: 'Verification documents' },
  { id: 6, title: 'Review & Submit', icon: CheckCircle2, desc: 'Final application check' },
];

/* -------------------------------------------------------------------------- */
/* Custom Graphic SVG Illustrations & Banner Components                      */
/* -------------------------------------------------------------------------- */
function MerchantHeroIllustration() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-6 sm:p-8 text-white shadow-2xl border border-slate-800">
      <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 -bottom-10 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-lg text-center md:text-left">
          <div className="inline-flex items-center space-x-2 text-[11px] font-mono font-bold uppercase tracking-widest text-[#FF6A00] bg-orange-500/15 px-3.5 py-1 rounded-full border border-orange-500/30 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>AlifWorld Merchant Network • 64 Districts</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Scale Your Business Across Bangladesh
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Join Bangladesh&apos;s premier merchant hub. Enjoy 0% listing fees, guaranteed weekly BDT settlements, Pathao &amp; RedX express logistics, and automated NBR VAT compliance.
          </p>

          <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-slate-200">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Verified Store Handle</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>NBR 13-digit BIN Verified</span>
            </div>
          </div>
        </div>

        {/* Real Hero Graphic Image Banner Card */}
        <div className="w-full max-w-sm shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group hover:scale-[1.02] transition-transform duration-300">
          <img
            src="/seller-hero-banner.jpg"
            alt="AlifWorld Merchant Platform"
            className="w-full h-auto object-cover rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}

export default function SellerApplicationPage() {
  const { openAuthModal, openAccountModal, user, refreshUser } = useAuthModal();
  const { t, locale } = useI18n();

  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Dhaka, Bangladesh');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const [application, setApplication] = useState<Application | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationTicket, setVerificationTicket] = useState<string | null>(null);
  const [accountProvisioned, setAccountProvisioned] = useState(false);
  const [devPhoneOtp, setDevPhoneOtp] = useState<string | null>(null);
  const [devEmailOtp, setDevEmailOtp] = useState<string | null>(null);
  const [verificationBusy, setVerificationBusy] = useState(false);

  // Dedicated OTP popup modal states
  const [activeVerifyModal, setActiveVerifyModal] = useState<'phone' | 'email' | null>(null);
  const [phoneOtpInput, setPhoneOtpInput] = useState('');
  const [emailOtpInput, setEmailOtpInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Field-level validation error map
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, msg: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const [form, setForm] = useState<FormState>({
    sellerName: '',
    mobileNumber: '',
    emailAddress: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    slug: '',
    merchantType: 'PROPRIETORSHIP',
    tradeLicenseNumber: '',
    binNumber: '',
    tinNumber: '',
    divisionId: 'dhaka',
    districtId: 'dhaka',
    upazilaId: 'dhanmondi',
    streetAddress: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const domainDisplay = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/^https?:\/\//, '').replace(/\/$/, '');

  const isValidPhone = /^(\+8801|01)[3-9]\d{8}$/.test(form.mobileNumber.trim());
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailAddress.trim());

  const loadApplication = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/v1/seller/application');
      if (response.status === 401 || response.status === 403) {
        setApplication(null);
        return;
      }
      const json = await response.json().catch(() => null);
      if (response.ok && json?.data) {
        setApplication(json.data);
        setForm((prev) => ({
          ...prev,
          businessName: json.data.businessName || '',
          slug: json.data.slug || '',
          tradeLicenseNumber: json.data.tradeLicenseNumber || '',
          binNumber: json.data.binNumber || '',
          tinNumber: json.data.tinNumber || '',
        }));
      }
    } catch {
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        sellerName: prev.sellerName || user.name || '',
        emailAddress: prev.emailAddress || user.email || '',
        mobileNumber: prev.mobileNumber || user.phone || '',
      }));
      setAccountProvisioned(true);
      setPhoneVerified(Boolean(user.isPhoneVerified));
      setEmailVerified(Boolean(user.isEmailVerified));
    }
  }, [user]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearFieldError(key);
  };

  const generateSlugFromTitle = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
  };

  const handleNameChange = (name: string) => {
    setField('businessName', name);
    if (!application || application.status === 'DRAFT') {
      setField('slug', generateSlugFromTitle(name));
    }
  };

  // Independent Mobile Number OTP Verification
  const handleStartPhoneVerification = async () => {
    clearFieldError('mobileNumber');
    const phone = form.mobileNumber.trim();
    if (!phone) {
      setFieldError('mobileNumber', 'Please enter your mobile number first.');
      return;
    }
    if (!isValidPhone) {
      setFieldError('mobileNumber', 'Enter a valid Bangladesh mobile number (+8801XXXXXXXXX or 01XXXXXXXXX).');
      return;
    }

    try {
      setVerificationBusy(true);
      setModalError(null);
      const isLoginOtp = accountProvisioned || Boolean(user);
      const res = await csrfFetch('/api/v1/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          purpose: isLoginOtp ? 'LOGIN' : 'REGISTRATION',
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Failed to send mobile verification code.');
      }
      setDevPhoneOtp(json.data?.devOtpCode || null);
      setPhoneOtpInput('');
      setActiveVerifyModal('phone');
    } catch (err: any) {
      setFieldError('mobileNumber', err.message || 'Failed to send mobile verification code.');
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleSubmitPhoneOtp = async () => {
    if (!/^\d{6}$/.test(phoneOtpInput.trim())) {
      setModalError('Please enter the 6-digit verification code.');
      return;
    }
    try {
      setVerificationBusy(true);
      setModalError(null);
      const isLoginOtp = accountProvisioned || Boolean(user);
      const verifyRes = await csrfFetch(
        isLoginOtp ? '/api/v1/auth/phone/verify-login' : '/api/v1/auth/phone/verify-register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: form.mobileNumber.trim(),
            code: phoneOtpInput.trim(),
            clientType: 'WEB',
          }),
        }
      );
      const verifyJson = await verifyRes.json().catch(() => null);
      if (!verifyRes.ok || !verifyJson?.success) {
        throw new Error(verifyJson?.error?.message || 'Invalid or expired verification code.');
      }

      if (isLoginOtp) {
        setPhoneVerified(true);
        clearFieldError('mobileNumber');
        setActiveVerifyModal(null);
        await refreshUser();
        return;
      }

      const ticket = verifyJson.data?.verificationTicket || null;
      setVerificationTicket(ticket);

      if (form.sellerName.trim() && form.password && form.password === form.confirmPassword) {
        const names = form.sellerName.trim().split(/\s+/);
        const firstName = names.shift() || form.sellerName.trim();
        const lastName = names.join(' ') || 'Seller';

        const regRes = await csrfFetch('/api/v1/auth/phone/complete-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: form.mobileNumber.trim(),
            verificationTicket: ticket,
            firstName,
            lastName,
            password: form.password,
            email: form.emailAddress.trim().toLowerCase() || null,
            clientType: 'WEB',
          }),
        });
        const regJson = await regRes.json().catch(() => null);
        if (regRes.ok && regJson?.success) {
          setAccountProvisioned(true);
          await refreshUser();
        }
      }

      setPhoneVerified(true);
      clearFieldError('mobileNumber');
      setActiveVerifyModal(null);
    } catch (err: any) {
      setModalError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerificationBusy(false);
    }
  };

  // Independent Email Address OTP Verification
  const handleStartEmailVerification = async () => {
    clearFieldError('emailAddress');
    const email = form.emailAddress.trim().toLowerCase();
    if (!email) {
      setFieldError('emailAddress', 'Please enter your email address first.');
      return;
    }
    if (!isValidEmail) {
      setFieldError('emailAddress', 'Please enter a valid email address.');
      return;
    }

    try {
      setVerificationBusy(true);
      setModalError(null);

      let activeUser = user;
      if (!activeUser) {
        try {
          const meRes = await fetch('/api/v1/auth/me');
          if (meRes.ok) {
            const meJson = await meRes.json().catch(() => null);
            if (meJson?.success && meJson?.data) activeUser = meJson.data;
          }
        } catch {}
      }

      if (activeUser || accountProvisioned) {
        const res = await csrfFetch('/api/v1/auth/email/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.error?.message || 'Failed to send email verification code.');
        }
        setDevEmailOtp(json.data?.devVerificationCode || json.data?.devOtpCode || null);
        setEmailOtpInput('');
        setActiveVerifyModal('email');
        return;
      }

      if (!activeUser && !accountProvisioned) {
        if (!phoneVerified) {
          setFieldError('mobileNumber', 'Mobile verification is mandatory before email verification. Please verify your mobile number first.');
          return;
        }
        if (!form.sellerName.trim() || form.sellerName.trim().length < 2) {
          setFieldError('sellerName', 'Please enter your full name (at least 2 characters) before verifying email.');
          return;
        }
        if (!form.password) {
          setFieldError('password', 'Please enter a password before verifying email.');
          return;
        }
        const hasUpper = /[A-Z]/.test(form.password);
        const hasLower = /[a-z]/.test(form.password);
        const hasNumber = /\d/.test(form.password);
        const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password);
        if (form.password.length < 8 || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
          setFieldError('password', 'Password must be at least 8 characters and include uppercase (A-Z), lowercase (a-z), number (0-9), and special character.');
          return;
        }
        if (form.password !== form.confirmPassword) {
          setFieldError('confirmPassword', 'Password and Confirm Password do not match.');
          return;
        }
      }

      const regRes = await csrfFetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.sellerName.trim(),
          email,
          phone: form.mobileNumber.trim() || undefined,
          password: form.password,
          acceptTerms: true,
        }),
      });

      const regJson = await regRes.json().catch(() => null);

      if (regRes.status === 409) {
        await csrfFetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: email,
            password: form.password,
            clientType: 'WEB',
          }),
        });
        await refreshUser();
        const resendRes = await csrfFetch('/api/v1/auth/email/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const resendJson = await resendRes.json().catch(() => null);
        setDevEmailOtp(resendJson?.data?.devVerificationCode || null);
      } else if (!regRes.ok || !regJson?.success) {
        const errorObj = regJson?.error;
        if (errorObj?.details && typeof errorObj.details === 'object') {
          Object.entries(errorObj.details).forEach(([field, msg]) => {
            if (typeof msg === 'string') {
              if (field.includes('email')) setFieldError('emailAddress', msg);
              else if (field.includes('password')) setFieldError('password', msg);
              else if (field.includes('name')) setFieldError('sellerName', msg);
              else if (field.includes('phone')) setFieldError('mobileNumber', msg);
              else setFieldError(field, msg);
            }
          });
        }
        if (errorObj?.issues && Array.isArray(errorObj.issues)) {
          errorObj.issues.forEach((issue: any) => {
            if (issue.field?.includes('email')) setFieldError('emailAddress', issue.message);
            if (issue.field?.includes('password')) setFieldError('password', issue.message);
            if (issue.field?.includes('name')) setFieldError('sellerName', issue.message);
            if (issue.field?.includes('phone')) setFieldError('mobileNumber', issue.message);
          });
        }
        throw new Error(errorObj?.message || 'Failed to initiate email verification.');
      } else {
        setAccountProvisioned(true);
        setDevEmailOtp(regJson.data?.devVerificationCode || null);
        await csrfFetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: email,
            password: form.password,
            clientType: 'WEB',
          }),
        });
        await refreshUser();
      }

      setEmailOtpInput('');
      setActiveVerifyModal('email');
    } catch (err: any) {
      setFieldError('emailAddress', err.message || 'Failed to send email verification code.');
    } finally {
      setVerificationBusy(false);
    }
  };

  const handleSubmitEmailOtp = async () => {
    if (!/^\d{6}$/.test(emailOtpInput.trim())) {
      setModalError('Please enter the 6-digit email verification code.');
      return;
    }
    try {
      setVerificationBusy(true);
      setModalError(null);
      const res = await csrfFetch('/api/v1/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.emailAddress.trim().toLowerCase(),
          code: emailOtpInput.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Invalid or expired email verification code.');
      }

      setEmailVerified(true);
      clearFieldError('emailAddress');
      setActiveVerifyModal(null);
      await refreshUser();
    } catch (err: any) {
      setModalError(err.message || 'Email verification failed.');
    } finally {
      setVerificationBusy(false);
    }
  };

  const ensureAuthenticatedAndSaveDraft = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    if (!phoneVerified || !emailVerified) {
      setFieldError('mobileNumber', !phoneVerified ? 'Please verify your mobile number.' : '');
      setFieldError('emailAddress', !emailVerified ? 'Please verify your email address.' : '');
      setSaving(false);
      return null;
    }

    try {
      const payload = {
        businessName: form.businessName.trim(),
        slug: form.slug.trim().toLowerCase(),
        tradeLicenseNumber: form.tradeLicenseNumber.trim() || null,
        binNumber: form.binNumber.trim() || null,
        tinNumber: form.tinNumber.trim() || null,
      };

      const response = application
        ? await csrfFetch(`/api/v1/seller/application/${application.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, version: application.version }),
          })
        : await csrfFetch('/api/v1/seller/application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error?.message || t('sellerApplication.saveFailed'));
      }

      setApplication(json.data);
      setMessage(t('sellerApplication.saved'));
      return json.data as Application;
    } catch (err: any) {
      setError(err.message || t('sellerApplication.saveFailed'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async (event?: FormEvent) => {
    return ensureAuthenticatedAndSaveDraft(event);
  };

  const submitApplication = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await ensureAuthenticatedAndSaveDraft();
    if (!saved) return;
    setSaving(true);
    try {
      const response = await csrfFetch(`/api/v1/seller/application/${saved.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: saved.version }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.error?.message || t('sellerApplication.submitFailed'));
      }

      setApplication(json.data);
      setMessage(t('sellerApplication.submitted'));
      setCurrentStep(6);
    } catch (err: any) {
      setError(err.message || t('sellerApplication.submitFailed'));
    } finally {
      setSaving(false);
    }
  };

  const isEditable = !application || application.status === 'DRAFT' || application.status === 'CHANGES_REQUESTED';

  // Filter districts based on selected division
  const selectedDivision = BANGLADESH_DIVISIONS.find((d) => d.id === form.divisionId) || BANGLADESH_DIVISIONS[0];
  const availableDistricts = BANGLADESH_DISTRICTS.filter((d) => d.divisionCode === selectedDivision.code);
  const selectedDistrict = availableDistricts.find((d) => d.id === form.districtId) || availableDistricts[0] || BANGLADESH_DISTRICTS[0];
  const availableUpazilas = BANGLADESH_UPAZILAS.filter((u) => u.districtId === selectedDistrict.id);

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!user) {
        if (!form.sellerName.trim() || form.sellerName.trim().length < 2) {
          errors.sellerName = 'Please enter your full name (at least 2 characters).';
        }
        if (!form.mobileNumber.trim()) {
          errors.mobileNumber = 'Please enter your mobile number.';
        } else if (!isValidPhone) {
          errors.mobileNumber = 'Enter a valid Bangladesh mobile number (+8801XXXXXXXXX or 01XXXXXXXXX).';
        }
        if (!form.emailAddress.trim()) {
          errors.emailAddress = 'Please enter your email address.';
        } else if (!isValidEmail) {
          errors.emailAddress = 'Please enter a valid email address.';
        }
        if (!form.password) {
          errors.password = 'Please enter a password.';
        } else if (form.password.length < 8) {
          errors.password = 'Password must be at least 8 characters long.';
        }
        if (!form.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password.';
        } else if (form.password !== form.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match.';
        }
      }

      if (!phoneVerified) {
        errors.mobileNumber = errors.mobileNumber || 'Please verify your mobile number with the OTP code.';
      }
      if (!emailVerified) {
        errors.emailAddress = errors.emailAddress || 'Please verify your email address with the OTP code.';
      }
    }

    if (step === 2) {
      if (!form.businessName || form.businessName.trim().length < 3) {
        errors.businessName = 'Business name must be at least 3 characters.';
      }
      if (!form.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
        errors.slug = 'Store handle must be lowercase alphanumeric with hyphens.';
      }
    }

    if (step === 3) {
      if (form.binNumber && !/^\d{9,13}$/.test(form.binNumber.trim())) {
        errors.binNumber = 'NBR BIN number must be between 9 and 13 numeric digits.';
      }
      if (form.tinNumber && !/^\d{10,12}$/.test(form.tinNumber.trim())) {
        errors.tinNumber = 'Tax Identification Number (TIN) must be between 10 and 12 numeric digits.';
      }
    }

    if (step === 4) {
      if (!form.streetAddress || form.streetAddress.trim().length < 5) {
        errors.streetAddress = 'Warehouse street address must be at least 5 characters.';
      }
    }

    if (step === 6) {
      if (!agreedTerms) {
        errors.agreedTerms = 'You must accept the terms and NBR compliance policy.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      if (currentStep > 1 && isEditable) {
        const saved = await ensureAuthenticatedAndSaveDraft();
        if (!saved) return;
      }
      setCurrentStep((prev) => Math.min(6, prev + 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between selection:bg-orange-500/20">
      {/* STOREFRONT HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-4">
          {/* Logo & Location */}
          <div className="flex items-center space-x-4 sm:space-x-6 shrink-0">
            <AlifLogo size="md" href="/" />

            {/* Deliver To Selector */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                className="flex items-center space-x-2 text-left hover:bg-slate-50 py-1.5 px-3 rounded-xl transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="leading-tight">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {t('nav.deliverTo') || 'Deliver to'}
                  </span>
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                    {selectedLocation}
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </span>
                </div>
              </button>

              {isLocationMenuOpen && (
                <div className="absolute left-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Select Division / Location
                  </div>
                  {['Dhaka, Bangladesh', 'Chattogram, Bangladesh', 'Sylhet, Bangladesh', 'Rajshahi, Bangladesh', 'Khulna, Bangladesh'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsLocationMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-amber-50 hover:text-[#D97706] transition-colors cursor-pointer ${
                        selectedLocation === loc ? 'bg-amber-50 text-[#F59E0B] font-bold' : 'text-slate-700'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-4">
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder') || 'Search products, brands, stores...'}
                className="w-full bg-[#F8FAFC] border border-slate-200/90 rounded-full py-2.5 pl-11 pr-12 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-amber-100 shadow-xs transition-all"
              />
              <button
                type="button"
                aria-label="Paste"
                onClick={() => {
                  navigator.clipboard
                    ?.readText?.()
                    .then((text) => setSearchQuery(text))
                    .catch(() => {});
                }}
                className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Account Button */}
            <button
              type="button"
              onClick={() => {
                if (user) {
                  openAccountModal();
                } else {
                  openAuthModal('login');
                }
              }}
              className="hidden md:flex flex-col items-center group text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
              title={user ? `Account: ${user.name || 'Account'}` : 'Sign In / Register'}
            >
              <div className="relative">
                <User className="w-5 h-5 text-slate-700 group-hover:text-[#F59E0B] transition-colors" />
                {user && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 mt-1 truncate max-w-[65px]">
                {user ? user.name?.split(' ')[0] || 'Account' : 'Account'}
              </span>
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setMessage('Cart (0 items)')}
              className="hidden md:flex flex-col items-center group text-slate-700 hover:text-slate-950 transition-colors relative cursor-pointer"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-slate-700 group-hover:text-[#F59E0B] transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#F59E0B] text-black font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 mt-1">Cart</span>
            </button>

            {/* Language Switcher Dropdown */}
            <div className="hidden md:block w-px h-6 bg-slate-200 ml-1 mr-0.5" />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Seller Store Onboarding
            </h1>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Register your business, provide NBR tax details, and complete merchant verification.
            </p>
          </div>

          {application && (
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  application.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : application.status === 'CHANGES_REQUESTED' || application.status === 'REJECTED'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {application.status}
              </span>
            </div>
          )}
        </div>

        {/* Hero Banner & Value Proposition Cards */}
        <MerchantHeroIllustration />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">0% Listing Fee</div>
              <div className="text-[10px] text-slate-500 font-medium">No upfront charges</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">64 Districts</div>
              <div className="text-[10px] text-slate-500 font-medium">Pathao &amp; RedX Pickup</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">Weekly Payouts</div>
              <div className="text-[10px] text-slate-500 font-medium">Direct Bank / bKash</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">NBR VAT Compliant</div>
              <div className="text-[10px] text-slate-500 font-medium">13-digit BIN verified</div>
            </div>
          </div>
        </div>

        {/* Application Status Warning if submitted or changes requested */}
        {application?.reviewReason && (
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-1 animate-in fade-in">
            <div className="font-bold flex items-center space-x-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Administrator Review Feedback</span>
            </div>
            <p className="text-slate-700 leading-relaxed pl-5 font-medium">
              {application.reviewReason}
            </p>
          </div>
        )}

        {/* Feedback Messages */}
        {message && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Two-Column Responsive Layout: Left Vertical Stepper + Right Step Form */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT: Compact Vertical Stepper */}
          <aside className="w-full lg:w-64 xl:w-72 shrink-0 bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs lg:sticky lg:top-24">
            <div className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
              Onboarding Steps (6)
            </div>

            <nav aria-label="Registration Steps" className="space-y-1">
              {STEPS.map((step, idx) => {
                const isCompleted = step.id < currentStep || (step.id === 6 && application?.status === 'SUBMITTED');
                const isCurrent = step.id === currentStep;

                return (
                  <div key={step.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (step.id < currentStep || isEditable) {
                          if (validateStep(currentStep)) setCurrentStep(step.id);
                        }
                      }}
                      className={`w-full flex items-center space-x-3 p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-orange-50/80 border border-orange-200 text-slate-900 shadow-xs'
                          : isCompleted
                          ? 'hover:bg-slate-50 text-slate-700'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-[#FF6A00] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-bold truncate leading-tight ${
                            isCurrent ? 'text-slate-950 font-black' : isCompleted ? 'text-slate-800' : 'text-slate-500'
                          }`}
                        >
                          {step.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                          {step.desc}
                        </div>
                      </div>

                      {isCurrent && <ChevronRight className="w-3.5 h-3.5 text-[#FF6A00] shrink-0" />}
                    </button>

                    {idx < STEPS.length - 1 && (
                      <div className="ml-5 w-0.5 h-2 bg-slate-200 my-0.5" />
                    )}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* RIGHT: Step Card Container */}
          <div className="flex-1 w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-9 relative">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
                <Loader2 className="w-8 h-8 text-[#FF6A00] animate-spin" />
                <span>Loading onboarding profile details...</span>
              </div>
            ) : (
              <>
                {/* STEP 1: SELLER ACCOUNT CREDENTIALS & VERIFICATION */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="border-b border-slate-100 pb-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-5 h-5 text-[#FF6A00]" />
                        <h2 className="text-lg font-black text-slate-900">Step 1: Seller Account Credentials</h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Enter your personal details and verify your mobile number and email address to begin onboarding.
                      </p>
                    </div>

                    {/* Account Status Badge if authenticated */}
                    {user && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                        <span className="font-semibold">Logged in as {user.name || user.email}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Verified Session</span>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Seller Name */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Seller Name *
                        </label>
                        <input
                          type="text"
                          disabled={Boolean(user) || !isEditable || saving}
                          value={form.sellerName}
                          onChange={(e) => setField('sellerName', e.target.value)}
                          placeholder="Enter your full name"
                          required
                          className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none transition-all disabled:bg-slate-100 ${
                            fieldErrors.sellerName
                              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
                              : 'border-slate-200 focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20'
                          }`}
                        />
                        {fieldErrors.sellerName && (
                          <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1 animate-in fade-in">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.sellerName}</span>
                          </p>
                        )}
                      </div>

                      {/* Mobile Number with Inline Verify Button */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mobile Number *
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="tel"
                            disabled={phoneVerified || Boolean(user) || !isEditable || saving}
                            value={form.mobileNumber}
                            onChange={(e) => setField('mobileNumber', e.target.value)}
                            placeholder="Enter your mobile number"
                            required
                            className={`w-full px-3.5 py-2.5 pr-24 rounded-xl border bg-white text-xs font-mono text-slate-900 placeholder-slate-400 outline-none transition-all disabled:bg-slate-100 ${
                              fieldErrors.mobileNumber
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
                                : 'border-slate-200 focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20'
                            }`}
                          />
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                            {phoneVerified ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            ) : isValidPhone ? (
                              <button
                                type="button"
                                onClick={() => void handleStartPhoneVerification()}
                                disabled={verificationBusy}
                                className="px-3 py-1.5 rounded-lg bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {verificationBusy && activeVerifyModal === 'phone' ? 'Sending...' : 'Verify'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {fieldErrors.mobileNumber && (
                          <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1 animate-in fade-in">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.mobileNumber}</span>
                          </p>
                        )}
                      </div>

                      {/* Email Address with Inline Verify Button */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="email"
                            disabled={emailVerified || Boolean(user) || !isEditable || saving}
                            value={form.emailAddress}
                            onChange={(e) => setField('emailAddress', e.target.value)}
                            placeholder="Enter your email address"
                            required
                            className={`w-full px-3.5 py-2.5 pr-24 rounded-xl border bg-white text-xs font-mono text-slate-900 placeholder-slate-400 outline-none transition-all disabled:bg-slate-100 ${
                              fieldErrors.emailAddress
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
                                : 'border-slate-200 focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20'
                            }`}
                          />
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                            {emailVerified ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verified</span>
                              </span>
                            ) : isValidEmail ? (
                              <button
                                type="button"
                                onClick={() => void handleStartEmailVerification()}
                                disabled={verificationBusy}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {verificationBusy && activeVerifyModal === 'email' ? 'Sending...' : 'Verify'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {fieldErrors.emailAddress && (
                          <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1 animate-in fade-in">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.emailAddress}</span>
                          </p>
                        )}
                      </div>

                      {/* Password & Confirm Password for unauthenticated */}
                      {!user && (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Password *
                            </label>
                            <input
                              type="password"
                              disabled={!isEditable || saving}
                              value={form.password}
                              onChange={(e) => setField('password', e.target.value)}
                              placeholder="Enter your password"
                              required
                              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs font-mono text-slate-900 placeholder-slate-400 outline-none transition-all disabled:bg-slate-100 ${
                                fieldErrors.password
                                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
                                  : 'border-slate-200 focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20'
                              }`}
                            />
                            {fieldErrors.password && (
                              <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1 animate-in fade-in">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{fieldErrors.password}</span>
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Confirm Password *
                            </label>
                            <input
                              type="password"
                              disabled={!isEditable || saving}
                              value={form.confirmPassword}
                              onChange={(e) => setField('confirmPassword', e.target.value)}
                              placeholder="Enter confirm password"
                              required
                              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs font-mono text-slate-900 placeholder-slate-400 outline-none transition-all disabled:bg-slate-100 ${
                                fieldErrors.confirmPassword
                                  ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 bg-rose-50/20'
                                  : 'border-slate-200 focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20'
                              }`}
                            />
                            {fieldErrors.confirmPassword && (
                              <p className="mt-1.5 text-xs text-rose-600 font-medium flex items-center gap-1 animate-in fade-in">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{fieldErrors.confirmPassword}</span>
                              </p>
                            )}
                          </div>

                          {/* Live Password Format Guidance Checklist */}
                          {form.password.length > 0 && (
                            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-in fade-in">
                              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Password Requirements &amp; Format
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-medium text-slate-600">
                                <div className={`flex items-center space-x-1.5 ${form.password.length >= 8 ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                  <Check className={`w-3.5 h-3.5 ${form.password.length >= 8 ? 'text-emerald-600' : 'text-slate-300'}`} />
                                  <span>Minimum 8 characters</span>
                                </div>
                                <div className={`flex items-center space-x-1.5 ${/[A-Z]/.test(form.password) ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                  <Check className={`w-3.5 h-3.5 ${/[A-Z]/.test(form.password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                                  <span>Uppercase letter (A-Z)</span>
                                </div>
                                <div className={`flex items-center space-x-1.5 ${/[a-z]/.test(form.password) ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                  <Check className={`w-3.5 h-3.5 ${/[a-z]/.test(form.password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                                  <span>Lowercase letter (a-z)</span>
                                </div>
                                <div className={`flex items-center space-x-1.5 ${/\d/.test(form.password) ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                  <Check className={`w-3.5 h-3.5 ${/\d/.test(form.password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                                  <span>Numeric digit (0-9)</span>
                                </div>
                                <div className={`flex items-center space-x-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password) ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                                  <Check className={`w-3.5 h-3.5 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password) ? 'text-emerald-600' : 'text-slate-300'}`} />
                                  <span>Special symbol (!@#$%...)</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-xs flex items-start space-x-2.5">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Verify your mobile number and email address using the inline <strong>Verify</strong> buttons. You can verify either one first. Once verified, click Next Step to proceed to Store Identity.
                      </p>
                    </div>
                  </div>
                )}

              {/* STEP 2: STORE IDENTITY */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <Store className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 2: Store Identity &amp; Branding</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Choose your business entity, registered store name, and public AlifWorld handle.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Merchant Business Entity Type *</label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { type: 'PROPRIETORSHIP', title: 'Proprietorship', desc: 'Individual sole trader with Trade License', icon: User },
                        { type: 'CORPORATE', title: 'Private Limited / Ltd', desc: 'Corporate business with BIN & TIN', icon: Building2 },
                        { type: 'BRAND_DISTRIBUTOR', title: 'Brand / Distributor', desc: 'Official brand flagship store', icon: Award },
                      ].map((item) => {
                        const ItemIcon = item.icon;
                        const isSelected = form.merchantType === item.type;
                        return (
                          <button key={item.type} type="button" disabled={!isEditable || saving} onClick={() => setForm((prev) => ({ ...prev, merchantType: item.type as FormState['merchantType'] }))} className={`p-3.5 rounded-2xl border text-left transition-all ${isSelected ? 'border-[#FF6A00] bg-orange-50/60 ring-2 ring-orange-500/20' : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'}`}>
                            <div className="flex items-center justify-between mb-1.5"><ItemIcon className={`w-5 h-5 ${isSelected ? 'text-[#FF6A00]' : 'text-slate-400'}`} />{isSelected && <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />}</div>
                            <div className="text-xs font-bold text-slate-900">{item.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="sm:col-span-2 block text-xs font-bold text-slate-700">Registered Business / Store Name *
                      <input type="text" disabled={!isEditable || saving} value={form.businessName} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Biswas Stores" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#FF6A00]" />
                    </label>
                    <label className="sm:col-span-2 block text-xs font-bold text-slate-700">Store Handle / URL Slug *
                      <div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 focus-within:border-[#FF6A00]">
                        <span className="flex items-center border-r border-slate-200 bg-slate-100 px-3.5 text-xs font-mono text-slate-500">{domainDisplay}/stores/</span>
                        <input type="text" disabled={!isEditable || saving} value={form.slug} onChange={(e) => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} placeholder="biswas-stores" className="w-full bg-transparent px-3.5 py-2.5 text-sm font-mono outline-none" />
                      </div>
                      <span className="mt-1.5 block text-[11px] font-normal text-slate-500">Your unique storefront handle. Customers can visit your storefront directly via this link.</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 3: NBR TAX & COMPLIANCE */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 3: NBR Tax &amp; Business Registration</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Provide statutory Bangladesh Trade License, BIN, and TIN numbers.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs space-y-1.5">
                    <div className="font-bold flex items-center space-x-1.5 text-amber-900">
                      <Info className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Bangladesh NBR Tax Compliance Guidance</span>
                    </div>
                    <p className="leading-relaxed text-slate-700 font-medium">
                      Under National Board of Revenue regulations, multi-vendor marketplace merchants must hold a valid Trade License and Business Identification Number (BIN) for VAT collection.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Trade License Number
                      </label>
                      <input
                        type="text"
                        disabled={!isEditable || saving}
                        value={form.tradeLicenseNumber}
                        onChange={(e) => setField('tradeLicenseNumber', e.target.value)}
                        placeholder="e.g. TRAD/DNCC/012345/2026"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        NBR BIN (Business Identification Number)
                      </label>
                      <input
                        type="text"
                        disabled={!isEditable || saving}
                        value={form.binNumber}
                        onChange={(e) => setField('binNumber', e.target.value)}
                        placeholder="13-digit BIN e.g. 0001234560101"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:bg-slate-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        e-TIN (Taxpayer Identification Number)
                      </label>
                      <input
                        type="text"
                        disabled={!isEditable || saving}
                        value={form.tinNumber}
                        onChange={(e) => setField('tinNumber', e.target.value)}
                        placeholder="12-digit e-TIN e.g. 123456789012"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: LOGISTICS LOCATION */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 4: Warehouse &amp; Logistics Address</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure pickup location for courier logistics (Pathao, RedX, Steadfast).
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Division *
                      </label>
                      <select
                        disabled={!isEditable || saving}
                        value={form.divisionId}
                        onChange={(e) => setField('divisionId', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#FF6A00]"
                      >
                        {BANGLADESH_DIVISIONS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {locale === 'bn' ? d.nameBn : d.nameEn} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        District *
                      </label>
                      <select
                        disabled={!isEditable || saving}
                        value={form.districtId}
                        onChange={(e) => setField('districtId', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#FF6A00]"
                      >
                        {availableDistricts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {locale === 'bn' ? d.nameBn : d.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Upazila / Thana *
                      </label>
                      <select
                        disabled={!isEditable || saving}
                        value={form.upazilaId}
                        onChange={(e) => setField('upazilaId', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#FF6A00]"
                      >
                        {availableUpazilas.length > 0 ? (
                          availableUpazilas.map((u) => (
                            <option key={u.id} value={u.id}>
                              {locale === 'bn' ? u.nameBn : u.nameEn}
                            </option>
                          ))
                        ) : (
                          <option value="central">Central Commercial Thana</option>
                        )}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Warehouse Street Address &amp; Building Details *
                      </label>
                      <textarea
                        rows={3}
                        disabled={!isEditable || saving}
                        value={form.streetAddress}
                        onChange={(e) => setField('streetAddress', e.target.value)}
                        placeholder="e.g. House 42, Road 11, Block D, Dhanmondi, Dhaka 1205"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: KYC CHECKLIST */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 5: Merchant KYC Verification Dossier</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload mandatory legal identity documents in the KYC console.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { type: 'TRADE_LICENSE', title: 'Trade License Copy', desc: 'Valid municipal trade license' },
                      { type: 'NID_FRONT', title: 'National ID (NID) Front', desc: 'Smart Card or original NID' },
                      { type: 'NID_BACK', title: 'National ID (NID) Back', desc: 'Back with address' },
                      { type: 'BIN_CERTIFICATE', title: 'NBR BIN Certificate', desc: 'VAT Registration certificate' },
                      { type: 'BANK_CHEQUE_LEAF', title: 'Bank Cheque Leaf', desc: 'Cancelled cheque for payouts' },
                      { type: 'TIN_CERTIFICATE', title: 'e-TIN Certificate', desc: 'Tax identification dossier' },
                    ].map((doc) => (
                      <div
                        key={doc.type}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{doc.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{doc.desc}</p>
                        </div>
                        <Link
                          href="/seller/kyc"
                          target="_blank"
                          className="px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-[#FF6A00] font-bold text-[11px] hover:bg-orange-100 transition-colors inline-flex items-center space-x-1"
                        >
                          <span>Manage File</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-950 text-xs flex items-start space-x-2.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Secure Object Storage Guarantee</span>
                      <p className="mt-0.5 text-slate-700 leading-relaxed font-medium">
                        All uploaded KYC dossiers are encrypted in S3-compatible private object storage and accessible only by authorized compliance administrators.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: REVIEW & SUBMIT */}
              {currentStep === 6 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 6: Review &amp; Submit Application</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Verify your business information before submitting to the platform compliance team.
                    </p>
                  </div>

                  {/* Summary Cards Grid (4 Cards) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Card 1: Store Identity */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <Store className="w-4 h-4 text-[#FF6A00]" />
                          <span>Store Identity</span>
                        </span>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="text-xs font-bold text-[#FF6A00] hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Business Name: </span>
                          <span className="font-bold text-slate-900">{form.businessName || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Merchant Type: </span>
                          <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                            {form.merchantType || 'PROPRIETORSHIP'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Handle / Slug: </span>
                          <span className="font-mono font-semibold text-slate-900">{domainDisplay}/stores/{form.slug || 'slug'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: NBR Tax Details */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <FileText className="w-4 h-4 text-[#FF6A00]" />
                          <span>NBR Tax Details</span>
                        </span>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            className="text-xs font-bold text-[#FF6A00] hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                      <div className="text-xs space-y-1 font-mono">
                        <div>
                          <span className="text-slate-500 font-sans">Trade License: </span>
                          <span className="font-semibold text-slate-900">{form.tradeLicenseNumber || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans">BIN Number: </span>
                          <span className="font-semibold text-slate-900">{form.binNumber || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-sans">e-TIN Number: </span>
                          <span className="font-semibold text-slate-900">{form.tinNumber || 'None'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Logistics Hub */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <MapPin className="w-4 h-4 text-[#FF6A00]" />
                          <span>Logistics &amp; Pickup Hub</span>
                        </span>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() => setCurrentStep(4)}
                            className="text-xs font-bold text-[#FF6A00] hover:underline inline-flex items-center space-x-0.5 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        <div>
                          <span className="text-slate-500">Division / District: </span>
                          <span className="font-bold text-slate-900">{selectedDivision.nameEn} / {selectedDistrict.nameEn}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Upazila / Thana: </span>
                          <span className="font-semibold text-slate-900">{selectedDistrict.id || 'Central Thana'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Couriers: </span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                            Pathao • RedX • Steadfast
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: KYC Verification Dossier */}
                    <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#FF6A00]" />
                          <span>KYC Document Dossier</span>
                        </span>
                        <Link
                          href="/seller/kyc"
                          target="_blank"
                          className="text-xs font-bold text-[#FF6A00] hover:underline inline-flex items-center space-x-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Console</span>
                        </Link>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>6 Verification Documents Ready</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Encrypted in S3 object storage for compliance review.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  {isEditable && (
                    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedTerms}
                          onChange={(e) => setAgreedTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded-md border-slate-300 text-[#FF6A00] focus:ring-orange-500"
                        />
                        <span className="text-xs text-slate-600 leading-relaxed font-medium">
                          I certify that the information provided is accurate and compliant with National Board of Revenue (NBR) regulations and AlifWorld Merchant Network Policy.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Stepper Navigation Buttons */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous Step</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {isEditable && currentStep >= 2 && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={(e) => void saveDraft(e)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50 inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4 text-slate-500" />
                      <span>Save Draft</span>
                    </button>
                  )}

                  {currentStep < 6 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-5 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    isEditable && (
                      <button
                        type="button"
                        disabled={saving || !agreedTerms}
                        onClick={(e) => void submitApplication(e)}
                        className="px-6 py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-md shadow-orange-500/25 transition-all disabled:opacity-50 inline-flex items-center space-x-2 cursor-pointer"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting Application...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Submit Application</span>
                          </>
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Phone OTP Verification Modal */}
      {activeVerifyModal === 'phone' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF6A00] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Verify Mobile Number</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVerifyModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter the 6-digit numeric verification code sent to <strong className="text-slate-800">{form.mobileNumber}</strong>.
            </p>

            {devPhoneOtp && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono">
                Development OTP: <strong>{devPhoneOtp}</strong>
              </div>
            )}

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={phoneOtpInput}
                onChange={(e) => setPhoneOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full text-center font-mono text-2xl tracking-[0.35em] font-bold py-3 px-4 rounded-xl border border-slate-300 focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => void handleSubmitPhoneOtp()}
                disabled={verificationBusy || phoneOtpInput.length !== 6}
                className="w-full py-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {verificationBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Submit OTP</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => void handleStartPhoneVerification()}
                  disabled={verificationBusy}
                  className="text-xs font-semibold text-[#FF6A00] hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVerifyModal(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email OTP Verification Modal */}
      {activeVerifyModal === 'email' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">Verify Email Address</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveVerifyModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter the 6-digit verification code sent to <strong className="text-slate-800">{form.emailAddress}</strong>.
            </p>

            {devEmailOtp && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono">
                Development OTP: <strong>{devEmailOtp}</strong>
              </div>
            )}

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={emailOtpInput}
                onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full text-center font-mono text-2xl tracking-[0.35em] font-bold py-3 px-4 rounded-xl border border-slate-300 focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => void handleSubmitEmailOtp()}
                disabled={verificationBusy || emailOtpInput.length !== 6}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
              >
                {verificationBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Submit OTP</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => void handleStartEmailVerification()}
                  disabled={verificationBusy}
                  className="text-xs font-semibold text-slate-700 hover:text-black hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVerifyModal(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* LUXURY DARK STOREFRONT FOOTER */}
      <footer className="bg-[#161614] text-white pt-16 pb-24 md:pb-12 border-t border-neutral-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12 pb-12 border-b border-neutral-800">
            {/* Brand & Slogan */}
            <div className="space-y-4">
              <AlifLogo size="md" href="/" inverted />
              <p className="text-xs text-[#9CA3AF] leading-relaxed max-w-sm">
                Your neighborhood&apos;s fastest delivery service. We bring everything you need, right to your doorstep in minutes.
              </p>

              <div className="pt-2 space-y-2 text-xs text-[#D1D5DB]">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold">+880 1997-469249</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold">info@mail.com</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">
                QUICK LINKS
              </h4>
              <ul className="space-y-2.5 text-xs text-[#9CA3AF]">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors cursor-pointer">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/faqs" className="hover:text-white transition-colors cursor-pointer">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/stores" className="hover:text-white transition-colors cursor-pointer">
                    Stores
                  </Link>
                </li>
                <li className="pt-2">
                  <Link href="/seller/apply" className="text-amber-500 font-bold hover:underline block">
                    Become a Seller
                  </Link>
                </li>
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">
                POLICIES
              </h4>
              <ul className="space-y-2.5 text-xs text-[#9CA3AF]">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors cursor-pointer">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors cursor-pointer">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/shipping-policy" className="hover:text-white transition-colors cursor-pointer">
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link href="/return-policy" className="hover:text-white transition-colors cursor-pointer">
                    Return &amp; Refund Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Follow Us & Trust Badges */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-4">
                FOLLOW US
              </h4>
              <div className="flex items-center space-x-3 mb-6">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <FacebookIcon className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X"
                  className="w-8 h-8 rounded-full bg-[#262624] text-white flex items-center justify-center hover:bg-[#F59E0B] hover:text-black transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5 text-white" />
                </a>
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 text-xs text-[#D1D5DB] font-medium">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Quality Assured</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>100% Secure Checkout</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Trusted Nationwide Delivery</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9CA3AF] gap-4">
            <div>
              © 2026 AlifWorld. All rights reserved.
            </div>
            <div className="px-3 py-1 rounded-full bg-[#262624] text-slate-400 border border-neutral-800 font-mono text-[11px]">
              V 3.2.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
