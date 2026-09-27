'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WishlistItemView {
  id: string;
  productId: string;
  slug: string;
  title: string;
  titleBn?: string | null;
  variantTitle?: string | null;
  priceBdtFormatted: string;
  productPoint: number;
  inStock: boolean;
  notes?: string | null;
}

export default function CustomerWishlistPage() {
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [wishlistTitle, setWishlistTitle] = useState('My Favorites (পছন্দের তালিকা)');
  const [isShared, setIsShared] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const [items, setItems] = useState<WishlistItemView[]>([
    {
      id: 'wsi_001',
      productId: 'prod_walton_01',
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro Smartphone',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো স্মার্টফোন',
      variantTitle: 'Ocean Blue / 128GB',
      priceBdtFormatted: '18,500.00',
      productPoint: 150,
      inStock: true,
      notes: 'Planning to buy during upcoming Eid campaign',
    },
    {
      id: 'wsi_002',
      productId: 'prod_xiaomi_02',
      slug: 'xiaomi-redmi-buds-5',
      title: 'Xiaomi Redmi Buds 5 Pro Wireless Earbuds',
      titleBn: 'শাওমি রেডমি বাডস ৫ প্রো ওয়্যারলেস ইয়ারবাডস',
      variantTitle: 'Moonlight White',
      priceBdtFormatted: '6,500.00',
      productPoint: 65,
      inStock: true,
      notes: null,
    },
    {
      id: 'wsi_003',
      productId: 'prod_aarong_04',
      slug: 'aarong-cotton-panjabi',
      title: 'Aarong Handcrafted Fine Cotton Panjabi',
      titleBn: 'আড়ং ফাইন কটন পাঞ্জাবি',
      variantTitle: 'Size: 42',
      priceBdtFormatted: '3,500.00',
      productPoint: 35,
      inStock: false,
      notes: 'Waiting for restock notification',
    },
  ]);

  const isBn = locale === 'bn-BD';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast(isBn ? 'পণ্যটি উইশলিস্ট থেকে সরানো হয়েছে।' : 'Item removed from wishlist.');
  };

  const handleGenerateShareLink = () => {
    const token = `wsh_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    setShareToken(token);
    setIsShared(true);
    showToast(isBn ? 'শেয়ার-নিরাপদ লিংক তৈরি ���রা হয়েছে!' : 'Share-safe wishlist link generated!');
  };

  const handleRevokeShareLink = () => {
    setShareToken(null);
    setIsShared(false);
    setShowShareModal(false);
    showToast(isBn ? 'শেয়ার লিংক বাতিল করা হয়েছে। উইশলিস্টটি এখন ব্যক্তিগত।' : 'Share link revoked. Wishlist is now private.');
  };

  const copyShareLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/wishlist/shared/${shareToken}`;
    navigator.clipboard.writeText(url);
    showToast(isBn ? 'লিংক ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Share link copied to clipboard!');
  };

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
                {isBn ? 'পছন্দের তালিকা' : 'Customer Wishlist'}
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {wishlistTitle}
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
            <Button
              onClick={() => setShowShareModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <span>🔗 {isBn ? 'শেয়ার লিংক' : 'Share Wishlist'}</span>
            </Button>
            <Link
              href="/search"
              className="px-3.5 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs"
            >
              {isBn ? 'ক্যাটালগ' : 'Explore Catalog'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Wishlist Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Wishlist Header Callout */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-slate-900 text-white text-[10px] font-bold">
                {isShared ? 'SHARED (লিংক দ্বারা দৃশ্যমান)' : 'PRIVATE (ব্যক্তিগত)'}
              </Badge>
              <span className="text-xs text-slate-500 font-mono">
                {items.length} {isBn ? 'টি সংরক্ষিত পণ্য' : 'saved items'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isBn
                ? 'আপনার পছন্দের পণ্যগুলো ভবিষ্যতের কেনাকাটার জন্য সংরক্ষণ করুন অথবা বন্ধুদের সাথে শেয়ার করুন।'
                : 'Save items for future purchase or generate a share-safe link for friends and family.'}
            </p>
          </div>

          {isShared && (
            <div className="flex items-center space-x-2">
              <Button onClick={copyShareLink} variant="outline" className="text-xs font-bold h-8">
                📋 Copy Link
              </Button>
            </div>
          )}
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <Card className="border border-[#FF6A00]/40 bg-orange-50/20 p-6 space-y-4 max-w-xl mx-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900">
                {isBn ? 'উইশলিস্ট শেয়ার সেটিংস' : 'Share-Safe Wishlist Link'}
              </h4>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isBn
                ? 'শেয়ার-নিরাপদ লিংকের মাধ্যমে যে ��েউ আপনার উইশলিস্টের পণ্যগুলো দেখতে পারবে। আপনার ইমেইল, ফোন নম্বর বা ব্যক্তিগত তথ্য কখনোই ফাঁস হবে না (জিরো পিআইআই লিকেজ)।'
                : 'Share-safe links let friends view your wishlist and live pricing. Zero personal customer data (email, phone, addresses) is ever exposed.'}
            </p>

            {isShared && shareToken ? (
              <div className="space-y-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 truncate select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/wishlist/shared/${shareToken}` : `https://alifworld.com/wishlist/shared/${shareToken}`}
                </div>
                <div className="flex space-x-2">
                  <Button onClick={copyShareLink} className="bg-[#FF6A00] text-white text-xs font-bold">
                    Copy Link
                  </Button>
                  <Button onClick={handleRevokeShareLink} variant="outline" className="text-xs font-bold text-red-600">
                    Revoke Share Link
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleGenerateShareLink} className="bg-[#FF6A00] text-white text-xs font-bold">
                Generate Share-Safe Link
              </Button>
            )}
          </Card>
        )}

        {/* Wishlist Items List */}
        {items.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <span className="text-4xl">❤️</span>
            <h3 className="text-sm font-black text-slate-900">
              {isBn ? 'আপনার উইশলিস্ট খালি' : 'Your wishlist is empty'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'পছন্দের পণ্য খুঁজে পেত��� ক্যাটালগ ঘুরে দেখুন।'
                : 'Explore our catalog and click the heart icon to save products for later.'}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#FF6A00] text-white text-xs font-bold hover:bg-[#E55F00] transition-colors mt-2"
            >
              {isBn ? 'পণ্য খুঁজুন' : 'Start Shopping'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
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

                  <Link href={`/products/${item.slug}`} className="block group">
                    <h3 className="text-sm font-black text-slate-900 group-hover:text-[#FF6A00] transition-colors line-clamp-2">
                      {isBn && item.titleBn ? item.titleBn : item.title}
                    </h3>
                  </Link>

                  {item.notes && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
                      "{item.notes}"
                    </div>
                  )}
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/50 mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-slate-900">৳{item.priceBdtFormatted}</div>
                    <div className="text-[10px] font-black text-[#FF6A00]">
                      ★ +{item.productPoint} Points
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                    <Button
                      disabled={!item.inStock}
                      onClick={() => showToast(`Added ${item.title} to cart!`)}
                      className={`text-xs font-bold ${
                        item.inStock
                          ? 'bg-[#FF6A00] hover:bg-[#E55F00] text-white shadow-xs'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isBn ? 'কার্টে নিন' : 'Add to Cart'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Customer Experience • Private Wishlists, Share-Safe Token Links & Zero PII Exposure
        </div>
      </footer>
    </div>
  );
}
