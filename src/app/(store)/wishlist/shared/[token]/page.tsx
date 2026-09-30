'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SharedWishlistView } from '@/features/customers/types';

export default function SharedWishlistPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  const [wishlist, setWishlist] = useState<SharedWishlistView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');

  useEffect(() => {
    if (!token) return;

    fetch(`/api/v1/wishlists/shared/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || 'Shared wishlist link is invalid or expired.');
        }
        return res.json();
      })
      .then((body) => {
        if (body?.data) {
          setWishlist(body.data);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isBn = locale === 'bn-BD';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#18181B] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold border border-slate-700 animate-fade-in">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-black">
                {isBn ? 'শেয়ারকৃত উইশলিস্ট' : 'Shared Wishlist'}
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {wishlist?.title || 'Shared Gift List'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setLocale(isBn ? 'en-BD' : 'bn-BD')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all"
            >
              {isBn ? 'English' : 'বাংলা'}
            </button>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs"
            >
              {isBn ? 'হোমপেজ' : 'Storefront'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6"
      >
        {loading ? (
          <div className="p-20 text-center text-xs text-slate-500 font-medium">
            Loading shared wishlist items...
          </div>
        ) : error || !wishlist ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3 max-w-lg mx-auto">
            <span className="text-4xl">🔒</span>
            <h3 className="text-base font-black text-slate-900">
              {isBn ? 'উইশলিস্টটি অনুপলব্ধ' : 'Wishlist Link Unavailable'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {error ||
                (isBn
                  ? 'এই শেয়ার লিংকটি ব্যক্তিগত করা হয়েছে অথবা এর মেয়াদ শেষ হয়েছে।'
                  : 'This shared wishlist link is private or has been revoked by the owner.')}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors mt-2"
            >
              {isBn ? 'হোমপেজে ফিরে যান' : 'Back to Storefront'}
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Share-Safe Header Banner */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-[#FF6A00] text-white text-[10px] font-bold">
                    Share-Safe Link
                  </Badge>
                  <span className="text-xs text-slate-500">
                    Curated by{' '}
                    <strong className="text-slate-800">{wishlist.ownerDisplayName}</strong>
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900">{wishlist.title}</h2>
                {wishlist.description && (
                  <p className="text-xs text-slate-500 leading-relaxed">{wishlist.description}</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono text-slate-500">
                  {wishlist.itemCount} {isBn ? 'টি পণ্য সংরক্ষিত' : 'items saved'}
                </span>
              </div>
            </div>

            {/* Zero PII Notice */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 font-medium">
              <span>🛡️</span>
              <span>
                {isBn
                  ? 'গোপনীয়তা সুরক্ষিত: এই শেয়ার লিংকে গ্রাহকের কোনো ব্যক্তিগত তথ্য (ফোন, ইমেইল, ঠিকানা) প্রকাশিত হয়নি।'
                  : 'Privacy Protected: Zero personal data (email, phone, shipping addresses) is exposed on this shared link.'}
              </span>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlist.items.map((item) => (
                <Card
                  key={item.id}
                  className="border border-slate-200 bg-white hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.variantTitle || 'Standard'}
                      </span>
                      {item.inStock ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {isBn ? 'স্টকে আছে' : 'In Stock'}
                        </Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                          {isBn ? 'স্টক শেষ' : 'Out of Stock'}
                        </Badge>
                      )}
                    </div>

                    <Link href={`/products/${item.productSlug}`} className="block group">
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-[#FF6A00] transition-colors line-clamp-2">
                        {isBn && item.productTitleBn ? item.productTitleBn : item.productTitle}
                      </h3>
                    </Link>

                    {item.notes && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
                        &quot;{item.notes}&quot;
                      </div>
                    )}
                  </div>

                  <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/50 mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-base font-black text-slate-900">
                        ৳{item.priceBdtFormatted}
                      </div>
                      <div className="text-[10px] font-black text-[#FF6A00]">
                        ★ +{item.productPoint} Points
                      </div>
                    </div>

                    <Button
                      disabled={!item.inStock}
                      onClick={() => showToast(`Added ${item.productTitle} to your cart!`)}
                      className={`text-xs font-bold ${
                        item.inStock
                          ? 'bg-[#FF6A00] hover:bg-[#E55F00] text-white shadow-xs'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isBn ? 'কার্টে নিন' : 'Add to Cart'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Customer Experience • Share-Safe Wishlists & Zero Personal Data Leakage
        </div>
      </footer>
    </div>
  );
}
