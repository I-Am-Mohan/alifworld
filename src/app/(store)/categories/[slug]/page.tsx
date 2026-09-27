'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryLandingResult } from '@/features/catalog/services/discovery-landing.service';

export default function CategoryLandingPage() {
  const params = useParams();
  const slug = (params?.slug as string) || 'smartphones';

  const [landingData, setLandingData] = useState<CategoryLandingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('relevance');

  useEffect(() => {
    fetch(`/api/v1/catalog/landing/category/${slug}?sortBy=${sortBy}${selectedBrand ? `&brand=${selectedBrand}` : ''}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setLandingData(body.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load category landing data:', err);
      })
      .finally(() => setLoading(false));
  }, [slug, sortBy, selectedBrand]);

  const isBn = locale === 'bn-BD';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-black">
                {isBn ? 'ক্যাটাগরি হাব' : 'Category Hub'}
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {landingData?.category.name || slug}
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
              href="/search"
              className="px-3.5 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs"
            >
              {isBn ? 'সার্চ ক্যাটালগ' : 'Search Catalog'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Breadcrumb Hierarchy */}
        {landingData?.breadcrumbs && (
          <nav aria-label="Breadcrumbs" className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
            {landingData.breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href || idx}>
                {idx > 0 && <span>/</span>}
                <Link
                  href={crumb.href || '/'}
                  className={idx === landingData.breadcrumbs.length - 1 ? 'font-bold text-slate-900' : 'hover:underline'}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Category Hero Banner */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 max-w-xl">
            <Badge className="bg-[#FF6A00] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-none">
              {isBn ? 'অফিসিয়াল ডিপার্টমেন্ট' : 'Official Department'}
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              {isBn && landingData?.category.nameBn ? landingData.category.nameBn : landingData?.category.name || slug}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {landingData?.category.description || 'Explore authentic verified products with doorstep delivery across Bangladesh.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-center shrink-0 border border-white/10">
            <div className="text-2xl font-black text-amber-400">
              {landingData?.totalHits || 0}
            </div>
            <div className="text-[11px] text-slate-300 uppercase font-bold tracking-wider">
              {isBn ? 'পণ্য উপলভ্য' : 'Products Available'}
            </div>
          </div>
        </div>

        {/* Subcategories Pills */}
        {landingData?.subcategories && landingData.subcategories.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isBn ? 'উপ-ক্যাটাগরি' : 'Subcategories'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {landingData.subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/categories/${sub.slug}`}
                  className="px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-[#FF6A00] text-xs font-semibold text-slate-700 hover:text-[#FF6A00] transition-colors shadow-xs"
                >
                  {isBn && sub.nameBn ? sub.nameBn : sub.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Catalog Grid with Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200">
          {/* Brand Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-600">{isBn ? 'ব্র্যান্ড:' : 'Brand:'}</span>
            <button
              onClick={() => setSelectedBrand(null)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedBrand === null ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {landingData?.facets?.brands &&
              Object.keys(landingData.facets.brands).map((brandName) => (
                <button
                  key={brandName}
                  onClick={() => setSelectedBrand(selectedBrand === brandName ? null : brandName)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    selectedBrand === brandName ? 'bg-[#FF6A00] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {brandName} ({landingData.facets?.brands[brandName]})
                </button>
              ))}
          </div>

          {/* Sort Selection */}
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
            <span className="text-3xl">📦</span>
            <h3 className="text-sm font-black text-slate-900">
              {isBn ? 'এই ক্যাটাগরিতে কোনো পণ্য নেই' : 'No products available in this category'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn ? 'অন্যান্য ক্যাটাগর��� অনুসন্ধান করুন।' : 'Check back soon or explore other departments.'}
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
          AlifWorld Category Discovery �� Fast Localized Catalog Browsing
        </div>
      </footer>
    </div>
  );
}
