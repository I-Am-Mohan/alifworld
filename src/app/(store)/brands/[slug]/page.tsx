'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandLandingResult } from '@/features/catalog/services/discovery-landing.service';

export default function BrandLandingPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'walton';

  const [landingData, setLandingData] = useState<BrandLandingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [sortBy, setSortBy] = useState<string>('relevance');

  useEffect(() => {
    fetch(`/api/v1/catalog/landing/brand/${slug}?sortBy=${sortBy}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setLandingData(body.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load brand landing data:', err);
      })
      .finally(() => setLoading(false));
  }, [slug, sortBy]);

  const isBn = locale === 'bn-BD';

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
                {isBn ? 'ব্র্যান্ড ফ্ল্যাগশিপ' : 'Brand Flagship Store'}
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {landingData?.brand.name || slug}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Brand Hero Showcase */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-neutral-900 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center space-x-2">
              <Badge className="bg-[#FF6A00] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 border-none">
                {isBn ? 'অফিসিয়াল ফ্ল্যাগশিপ' : 'Official Flagship'}
              </Badge>
              {landingData?.brand.isVerified && (
                <Badge className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-none flex items-center gap-1">
                  <span>✓</span>
                  <span>{isBn ? 'যাচাইকৃত ব্র্যান্ড' : 'Verified Brand'}</span>
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              {landingData?.brand.name || slug}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {isBn
                ? 'অনুমোদিত ব্র্যান্ড ও সেলার থেকে সরাসরি সংগৃহীত ১০০% আসল পণ্য এবং ওয়ারেন্টি সুবিধা।'
                : 'Official manufacturer warranty and genuine verified products delivered nationwide.'}
            </p>

            {landingData?.brand.website && (
              <div className="pt-1">
                <a
                  href={landingData.brand.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-400 hover:underline font-mono"
                >
                  ↗ {landingData.brand.website}
                </a>
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl text-center shrink-0 border border-white/10">
            <div className="text-3xl font-black text-amber-400">
              {landingData?.totalHits || 0}
            </div>
            <div className="text-[11px] text-slate-300 uppercase font-bold tracking-wider mt-1">
              {isBn ? 'উপলব্ধ পণ্য' : 'Available Products'}
            </div>
          </div>
        </div>

        {/* Filter & Sort Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">{isBn ? 'ক্যাটাগরি:' : 'Category:'}</span>
            {landingData?.facets?.categories &&
              Object.keys(landingData.facets.categories).map((catName) => (
                <Badge key={catName} className="bg-white border border-slate-200 text-slate-700 text-xs">
                  {catName} ({landingData.facets?.categories[catName]})
                </Badge>
              ))}
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
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            Loading products for {slug}...
          </div>
        ) : !landingData?.products || landingData.products.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <span className="text-3xl">🏷️</span>
            <h3 className="text-sm font-black text-slate-900">
              {isBn ? 'এই ব্র্যান্ডের কোনো পণ্য নেই' : 'No products available for this brand'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn ? 'অন্যান্য ব্র্যান্ড অন্বেষণ করুন।' : 'Check back later for updated releases.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {landingData.products.map((product) => {
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
                        {product.categoryName}
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

                    <Button
                      disabled={!product.inStock}
                      className={`text-xs font-bold ${
                        product.inStock
                          ? 'bg-[#FF6A00] hover:bg-[#E55F00] text-white shadow-xs'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isBn ? 'কার্ট' : 'Add to Cart'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Brand Flagship • Verified Manufacturers & Genuine Warranties
        </div>
      </footer>
    </div>
  );
}
