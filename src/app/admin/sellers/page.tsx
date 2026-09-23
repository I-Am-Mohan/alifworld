'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, RefreshCw } from 'lucide-react';
import { useI18n } from '@/i18n/context';

type Application = { id: string; status: string; businessName: string; slug: string; applicantUserId: string; version: number; reviewReason: string | null; submittedAt: string | null };

export default function AdminSellersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/v1/admin/seller-applications');
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('admin.sellerApplicationsLoadFailed'));
      setItems((json.data.items || []).filter((item: Application) => item.status === 'SUBMITTED' || item.status === 'UNDER_REVIEW'));
    } catch (err: any) {
      setError(err.message || t('admin.sellerApplicationsLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadApplications(); }, [loadApplications]);

  const review = async (application: Application, decision: 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED') => {
    const decisionReason = reason[application.id]?.trim();
    if ((decision === 'CHANGES_REQUESTED' || decision === 'REJECTED') && (!decisionReason || decisionReason.length < 5)) {
      setError(t('admin.reasonRequired'));
      return;
    }
    try {
      setBusyId(application.id);
      const response = await fetch(`/api/v1/admin/seller-applications/${application.id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: application.version, decision, reason: decisionReason }) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('admin.sellerApplicationReviewFailed'));
      await loadApplications();
    } catch (err: any) {
      setError(err.message || t('admin.sellerApplicationReviewFailed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><Building2 className="h-6 w-6" /></div><div><h1 className="text-2xl font-black text-slate-900">{t('admin.sellerApplicationsTitle')}</h1><p className="text-sm text-slate-600">{t('admin.sellerApplicationsDescription')}</p></div></div>
        <button type="button" onClick={() => void loadApplications()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{t('common.refresh')}</button>
      </header>
      {error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{t('admin.sellerApplicationEmpty')}</div> : <div className="grid gap-4">{items.map((application) => <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-lg font-black text-slate-900">{application.businessName}</h2><p className="text-xs text-slate-500">{application.slug} · {application.applicantUserId}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-700">{application.status}</p></div><div className="flex flex-wrap gap-2"><button disabled={busyId === application.id} onClick={() => void review(application, 'UNDER_REVIEW')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{t('admin.markUnderReview')}</button><button disabled={busyId === application.id} onClick={() => void review(application, 'APPROVED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">{t('admin.approve')}</button></div></div><textarea value={reason[application.id] || ''} onChange={(event) => setReason((current) => ({ ...current, [application.id]: event.target.value }))} placeholder={t('admin.reasonRequired')} className="mt-4 min-h-20 w-full rounded-xl border border-slate-300 p-3 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={busyId === application.id} onClick={() => void review(application, 'CHANGES_REQUESTED')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">{t('admin.requestChanges')}</button><button disabled={busyId === application.id} onClick={() => void review(application, 'REJECTED')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">{t('admin.reject')}</button></div></article>)}</div>}
    </main>
  );
}
