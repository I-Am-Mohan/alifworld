import React from 'react';
import Link from 'next/link';
import { Store, ArrowLeft, ShieldAlert } from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';

export const dynamic = 'force-dynamic';

export default function SellerCenterPage() {
  return (
    <div className="min-h-screen bg-black bg-[#FAF9F6] flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <AlifLogo size="sm" href="/" />
        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors inline-flex items-center space-x-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#F59E0B] flex items-center justify-center mx-auto mb-5 shadow-xs">
            <Store className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center space-x-1.5 text-[11px] uppercase tracking-widest font-mono font-bold text-[#F59E0B] bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Merchant Authentication Required</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Seller Center Access Restricted
          </h1>

          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            The unauthenticated demo seller page has been removed. Access to merchant inventory management, product listings, and order fulfillment requires verified seller authentication and active store onboarding.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
            <Link
              href="/seller/apply"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-sm shadow-sm transition-all"
            >
              Become a Seller
            </Link>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm transition-all hover:bg-slate-50"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-400">
        © 2026 AlifWorld Merchant Hub. Authenticated access strictly required.
      </footer>
    </div>
  );
}
