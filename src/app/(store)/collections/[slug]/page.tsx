'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CollectionLandingResult } from '@/features/catalog/services/discovery-landing.service';

export default function CollectionLandingPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'eid-surge-2026';

  const [landingData, setLandingData] = useState<CollectionLandingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');

  useEffect(() => {
    fetch(`/api/v1/catalog/landing/collection/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setLandingData(body.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load collection landing data:', err);
      })
      .finally(() => setLoading(false));
  }, [slug]);

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
                {isBn ? 'বিশেষ কালেকশন' : 'Special Collection'}
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {landingData?.collection.name || slug}
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
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6"
      >
        {/* Collection Hero Showcase */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center space-x-2">
              <Badge className="bg-[#FF6A00] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 border-none">
                {landingData?.collection.collectionType || 'CURATED'}
              </Badge>
              <Badge className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-none">
                Active Promotion
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              {landingData?.collection.name || slug}
            </h1>

            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed font-normal">
              {landingData?.collection.description ||
                'Exclusive curated catalog showcase offering verified quality and bonus rewards.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl text-center shrink-0 border border-white/10">
            <div className="text-3xl font-black text-amber-300">{landingData?.totalCount || 0}</div>
            <div className="text-[11px] text-amber-200 uppercase font-bold tracking-wider mt-1">
              {isBn ? 'বাছাইকৃত পণ্য' : 'Curated Items'}
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 font-medium">
            Loading collection products for {slug}...
          </div>
        ) : !landingData?.products || landingData.products.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <span className="text-3xl">✨</span>
            <h3 className="text-sm font-black text-slate-900">
              {isBn ? 'এই কালেকশনে কোনো পণ্য নেই' : 'No items currently in this collection'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'শীঘ্রই নতুন পণ্য যোগ করা হবে।'
                : 'Check back soon for upcoming campaign launches.'}
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
                        {product.brand}
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
          AlifWorld Curated Collections • Campaign Promotions & Verified Merchandising
        </div>
      </footer>
    </div>
  );
}
