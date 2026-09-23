'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, Loader2, Plus, RefreshCw } from 'lucide-react';

type Category = { id: string; name: string; slug: string; parentId?: string | null; children?: Category[]; isActive: boolean; version: number };

function Tree({ nodes, depth = 0 }: { nodes: Category[]; depth?: number }) {
  return <div className="space-y-2">{nodes.map((node) => <div key={node.id} className="rounded-xl border border-slate-200 bg-white p-3" style={{ marginLeft: depth * 18 }}><div className="flex items-center justify-between gap-3"><div><p className="font-bold text-slate-900">{node.name}</p><p className="text-xs text-slate-500">/{node.slug} · {node.isActive ? 'ACTIVE' : 'INACTIVE'}</p></div><span className="text-xs text-slate-400">{node.children?.length || 0} children</span></div>{node.children && node.children.length > 0 && <div className="mt-2"><Tree nodes={node.children} depth={depth + 1} /></div>}</div>)}</div>;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');

  const load = useCallback(async () => {
    try { setLoading(true); const response = await fetch('/api/v1/admin/categories'); const json = await response.json().catch(() => null); if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to load categories.'); setCategories(json.data || []); } catch (err: any) { setError(err.message || 'Unable to load categories.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    try { const response = await fetch('/api/v1/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, slug, parentId: parentId || null, isActive: true, displayOrder: 0, taxRatePercent: 0 }) }); const json = await response.json().catch(() => null); if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to create category.'); setName(''); setSlug(''); setParentId(''); await load(); } catch (err: any) { setError(err.message || 'Unable to create category.'); }
  };

  const flat = (nodes: Category[]): Category[] => nodes.flatMap((node) => [node, ...(node.children ? flat(node.children) : [])]);
  const all = flat(categories);
  return <main className="space-y-6 p-4 sm:p-6"><header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><Layers className="h-6 w-6" /></div><div><h1 className="text-2xl font-black text-slate-900">Categories</h1><p className="text-sm text-slate-600">Hierarchical catalog taxonomy with cycle-safe parent relationships.</p></div></div><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-300 p-2"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button></header>{error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}<section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" /><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" /><select value={parentId} onChange={(e) => setParentId(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="">Top-level category</option>{all.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button type="button" onClick={() => void create()} disabled={!name || !slug} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold disabled:opacity-50"><Plus className="h-4 w-4" />Create</button></section>{loading ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading categories…</div> : categories.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No active categories.</div> : <Tree nodes={categories} />}</main>;
}
