'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { csrfFetch } from '@/shared/security/csrf-client';

type Product = { id: string; title: string; titleBn?: string | null; slug: string; status: string; basePricePoisha: number; productPoint: number; sku?: string | null; version: number };

export default function SellerCatalogClient() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setLoading(true); const params = new URLSearchParams(); if (status) params.set('status', status); if (search) params.set('search', search); const response = await fetch(`/api/v1/seller/catalog/products?${params}`); if (response.status === 401) { router.replace('/seller/login'); return; } const json = await response.json().catch(() => null); if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to load seller products.'); setProducts(json.data || []); setError(null); } catch (err: any) { setError(err.message || 'Unable to load seller products.'); } finally { setLoading(false); } }, [router, status, search]);
  useEffect(() => { void load(); }, [load]);
  const remove = async (product: Product) => { if (!window.confirm(`Delete ${product.title}?`)) return; try { const response = await csrfFetch(`/api/v1/seller/catalog/products/${product.id}?version=${product.version}`, { method: 'DELETE' }); const json = await response.json().catch(() => null); if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to delete product.'); await load(); } catch (err: any) { setError(err.message || 'Unable to delete product.'); } };
  return <main className="min-h-screen bg-[#FAF9F6] p-4 text-slate-900 sm:p-8"><div className="mx-auto max-w-7xl space-y-6">
    {/* Merchant Dashboard Header Card with Hero Asset */}
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="space-y-3 max-w-xl">
        <div className="inline-flex items-center space-x-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF6A00] bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
          <span>Seller Center Workspace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Merchant Product Catalog</h1>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">Manage your product inventory, integer BDT poisha prices, Product Points, media galleries, and publication approval states.</p>
        <div className="pt-2 flex flex-wrap gap-2.5">
          <Link href="/seller/products/new" className="rounded-xl bg-[#FF6A00] hover:bg-[#E55F00] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all">Create Product Draft</Link>
          <Link href="/seller/catalog/bulk" className="rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition-all">Bulk Operations</Link>
          <Link href="/seller/catalog/onboarding" className="rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 px-4 py-2 text-xs font-bold text-orange-400 transition-all">Catalog Guidance</Link>
        </div>
      </div>
      <div className="w-full max-w-[280px] shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-2xl hidden md:block">
        <img src="/seller-hero-banner.jpg" alt="AlifWorld Merchant Network" className="w-full h-auto object-cover" />
      </div>
    </div>
    {error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}<button type="button" onClick={() => void load()} className="ml-3 font-bold underline">Retry</button></div>}<div className="flex flex-wrap gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or SKU" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending approval</option><option value="REJECTED">Rejected</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>{loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading products…</div> : products.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No products found. Create a draft to begin.</div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-slate-100"><td className="px-4 py-4"><div className="font-bold">{product.title}</div><div className="text-xs text-slate-500">{product.titleBn || product.sku || product.slug}</div></td><td className="px-4 py-4 font-mono">৳{(Number(product.basePricePoisha) / 100).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td><td className="px-4 py-4">{product.productPoint}</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{product.status}</span></td><td className="px-4 py-4"><Link href={`/seller/products/new?id=${product.id}`} className="mr-3 font-semibold text-orange-700 hover:underline">Edit</Link>{['DRAFT', 'REJECTED', 'ARCHIVED'].includes(product.status) && <button type="button" onClick={() => void remove(product)} className="font-semibold text-rose-700 hover:underline">Delete</button>}</td></tr>)}</tbody></table></div>}</div></main>;
}
