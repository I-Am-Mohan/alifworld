'use client';

import { useEffect, useState } from 'react';

type Media = { id: string; mediaType: string; url: string; isPrimary: boolean; displayOrder: number; altText?: string | null };

export default function ProductMediaManager({ productId }: { productId: string }) {
  const [media, setMedia] = useState<Media[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [primary, setPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = async () => { const response = await fetch(`/api/v1/seller/catalog/products/${productId}/media`); const body = await response.json().catch(() => null); if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Unable to load media.'); setMedia(body.data || []); };
  useEffect(() => { void load().catch((err) => setError(err.message)); }, [productId]);
  const upload = async () => { if (!file) return; try { setSaving(true); setError(null); const form = new FormData(); form.set('file', file); form.set('mediaType', file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'); form.set('isPrimary', String(primary)); form.set('displayOrder', String(media.length)); const response = await fetch(`/api/v1/seller/catalog/products/${productId}/media`, { method: 'POST', body: form }); const body = await response.json().catch(() => null); if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Unable to upload media.'); setFile(null); setPrimary(false); await load(); } catch (err: any) { setError(err.message || 'Unable to upload media.'); } finally { setSaving(false); } };
  const remove = async (item: Media) => { if (!window.confirm('Delete this media item?')) return; const response = await fetch(`/api/v1/seller/catalog/products/${productId}/media/${item.id}`, { method: 'DELETE' }); const body = await response.json().catch(() => null); if (!response.ok || !body?.success) setError(body?.error?.message || 'Unable to delete media.'); else await load(); };
  return <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-black">Media gallery</h2><p className="mt-1 text-xs text-slate-400">Upload validated images or videos; private storage keys are never shown as public URLs.</p>{error && <div role="alert" className="mt-3 rounded-lg bg-rose-900/40 p-3 text-xs text-rose-300">{error}</div>}<div className="mt-4 flex flex-wrap items-center gap-3"><input aria-label="Product media file" type="file" accept="image/*,video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} className="max-w-full text-sm" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} /> Primary</label><button type="button" disabled={saving || !file} onClick={() => void upload()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold disabled:opacity-50">{saving ? 'Uploading…' : 'Upload'}</button></div>{media.length > 0 && <ul className="mt-4 space-y-2">{media.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3 text-sm"><span>{item.mediaType} · {item.isPrimary ? 'Primary · ' : ''}position {item.displayOrder + 1}</span><button type="button" onClick={() => void remove(item)} className="text-xs font-bold text-rose-300 hover:underline">Delete</button></li>)}</ul>}</section>;
}
