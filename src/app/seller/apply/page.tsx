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
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useI18n } from '@/i18n/context';
import { csrfFetch } from '@/shared/security/csrf-client';
import {
  BANGLADESH_DIVISIONS,
  BANGLADESH_DISTRICTS,
  BANGLADESH_UPAZILAS,
} from '@/shared/geo/bangladesh-geo';

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
  { id: 1, title: 'Store Identity', icon: Store, desc: 'Basic info & store handle' },
  { id: 2, title: 'NBR Compliance', icon: FileText, desc: 'Trade license, BIN & TIN' },
  { id: 3, title: 'Logistics Location', icon: MapPin, desc: 'Warehouse & pickup address' },
  { id: 4, title: 'KYC Checklist', icon: ShieldCheck, desc: 'Verification documents' },
  { id: 5, title: 'Review & Submit', icon: CheckCircle2, desc: 'Final application check' },
];

/* -------------------------------------------------------------------------- */
/* Custom Graphic SVG Illustrations & Banner Components                      */
/* -------------------------------------------------------------------------- */
function MerchantHeroIllustration() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950 p-6 sm:p-8 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 -bottom-10 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center space-x-2 text-[11px] font-mono font-bold uppercase tracking-widest text-[#FF6A00] bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            <Zap className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>AlifWorld Merchant Network • 64-District Fulfillment</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Grow Your Business Across Bangladesh
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            Join thousands of verified sellers on AlifWorld. Enjoy 0% listing fees, guaranteed weekly BDT payouts, Pathao &amp; RedX express pickup, and NBR VAT compliance.
          </p>
        </div>

        {/* Custom SVG Graphic Artwork */}
        <div className="w-full max-w-[220px] shrink-0">
          <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-2xl">
            <rect width="200" height="140" rx="16" fill="#1E293B" fillOpacity="0.8" />
            <path d="M20 100 L60 70 L100 85 L140 45 L180 30" stroke="#FF6A00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="180" cy="30" r="6" fill="#FF6A00" />
            <circle cx="140" cy="45" r="4" fill="#F59E0B" />
            <circle cx="100" cy="85" r="4" fill="#F59E0B" />
            <circle cx="60" cy="70" r="4" fill="#F59E0B" />
            <rect x="25" y="110" width="30" height="15" rx="3" fill="#334155" />
            <rect x="65" y="110" width="30" height="15" rx="3" fill="#334155" />
            <rect x="105" y="110" width="30" height="15" rx="3" fill="#FF6A00" />
            <rect x="145" y="110" width="30" height="15" rx="3" fill="#10B981" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function SellerApplicationPage() {
  const { t, locale } = useI18n();

  const [application, setApplication] = useState<Application | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [form, setForm] = useState<FormState>({
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

  const loadApplication = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/seller/application');
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error?.message || t('sellerApplication.loadFailed'));
      if (json.data) {
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
    } catch (err: any) {
      setError(err.message || t('sellerApplication.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
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

  const saveDraft = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
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

  const submitApplication = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await saveDraft();
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
      setCurrentStep(5);
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
    setError(null);
    if (step === 1) {
      if (!form.businessName || form.businessName.trim().length < 3) {
        setError('Business name must be at least 3 characters.');
        return false;
      }
      if (!form.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
        setError('Store handle must be lowercase alphanumeric with hyphens.');
        return false;
      }
    }
    if (step === 2) {
      if (form.binNumber && !/^\d{9,13}$/.test(form.binNumber.trim())) {
        setError('NBR BIN number must be between 9 and 13 numeric digits.');
        return false;
      }
      if (form.tinNumber && !/^\d{10,12}$/.test(form.tinNumber.trim())) {
        setError('Tax Identification Number (TIN) must be between 10 and 12 numeric digits.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (isEditable) void saveDraft();
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between selection:bg-orange-500/20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlifLogo size="sm" href="/" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs uppercase tracking-widest font-mono font-bold text-[#FF6A00]">
              Merchant Onboarding
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

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[11px] uppercase tracking-widest font-mono font-bold text-[#FF6A00] bg-orange-50 px-3 py-1 rounded-full border border-orange-200 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>AlifWorld Merchant Registration</span>
            </div>
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

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 5-Step Horizontal Progress Stepper */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[640px]">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = step.id < currentStep || (step.id === 5 && application?.status === 'SUBMITTED');
              const isCurrent = step.id === currentStep;

              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (step.id < currentStep || isEditable) {
                        if (validateStep(currentStep)) setCurrentStep(step.id);
                      }
                    }}
                    className={`flex items-center space-x-3 text-left transition-all ${
                      isCurrent
                        ? 'text-slate-900 font-bold'
                        : isCompleted
                        ? 'text-emerald-700 hover:text-emerald-800 font-semibold'
                        : 'text-slate-400 font-medium'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono font-bold text-xs transition-all shadow-xs ${
                        isCompleted
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : isCurrent
                          ? 'bg-[#FF6A00] text-white shadow-orange-500/25 ring-4 ring-orange-500/15'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : step.id}
                    </div>
                    <div>
                      <div className="text-xs font-black tracking-tight leading-tight flex items-center space-x-1">
                        <span>{step.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal hidden md:block">
                        {step.desc}
                      </div>
                    </div>
                  </button>

                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-3 sm:mx-4 h-0.5 bg-slate-200 min-w-[20px] relative">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: isCompleted ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Card Container */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-9 relative">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
              <Loader2 className="w-8 h-8 text-[#FF6A00] animate-spin" />
              <span>Loading onboarding profile details...</span>
            </div>
          ) : (
            <>
              {/* STEP 1: STORE IDENTITY */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <Store className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 1: Store Identity &amp; Branding</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Configure your store name and public URL handle on AlifWorld.
                    </p>
                  </div>

                  {/* Merchant Entity Type Tiles */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Merchant Business Entity Type *
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          type: 'PROPRIETORSHIP',
                          title: 'Proprietorship',
                          desc: 'Individual sole trader with Trade License',
                          icon: User,
                        },
                        {
                          type: 'CORPORATE',
                          title: 'Private Limited / Ltd',
                          desc: 'Corporate business with BIN & TIN',
                          icon: Building2,
                        },
                        {
                          type: 'BRAND_DISTRIBUTOR',
                          title: 'Brand / Distributor',
                          desc: 'Official brand flagship store',
                          icon: Award,
                        },
                      ].map((item) => {
                        const ItemIcon = item.icon;
                        const isSelected = (form.merchantType || 'PROPRIETORSHIP') === item.type;

                        return (
                          <button
                            key={item.type}
                            type="button"
                            disabled={!isEditable || saving}
                            onClick={() => setForm((prev) => ({ ...prev, merchantType: item.type as any }))}
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#FF6A00] bg-orange-50/60 ring-2 ring-orange-500/20 shadow-xs'
                                : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <ItemIcon
                                className={`w-5 h-5 ${isSelected ? 'text-[#FF6A00]' : 'text-slate-400'}`}
                              />
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-[#FF6A00]" />}
                            </div>
                            <div className="text-xs font-bold text-slate-900">{item.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Registered Business / Store Name *
                      </label>
                      <input
                        type="text"
                        disabled={!isEditable || saving}
                        value={form.businessName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g. Dhaka Tech Mart or Walton Official Store"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all disabled:bg-slate-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Store Handle / URL Slug *
                      </label>
                      <div className="flex rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden text-xs focus-within:border-[#FF6A00] focus-within:ring-2 focus-within:ring-orange-500/20">
                        <span className="px-3.5 py-2.5 bg-slate-100 text-slate-500 font-mono text-xs border-r border-slate-200 select-none flex items-center">
                          alifworld.com/stores/
                        </span>
                        <input
                          type="text"
                          disabled={!isEditable || saving}
                          value={form.slug}
                          onChange={(e) => setField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                          placeholder="dhaka-tech-mart"
                          required
                          className="w-full px-3.5 py-2.5 bg-transparent font-mono text-slate-900 text-sm outline-none disabled:bg-slate-100"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        Your unique storefront handle. Customers can visit your storefront directly via this link.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: NBR TAX & COMPLIANCE */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 2: NBR Tax &amp; Business Registration</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Provide statutory Bangladesh Trade License, BIN, and TIN numbers.
                    </p>
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

              {/* STEP 3: LOGISTICS LOCATION */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 3: Warehouse &amp; Logistics Address</h2>
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

              {/* STEP 4: KYC CHECKLIST */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 4: Merchant KYC Verification Dossier</h2>
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

              {/* STEP 5: REVIEW & SUBMIT */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 pb-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-[#FF6A00]" />
                      <h2 className="text-lg font-black text-slate-900">Step 5: Review &amp; Submit Application</h2>
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
                            onClick={() => setCurrentStep(1)}
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
                          <span className="font-mono font-semibold text-slate-900">alifworld.com/stores/{form.slug || 'slug'}</span>
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
                            onClick={() => setCurrentStep(2)}
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
                            onClick={() => setCurrentStep(3)}
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
                  {isEditable && (
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

                  {currentStep < 5 ? (
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-400">
        © 2026 AlifWorld Merchant Onboarding. All submitted dossiers are protected under privacy and security policy.
      </footer>
    </div>
  );
}
