'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Store,
  ArrowRight,
  ShieldCheck,
  Award,
  Truck,
  CreditCard,
  FileText,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useI18n } from '@/i18n/context';

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
  submittedAt: string | null;
};

const STEP_ITEMS = [
  { id: 1, title: 'Seller Account', desc: 'Completed' },
  { id: 2, title: 'Store Identity', desc: 'Completed' },
  { id: 3, title: 'Document Verification', desc: 'Completed' },
  { id: 4, title: 'Logistics Location', desc: 'Completed' },
  { id: 5, title: 'KYC Checklist', desc: 'Completed' },
  { id: 6, title: 'Review & Submit', desc: 'Under Review' },
];

export default function SellerApplicationStatusPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch('/api/v1/seller/application');
      if (res.status === 401) {
        router.replace('/seller/login');
        return;
      }
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setApplication(json.data);
        if (json.data.status === 'APPROVED') {
          // If approved, redirect to seller portal dashboard
          router.replace('/seller/products');
        }
      } else {
        setApplication(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh application status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchStatus();

    // Auto-poll status every 30 seconds
    const interval = setInterval(() => {
      void fetchStatus(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3 text-slate-600 text-xs">
        <Loader2 className="w-8 h-8 text-[#FF6A00] animate-spin" />
        <span className="font-bold uppercase tracking-wider">Checking Application Status...</span>
      </div>
    );
  }

  const isApproved = application?.status === 'APPROVED';
  const isRejected = application?.status === 'REJECTED';
  const isChangesRequested = application?.status === 'CHANGES_REQUESTED';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between selection:bg-orange-500/20 antialiased">
      {/* STOREFRONT & MERCHANT HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <AlifLogo size="md" href="/" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider bg-orange-50 text-[#FF6A00] px-3 py-1 rounded-full border border-orange-200 hidden sm:inline-block">
              Merchant Application Status
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => void fetchStatus(true)}
              disabled={refreshing}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Check Status'}</span>
            </button>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN APPLICATION STATUS CONTENT */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 w-full flex-1">
        {/* HERO BANNER CARD */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-6 sm:p-10 text-white shadow-2xl border border-slate-800">
          <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 -bottom-10 h-48 w-48 rounded-full bg-amber-500/10 blur-2xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Banner Left Copy */}
            <div className="space-y-4 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center space-x-2 text-[11px] font-mono font-bold uppercase tracking-widest text-[#FF6A00] bg-orange-500/15 px-3.5 py-1 rounded-full border border-orange-500/30">
                <Clock className="w-3.5 h-3.5 text-[#FF6A00]" />
                <span>Verification In Progress • Status: {application?.status || 'SUBMITTED'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                {isApproved
                  ? 'Your Seller Account is Approved!'
                  : isChangesRequested
                  ? 'Action Required: Application Feedback'
                  : isRejected
                  ? 'Application Status: Not Approved'
                  : 'Your Seller Application is Under Review'}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {isApproved
                  ? 'Congratulations! Your merchant store has been verified by our compliance team. You can now access your Seller Dashboard.'
                  : isChangesRequested
                  ? 'Our compliance team requested updates before approving your seller account.'
                  : isRejected
                  ? 'Unfortunately, your seller application could not be verified at this time.'
                  : "We've received your application and our compliance team is verifying your information. This usually takes a short time."}
              </p>

              {isApproved && (
                <div className="pt-2">
                  <Link
                    href="/seller/products"
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-[#FF6A00] hover:bg-[#E55F00] text-white font-black text-xs shadow-lg shadow-orange-500/30 transition-all"
                  >
                    <span>Access Seller Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {isChangesRequested && (
                <div className="pt-2">
                  <Link
                    href="/seller/apply"
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition-all"
                  >
                    <span>Update &amp; Resubmit Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Banner Right 3D Illustration Graphic Card */}
            <div className="w-full max-w-sm shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group hover:scale-[1.02] transition-transform duration-300">
              <img
                src="/seller-hero-banner.jpg"
                alt="Seller Application Submitted Illustration"
                className="w-full h-auto object-cover rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* 4 VALUE FEATURE BADGES GRID */}
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

        {/* HORIZONTAL ONBOARDING STEPPER PROGRESS BAR */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
            Onboarding Progress Pipeline
          </div>

          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Connecting Track Line */}
            <div className="hidden md:block absolute left-8 right-8 top-4 h-1 bg-emerald-500 -z-0" />

            {STEP_ITEMS.map((step, idx) => {
              const isCurrent = step.id === 6;

              return (
                <div
                  key={step.id}
                  className="relative z-10 flex md:flex-col items-center md:items-center space-x-3 md:space-x-0 text-left md:text-center shrink-0"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                      isCurrent
                        ? 'bg-[#FF6A00] text-white ring-4 ring-orange-500/20'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {isCurrent ? (
                      <span className="font-mono text-sm leading-none pb-1">...</span>
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                  </div>

                  <div className="mt-1">
                    <div className={`text-xs font-bold ${isCurrent ? 'text-[#FF6A00]' : 'text-slate-900'}`}>
                      {step.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {isCurrent ? 'Under Review' : 'Completed'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* UNDER REVIEW OR FEEDBACK ALERT BOX */}
        {application?.reviewReason ? (
          <div className="p-5 rounded-3xl border border-amber-200 bg-amber-50/80 text-amber-950 space-y-2 animate-in fade-in">
            <div className="font-bold flex items-center space-x-2 text-amber-900 text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Compliance Team Review Feedback</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium pl-7">
              {application.reviewReason}
            </p>
          </div>
        ) : (
          <div className="p-6 rounded-3xl border border-orange-200/80 bg-orange-50/60 text-slate-900 space-y-2 flex items-start space-x-4 animate-in fade-in">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6A00] text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900">Our team is reviewing your details</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                You&apos;ll receive an email and in-app notification once your seller account is approved.
              </p>
              <p className="text-[11px] text-slate-400 font-mono pt-1">
                This page will automatically refresh when there is an update.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="space-y-1">
            <div className="text-white font-black text-sm">AlifWorld Merchant Network</div>
            <p className="text-[11px] text-slate-500">
              Bangladesh&apos;s premier multi-vendor e-commerce logistics platform.
            </p>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            &copy; 2026 AlifWorld. All rights reserved. V 3.2.0
          </div>
        </div>
      </footer>
    </div>
  );
}
