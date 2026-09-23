'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type VersionRecord = { id: string; version: number; action: string; actorId?: string | null; actorRole?: string | null; requestId?: string | null; createdAt: string; snapshot: Record<string, unknown> };

export default function ProductVersionsPage({ params }: { params: { id: string } }) {
  const [items, setItems] = useState<VersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void fetch(`/api/v1/admin/catalog/products/${params.id}/versions`).then(async (response) => { const body = await response.json().catch(() => null); if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Unable to load version history.'); setItems(body.data || []); }).catch((err) => setError(err.message)).finally(() => setLoading(false)); }, [params.id]);
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-6xl space-y-6"><Link href="/admin/products" className="text-sm font-semibold text-indigo-700 hover:underline">← Back to products</Link><header><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">Audit visibility</p><h1 className="text-3xl font-black">Product version history</h1><p className="mt-1 text-sm text-slate-600">Immutable, redacted snapshots of catalog changes.</p></header>{error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" onClick={() => window.location.reload()} className="ml-3 font-bold underline">Retry</button></div>}{loading ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Loading version history…</div> : items.length === 0 ? <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No version history is available for this product.</div> : <div className="space-y-4">{items.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Version {item.version} · {item.action}</h2><p className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleString('en-BD')} · Actor {item.actorId || 'system'}{item.actorRole ? ` · ${item.actorRole}` : ''}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{item.requestId || 'No request ID'}</span></div><pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(item.snapshot, null, 2)}</pre></article>)}</div>}</div></main>;
}
