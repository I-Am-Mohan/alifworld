'use client';

import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { useI18n } from '@/i18n/context';

type DocumentRecord = { id: string; documentType: string; documentNumber: string | null; fileSize: number; mimeType: string; status: string; rejectionReason: string | null; verifiedAt: string | null; version: number };
const documentTypes = ['TRADE_LICENSE', 'NID_FRONT', 'NID_BACK', 'BIN_CERTIFICATE', 'BANK_CHEQUE_LEAF', 'TIN_CERTIFICATE'];

export default function SellerKycPage() {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [sellerId, setSellerId] = useState('');
  const [documentType, setDocumentType] = useState(documentTypes[0]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/seller/kyc');
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('sellerKyc.loadFailed'));
      setDocuments(json.data || []);
      if (json.data?.[0]?.sellerId) setSellerId(json.data[0].sellerId);
    } catch (err: any) {
      setError(err.message || t('sellerKyc.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const upload = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sellerId || !file) {
      setError(t('sellerKyc.fileRequired'));
      return;
    }
    try {
      setUploading(true);
      setError(null);
      setMessage(null);
      const form = new FormData();
      form.set('sellerId', sellerId);
      form.set('documentType', documentType);
      form.set('documentNumber', documentNumber);
      form.set('file', file);
      const response = await fetch('/api/v1/seller/kyc', { method: 'POST', headers: { 'X-Device-ID': 'seller-web' }, body: form });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('sellerKyc.uploadFailed'));
      setMessage(t('sellerKyc.uploaded'));
      setFile(null);
      setDocumentNumber('');
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || t('sellerKyc.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const viewDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/seller/kyc/${id}/view`);
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || t('sellerKyc.viewFailed'));
      window.open(json.data.viewUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || t('sellerKyc.viewFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-4"><AlifLogo size="sm" href="/" /><h1 className="text-sm font-black">{t('sellerKyc.title')}</h1></div><Link href="/seller" className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold">{t('sellerKyc.dashboard')}</Link></div></header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><strong>{t('sellerKyc.privateStorage')}</strong><p className="mt-1 text-xs text-sky-800">{t('sellerKyc.privateStorageDescription')}</p></div>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
        <form onSubmit={upload} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-5">
          <input required value={sellerId} onChange={(event) => setSellerId(event.target.value)} placeholder={t('sellerKyc.sellerId')} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">{documentTypes.map((type) => <option key={type}>{type}</option>)}</select>
          <input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} placeholder={t('sellerKyc.documentNumber')} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input required type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={uploading} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">{uploading ? t('common.loading') : t('sellerKyc.upload')}</button>
        </form>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black">{t('sellerKyc.documents')}</h2></div>{loading ? <p className="p-5 text-sm text-slate-500">{t('common.loading')}</p> : documents.length === 0 ? <p className="p-5 text-sm text-slate-500">{t('sellerKyc.empty')}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">{t('sellerKyc.type')}</th><th className="px-5 py-3">{t('sellerKyc.file')}</th><th className="px-5 py-3">{t('sellerKyc.status')}</th><th className="px-5 py-3" /></tr></thead><tbody>{documents.map((doc) => <tr key={doc.id} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold">{doc.documentType}<div className="text-xs font-normal text-slate-500">{doc.documentNumber || '—'}</div></td><td className="px-5 py-3 text-xs text-slate-500">{doc.mimeType} · {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</td><td className="px-5 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{doc.status}</span>{doc.rejectionReason && <div className="mt-1 text-xs text-rose-700">{doc.rejectionReason}</div>}</td><td className="px-5 py-3 text-right"><button type="button" onClick={() => void viewDocument(doc.id)} className="text-xs font-bold text-amber-700 hover:underline">{t('sellerKyc.view')}</button></td></tr>)}</tbody></table></div>}</section>
      </main>
    </div>
  );
}
