'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PublicSellerStorefrontResult } from '@/features/seller/services/seller-storefront.service';

export default function PublicSellerStorefrontPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'walton-official';

  const [storefront, setStorefront] = useState<PublicSellerStorefrontResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [activeTab, setActiveTab] = useState<'products' | 'policies' | 'about'>('products');
  const [sortBy, setSortBy] = useState<string>('relevance');

  useEffect(() => {
    fetch(`/api/v1/sellers/${slug}/storefront?sortBy=${sortBy}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setStorefront(body.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load seller storefront:', err);
      })
      .finally(() => setLoading(false));
  }, [slug, sortBy]);

  const isBn = locale === 'bn-BD';
  const store = storefront?.store;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-black">
                {isBn ? 'সেলার স্টোরফ্রন্ট' : 'Seller Storefront'}
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {store?.businessName || slug}
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {loading ? (
          <div className="p-20 text-center text-xs text-slate-500 font-medium">
            Loading merchant storefront...
          </div>
        ) : !store ? (
          <div className="p-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <span className="text-4xl">🏪</span>
            <h3 className="text-base font-black text-slate-900">
              {isBn ? 'স্টোরটি খুঁজে পাওয়া যায়নি' : 'Store Not Found'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn ? 'এই সেলারের স্টোরটি বর্তমানে অনুপলব্ধ।' : 'This merchant storefront is currently inactive.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors mt-2"
            >
              {isBn ? 'হোমপেজে ফিরে যান' : 'Back to Home'}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Vacation Mode Warning */}
            {store.vacationMode && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-3 shadow-xs">
                <span className="text-lg">🏖️</span>
                <div>
                  <span className="font-bold">
                    {isBn ? 'স্টোর ছুটি মোডে রয়েছে: ' : 'Store is on vacation: '}
                  </span>
                  <span>
                    {store.vacationMessage || (isBn ? 'সাময়িক বিরতিতে অর্ডার ডেলিভারি বিলম্ব হতে পারে।' : 'Order processing may experience slight delays.')}
                  </span>
                </div>
              </div>
            )}

            {/* Store Profile Card Banner */}
            <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-[#FF6A00] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 border-none">
                    Official Merchant
                  </Badge>
                  {store.isVerified && (
                    <Badge className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-none flex items-center gap-1">
                      <span>✓</span>
                      <span>Verified Seller</span>
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
                  {store.businessName}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                  {store.storeDescription}
                </p>

                <div className="flex items-center space-x-4 text-xs text-slate-400 pt-1 font-medium">
                  <span>📅 Member since {store.memberSince}</span>
                  <span>•</span>
                  <span>★ {store.rating} ({store.reviewCount} reviews)</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl text-center shrink-0 border border-white/10">
                <div className="text-3xl font-black text-amber-400">
                  {storefront.totalHits || 0}
                </div>
                <div className="text-[11px] text-slate-300 uppercase font-bold tracking-wider mt-1">
                  {isBn ? 'তালিকাভুক্ত পণ্য' : 'Listed Products'}
                </div>
              </div>
            </div>

            {/* Navigation Tabs: Products / Policies / Contact */}
            <div className="border-b border-slate-200 flex space-x-6 text-xs font-bold">
              <button
                onClick={() => setActiveTab('products')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'products'
                    ? 'border-[#FF6A00] text-[#FF6A00]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {isBn ? 'সকল পণ্য' : 'Products Catalog'} ({storefront.totalHits})
              </button>
              <button
                onClick={() => setActiveTab('policies')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'policies'
                    ? 'border-[#FF6A00] text-[#FF6A00]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {isBn ? 'স্টোর পলিসি' : 'Store Policies'}
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'about'
                    ? 'border-[#FF6A00] text-[#FF6A00]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {isBn ? 'যোগাযোগ ও তথ্য' : 'Contact & Info'}
              </button>
            </div>

            {/* Tab 1: Products */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                {/* Sorting Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div className="text-xs text-slate-500 font-medium">
                    {storefront.totalHits} {isBn ? 'টি পণ্য পাওয়া গেছে' : 'products available from this seller'}
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-slate-600">{isBn ? 'বাছাই:' : 'Sort:'}</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 text-xs focus:ring-1 focus:ring-[#FF6A00]"
                    >
                      <option value="relevance">{isBn ? 'প্রাসঙ্গিকতা' : 'Most Relevant'}</option>
                      <option value="price_asc">{isBn ? 'মূল্য: কম থেকে বেশি' : 'Price: Low to High'}</option>
                      <option value="price_desc">{isBn ? 'মূল্য: বেশি থেকে কম' : 'Price: High to Low'}</option>
                      <option value="points_desc">{isBn ? 'সর্বোচ্চ পয়েন্ট' : 'Highest Reward Points'}</option>
                    </select>
                  </div>
                </div>

                {/* Product Cards Grid */}
                {storefront.products.length === 0 ? (
                  <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-3xl">📦</span>
                    <h3 className="text-sm font-black text-slate-900">
                      {isBn ? 'এই সেলারের কোনো পণ্য উপলব্ধ নেই' : 'No products available from this seller'}
                    </h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storefront.products.map((product) => {
                      const priceBdt = (product.minPricePoisha / 100).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });

                      return (
                        <Card
                          key={product.id}
                          className="border border-slate-200 bg-white hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group"
                        >
                          <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {product.brand || store.businessName}
                              </span>
                              {product.inStock ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                  {isBn ? 'মজুদ আছে' : 'In Stock'}
                                </Badge>
                              ) : (
                                <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                                  {isBn ? 'স্টক শেষ' : 'Out of Stock'}
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-sm font-black text-slate-900 group-hover:text-[#FF6A00] transition-colors line-clamp-2">
                              {isBn && product.titleBn ? product.titleBn : product.title}
                            </h3>

                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          </div>

                          <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/50 mt-4 flex items-center justify-between">
                            <div>
                              <div className="text-base font-black text-slate-900">৳{priceBdt}</div>
                              <div className="text-[10px] font-black text-[#FF6A00]">
                                ★ +{product.productPointSnapshot} Points
                              </div>
                            </div>

                            <Link
                              href={`/products/${product.slug}`}
                              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold bg-[#FF6A00] hover:bg-[#E55F00] text-white shadow-xs transition-colors"
                            >
                              {isBn ? 'দেখুন' : 'View'}
                            </Link>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Policies */}
            {activeTab === 'policies' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border border-slate-200 bg-white space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {isBn ? 'ডেলিভারি পলিসি' : 'Shipping Policy'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {store.shippingPolicy}
                  </p>
                </Card>

                <Card className="p-6 border border-slate-200 bg-white space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {isBn ? 'রিটার্ন ও রিপ্লেসমেন্ট পলিসি' : 'Return Policy'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {store.returnPolicy}
                  </p>
                </Card>

                <Card className="p-6 border border-slate-200 bg-white space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    {isBn ? 'অর্ডার বাতিলকরণ পলিসি' : 'Cancellation Policy'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {store.cancellationPolicy}
                  </p>
                </Card>
              </div>
            )}

            {/* Tab 3: About & Contact */}
            {activeTab === 'about' && (
              <Card className="p-6 border border-slate-200 bg-white space-y-4 max-w-xl">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {isBn ? 'ব্যবসায়িক তথ্য' : 'Business Information'}
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Legal Business Name</span>
                    <span className="font-bold text-slate-800">{store.businessName}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Verification Status</span>
                    <span className="font-bold text-emerald-600">{store.status}</span>
                  </div>
                  {store.supportEmail && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Support Email</span>
                      <span className="font-mono text-slate-800">{store.supportEmail}</span>
                    </div>
                  )}
                  {store.supportPhone && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Support Hotline</span>
                      <span className="font-mono text-slate-800">{store.supportPhone}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Merchant Storefront • Verified Seller Tenancy & Autonomous Catalog Discovery
        </div>
      </footer>
    </div>
  );
}
