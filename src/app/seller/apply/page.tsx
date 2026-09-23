'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Store } from 'lucide-react';
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
};

export default function SellerApplicationPage() {
  const { t } = useI18n();
  const [application, setApplication] = useState<Application | null>(null);
  const [form, setForm] = useState({ businessName: '', slug: '', tradeLicenseNumber: '', binNumber: '', tinNumber: '' });
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
        setForm({
          businessName: json.data.businessName,
          slug: json.data.slug,
          tradeLicenseNumber: json.data.tradeLicenseNumber || '',
          binNumber: json.data.binNumber || '',
          tinNumber: json.data.tinNumber || '',
        });
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

  const saveDraft = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = { ...form, tradeLicenseNumber: form.tradeLicenseNumber || null, binNumber: form.binNumber || null, tinNumber: form.tinNumber || null };
      const response = application
        ? await fetch(`/api/v1/seller/application/${application.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, version: application.version }) })
        : await fetch('/api/v1/seller/application', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('sellerApplication.saveFailed'));
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
    const saved = await saveDraft(event);
    if (!saved) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/seller/application/${saved.id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: saved.version }) });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('sellerApplication.submitFailed'));
      setApplication(json.data);
      setMessage(t('sellerApplication.submitted'));
    } catch (err: any) {
      setError(err.message || t('sellerApplication.submitFailed'));
    } finally {
      setSaving(false);
    }
  };

  const isEditable = !application || application.status === 'DRAFT' || application.status === 'CHANGES_REQUESTED';

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/seller" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />{t('common.back')}</Link>
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex items-start gap-4">
            <div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><Store className="h-7 w-7" /></div>
            <div><h1 className="text-2xl font-black text-slate-900">{t('sellerApplication.title')}</h1><p className="mt-1 text-sm text-slate-600">{t('sellerApplication.description')}</p></div>
          </div>
          {loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('common.loading')}</div> : error && !application ? <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : (
            <>
              {application && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="text-sm font-semibold text-slate-700">{t('sellerApplication.status')}</span><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{t(`sellerApplication.statuses.${application.status}`)}</span></div>}
              {message && <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div>}
              {error && <div className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
              {application?.reviewReason && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>{t('sellerApplication.reviewReason')}:</strong> {application.reviewReason}</div>}
              <form className="space-y-5" onSubmit={submitApplication}>
                <div className="grid gap-5 sm:grid-cols-2">
                  {([
                    ['businessName', 'businessName'],
                    ['slug', 'slug'],
                    ['tradeLicenseNumber', 'tradeLicenseNumber'],
                    ['binNumber', 'binNumber'],
                    ['tinNumber', 'tinNumber'],
                  ] as const).map(([field, label]) => (
                    <label key={field} className="block text-sm font-semibold text-slate-700">
                      {t(`sellerApplication.${label}`)}
                      <input disabled={!isEditable || saving} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 disabled:bg-slate-100" />
                    </label>
                  ))}
                </div>
                {isEditable && <div className="flex flex-wrap justify-end gap-3 pt-3"><button type="button" disabled={saving} onClick={(event) => void saveDraft(event)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{t('sellerApplication.saveDraft')}</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-600 disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t('sellerApplication.submit')}</button></div>}
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
