'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowLeft, Sliders, Construction } from 'lucide-react';

interface AdminPlaceholderPageProps {
  category: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  features?: string[];
}

export function AdminPlaceholderPage({
  category,
  title,
  description,
  icon: Icon,
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>{category}</span>
            <span>&gt;</span>
            <span className="text-amber-600 font-bold">{title}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-fit shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </Link>
      </div>

      {/* Main Under Development Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Icon className="w-8 h-8 stroke-[1.8]" />
        </div>

        <div className="inline-flex items-center space-x-1.5 text-[11px] uppercase tracking-wider font-mono font-bold text-amber-800 bg-amber-100/90 px-3.5 py-1 rounded-full border border-amber-300 mb-3 shadow-2xs">
          <Construction className="w-3.5 h-3.5 text-amber-700" />
          <span>Under development</span>
        </div>

        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {description || 'This section is currently under development and will be available in an upcoming phase.'}
        </p>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-3">
          <Link
            href="/admin/setup"
            className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-800 transition-colors inline-flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Platform Setup</span>
          </Link>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-xs font-bold text-white transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
