'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowLeft, Sliders, Sparkles, CheckCircle2 } from 'lucide-react';

interface AdminPlaceholderPageProps {
  category: string;
  title: string;
  description: string;
  icon: LucideIcon;
  features?: string[];
}

export function AdminPlaceholderPage({
  category,
  title,
  description,
  icon: Icon,
  features = [],
}: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-6">
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
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </Link>
      </div>

      {/* Main Empty / In-Progress Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Icon className="w-8 h-8 stroke-[1.8]" />
        </div>

        <div className="inline-flex items-center space-x-1.5 text-[10px] uppercase tracking-widest font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-3">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>Operational Module Active</span>
        </div>

        <h2 className="text-xl font-black text-slate-900">{title} Workspace</h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          {description}
        </p>

        {features.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-left max-w-md mx-auto space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Capabilities Configured in this Phase:
            </span>
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-3">
          <Link
            href="/admin/setup"
            className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-bold text-amber-800 transition-colors inline-flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure in Setup</span>
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
