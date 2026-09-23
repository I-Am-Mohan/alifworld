'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, RefreshCw } from 'lucide-react';
import { useI18n } from '@/i18n/context';

type Application = { id: string; status: string; businessName: string; slug: string; applicantUserId: string; version: number; reviewReason: string | null; submittedAt: string | null };
type KycDocument = { id: string; sellerId: string; documentType: string; documentNumber: string | null; fileSize: number; mimeType: string; status: string; version: number; rejectionReason: string | null; seller?: { id: string; businessName: string; slug: string } };

export default function AdminSellersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Application[]>([]);
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [tab, setTab] = useState<'applications' | 'kyc'>('applications');
  const [loading, setLoading] = useState(true);
  const [kycLoading, setKycLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lifecycleSellerId, setLifecycleSellerId] = useState('');
  const [lifecycleVersion, setLifecycleVersion] = useState('1');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [lifecycleAction, setLifecycleAction] = useState<'RESTRICT' | 'SUSPEND' | 'REACTIVATE'>('SUSPEND');

  const updateLifecycle = async () => {
    try {
      const response = await fetch(`/api/v1/admin/sellers/${lifecycleSellerId}/lifecycle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: lifecycleAction, version: Number(lifecycleVersion), reason: lifecycleReason }) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('admin.sellerLifecycleFailed'));
      setError(null);
      setLifecycleReason('');
    } catch (err: any) { setError(err.message || t('admin.sellerLifecycleFailed')); }
  };

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

  const loadKycDocuments = useCallback(async () => {
    try {
      setKycLoading(true);
      const response = await fetch('/api/v1/admin/seller/kyc');
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('admin.kycReviewLoadFailed'));
      setKycDocuments(json.data || []);
    } catch (err: any) {
      setError(err.message || t('admin.kycReviewLoadFailed'));
    } finally {
      setKycLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadApplications(); void loadKycDocuments(); }, [loadApplications, loadKycDocuments]);

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

  const reviewKyc = async (document: KycDocument, status: 'VERIFIED' | 'REJECTED') => {
    const decisionReason = reason[document.id]?.trim();
    if (status === 'REJECTED' && (!decisionReason || decisionReason.length < 5)) {
      setError(t('admin.reasonRequired'));
      return;
    }
    try {
      setBusyId(document.id);
      const response = await fetch(`/api/v1/admin/seller/kyc/${document.id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `kyc-${document.id}-${document.version}-${status}` }, body: JSON.stringify({ version: document.version, status, rejectionReason: decisionReason }) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('admin.kycReviewFailed'));
      setError(null);
      await loadKycDocuments();
    } catch (err: any) {
      setError(err.message || t('admin.kycReviewFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const viewKyc = async (documentId: string) => {
    try {
      const response = await fetch(`/api/v1/seller/kyc/${documentId}/view`);
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('admin.kycReviewFailed'));
      window.open(json.data.viewUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || t('admin.kycReviewFailed'));
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><Building2 className="h-6 w-6" /></div><div><h1 className="text-2xl font-black text-slate-900">{t('admin.sellerApplicationsTitle')}</h1><p className="text-sm text-slate-600">{t('admin.sellerApplicationsDescription')}</p></div></div>
        <button type="button" onClick={() => { void loadApplications(); void loadKycDocuments(); }} disabled={loading || kycLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"><RefreshCw className={loading || kycLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />{t('common.refresh')}</button>
      </header>
      {error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">{t('admin.sellerLifecycleTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('admin.sellerLifecycleDescription')}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input value={lifecycleSellerId} onChange={(event) => setLifecycleSellerId(event.target.value)} placeholder="sel_..." className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input value={lifecycleVersion} onChange={(event) => setLifecycleVersion(event.target.value)} type="number" min="1" placeholder="Version" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select value={lifecycleAction} onChange={(event) => setLifecycleAction(event.target.value as typeof lifecycleAction)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="SUSPEND">{t('admin.suspend')}</option><option value="RESTRICT">{t('admin.restrict')}</option><option value="REACTIVATE">{t('admin.reactivate')}</option></select>
          <button type="button" onClick={() => void updateLifecycle()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">{t('admin.applyLifecycle')}</button>
        </div>
        <textarea value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} placeholder={t('admin.lifecycleReason')} className="mt-3 min-h-20 w-full rounded-xl border border-slate-300 p-3 text-sm" />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-black text-slate-900">{t('admin.kycReviewTitle')}</h2><p className="text-sm text-slate-600">{t('admin.kycReviewDescription')}</p></div>
        {kycLoading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</div> : kycDocuments.length === 0 ? <p className="text-sm text-slate-500">{t('admin.kycReviewEmpty')}</p> : <div className="grid gap-3">{kycDocuments.map((document) => <article key={document.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="font-bold text-slate-900">{document.documentType}</h3><p className="text-xs text-slate-500">{document.seller?.businessName || document.sellerId} · {document.mimeType} · {(document.fileSize / 1024 / 1024).toFixed(2)} MB</p><p className="mt-1 text-xs font-semibold text-amber-700">{document.status}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busyId === document.id} onClick={() => void viewKyc(document.id)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{t('admin.kycView')}</button><button type="button" disabled={busyId === document.id} onClick={() => void reviewKyc(document, 'VERIFIED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">{t('admin.kycVerify')}</button></div></div><textarea value={reason[document.id] || ''} onChange={(event) => setReason((current) => ({ ...current, [document.id]: event.target.value }))} placeholder={t('admin.reasonRequired')} className="mt-3 min-h-16 w-full rounded-xl border border-slate-300 p-3 text-sm" /><button type="button" disabled={busyId === document.id} onClick={() => void reviewKyc(document, 'REJECTED')} className="mt-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">{t('admin.kycReject')}</button></article>)}</div>}
      </section>
      {loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{t('admin.sellerApplicationEmpty')}</div> : <div className="grid gap-4">{items.map((application) => <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-lg font-black text-slate-900">{application.businessName}</h2><p className="text-xs text-slate-500">{application.slug} · {application.applicantUserId}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-amber-700">{application.status}</p></div><div className="flex flex-wrap gap-2"><button disabled={busyId === application.id || application.status === 'UNDER_REVIEW'} onClick={() => void review(application, 'UNDER_REVIEW')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold">{t('admin.markUnderReview')}</button><button disabled={busyId === application.id || application.status !== 'UNDER_REVIEW'} onClick={() => void review(application, 'APPROVED')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">{t('admin.approve')}</button></div></div><textarea value={reason[application.id] || ''} onChange={(event) => setReason((current) => ({ ...current, [application.id]: event.target.value }))} placeholder={t('admin.reasonRequired')} className="mt-4 min-h-20 w-full rounded-xl border border-slate-300 p-3 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={busyId === application.id || application.status !== 'UNDER_REVIEW'} onClick={() => void review(application, 'CHANGES_REQUESTED')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950">{t('admin.requestChanges')}</button><button disabled={busyId === application.id || application.status !== 'UNDER_REVIEW'} onClick={() => void review(application, 'REJECTED')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">{t('admin.reject')}</button></div></article>)}</div>}
    </main>
  );
}
