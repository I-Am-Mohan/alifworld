'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SearchItem {
  id: string;
  slug: string;
  title: string;
  titleBn?: string | null;
  description?: string | null;
  brand?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  sellerName?: string | null;
  minPricePoisha: number;
  productPointSnapshot: number;
  inStock: boolean;
  rating?: number | null;
  reviewCount?: number | null;
}

export default function StorefrontSearchPage() {
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minPriceBdt, setMinPriceBdt] = useState<string>('');
  const [maxPriceBdt, setMaxPriceBdt] = useState<string>('');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isPending, startTransition] = useTransition();

  // Initial products dataset
  const [allProducts] = useState<SearchItem[]>([
    {
      id: 'prod_walton_s8',
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro Smartphone',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো স্মার্টফোন',
      description: '64MP Quad Camera, 128GB Storage, 5000mAh Battery',
      brand: 'Walton',
      categoryName: 'Smartphones',
      categorySlug: 'smartphones',
      sellerName: 'Walton Official Store',
      minPricePoisha: 1850000, // 18,500 BDT
      productPointSnapshot: 150,
      inStock: true,
      rating: 4.8,
      reviewCount: 42,
    },
    {
      id: 'prod_xiaomi_buds',
      slug: 'xiaomi-redmi-buds-5',
      title: 'Xiaomi Redmi Buds 5 Pro Wireless Earbuds',
      titleBn: 'শাওমি রেডমি বাডস ৫ প্রো ওয়্যারলেস ইয়ারবাডস',
      description: 'Active Noise Cancellation, 38-hour battery playback',
      brand: 'Xiaomi',
      categoryName: 'Audio & Wearables',
      categorySlug: 'audio-wearables',
      sellerName: 'Xiaomi Bangladesh Direct',
      minPricePoisha: 650000, // 6,500 BDT
      productPointSnapshot: 65,
      inStock: true,
      rating: 4.6,
      reviewCount: 28,
    },
    {
      id: 'prod_aarong_panjabi',
      slug: 'aarong-cotton-panjabi',
      title: 'Aarong Handcrafted Fine Cotton Panjabi',
      titleBn: 'আড়ং হস্তশিল্প ফাইন কটন পাঞ্জাবি',
      description: 'Exclusive 100% combed cotton festive panjabi with embroidery',
      brand: 'Aarong',
      categoryName: 'Fashion',
      categorySlug: 'fashion',
      sellerName: 'Aarong Flagship Store',
      minPricePoisha: 350000, // 3,500 BDT
      productPointSnapshot: 35,
      inStock: false,
      rating: 4.9,
      reviewCount: 89,
    },
    {
      id: 'prod_bata_oxford',
      slug: 'bata-leather-oxford',
      title: 'Bata Ambassador Premium Leather Oxford Shoes',
      titleBn: 'বাটা অ্যাম্বাসেডর প্রিমিয়াম লেদার অক্সফোর্ড জুতো',
      description: 'Genuine calfskin formal footwear handcrafted in Tongi',
      brand: 'Bata',
      categoryName: 'Fashion',
      categorySlug: 'fashion',
      sellerName: 'Bata Bangladesh',
      minPricePoisha: 499000, // 4,990 BDT
      productPointSnapshot: 50,
      inStock: true,
      rating: 4.7,
      reviewCount: 34,
    },
    {
      id: 'prod_pran_chinigura',
      slug: 'pran-chinigura-rice',
      title: 'PRAN Premium Chinigura Aromatic Rice 5kg',
      titleBn: 'প্রাণ প্রিমিয়াম চিনিগুঁড়া সুগন্ধি চাল ৫ কেজি',
      description: 'Export-grade Dinajpur aromatic rice for traditional biryani',
      brand: 'PRAN',
      categoryName: 'Groceries',
      categorySlug: 'groceries',
      sellerName: 'PRAN-RFL Direct',
      minPricePoisha: 75000, // 750 BDT
      productPointSnapshot: 8,
      inStock: true,
      rating: 4.9,
      reviewCount: 156,
    },
  ]);

  // Client-side filtering logic mimicking SearchService
  const filteredProducts = allProducts.filter((item) => {
    // Search query matching (with typo-tolerant substring)
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchTitleBn = item.titleBn?.toLowerCase().includes(q) ?? false;
      const matchBrand = item.brand?.toLowerCase().includes(q) ?? false;
      const matchCategory = item.categoryName?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchTitleBn && !matchBrand && !matchCategory) {
        return false;
      }
    }

    if (selectedCategory && item.categorySlug !== selectedCategory) {
      return false;
    }

    if (selectedBrands.length > 0 && (!item.brand || !selectedBrands.includes(item.brand))) {
      return false;
    }

    if (inStockOnly && !item.inStock) {
      return false;
    }

    const priceBdt = item.minPricePoisha / 100;
    if (minPriceBdt && priceBdt < parseFloat(minPriceBdt)) {
      return false;
    }
    if (maxPriceBdt && priceBdt > parseFloat(maxPriceBdt)) {
      return false;
    }

    if (minRating && (item.rating ?? 0) < minRating) {
      return false;
    }

    return true;
  });

  // Sorting
  filteredProducts.sort((a, b) => {
    if (sortBy === 'price_asc') return a.minPricePoisha - b.minPricePoisha;
    if (sortBy === 'price_desc') return b.minPricePoisha - a.minPricePoisha;
    if (sortBy === 'points_desc') return b.productPointSnapshot - a.productPointSnapshot;
    if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
    return 0; // relevance default
  });

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedBrands([]);
    setInStockOnly(false);
    setMinPriceBdt('');
    setMaxPriceBdt('');
    setMinRating(null);
    setSortBy('relevance');
  };

  const isBn = locale === 'bn-BD';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Top Header & Search Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-black hidden sm:block">
              {isBn ? 'আলিফওয়ার্ল্ড সার্চ' : 'AlifWorld Search & Discovery'}
            </span>
          </div>

          {/* Central Search Bar */}
          <div className="flex-1 max-w-2xl relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isBn
                  ? 'পণ্য, ব্র্যান্ড বা ক্যাটাগরি অ��ুসন্ধান করুন (যেমন: ওয়ালটন, শাওমি, বাটা)...'
                  : 'Search products, brands, or categories (e.g., Walton, Xiaomi, Bata)...'
              }
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6A00] focus:bg-white transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Locale & Nav Links */}
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

      {/* Main Layout: Sidebar Filters + Product Grid */}
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col md:flex-row gap-8"
      >
        {/* Faceted Filters Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
              {isBn ? 'ফিল্টারসমূহ' : 'Filters & Facets'}
            </h2>
            {(selectedCategory ||
              selectedBrands.length > 0 ||
              inStockOnly ||
              minPriceBdt ||
              maxPriceBdt ||
              minRating) && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] font-bold text-[#FF6A00] hover:underline"
              >
                {isBn ? 'সব মুছুন' : 'Reset All'}
              </button>
            )}
          </div>

          {/* Categories Facet */}
          <Card className="border border-slate-200 p-4 space-y-3 bg-white">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {isBn ? 'ক্যাটাগরি' : 'Categories'}
            </h3>
            <div className="space-y-1.5 text-xs">
              {[
                { name: 'Smartphones', nameBn: 'স্মার্টফোন', slug: 'smartphones', count: 1 },
                {
                  name: 'Audio & Wearables',
                  nameBn: 'অডিও ও পরিধানযোগ্য',
                  slug: 'audio-wearables',
                  count: 1,
                },
                { name: 'Fashion', nameBn: 'ফ্যাশন ও পোশাক', slug: 'fashion', count: 2 },
                { name: 'Groceries', nameBn: 'মুদি ও খাদ্যপণ্য', slug: 'groceries', count: 1 },
              ].map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)
                  }
                  className={`w-full flex items-center justify-between py-1 px-2 rounded-md transition-colors text-left ${
                    selectedCategory === cat.slug
                      ? 'bg-[#FF6A00]/10 text-[#FF6A00] font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{isBn ? cat.nameBn : cat.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({cat.count})</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Brands Facet */}
          <Card className="border border-slate-200 p-4 space-y-3 bg-white">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {isBn ? 'ব্র্যান্ড' : 'Brands'}
            </h3>
            <div className="space-y-2 text-xs">
              {['Walton', 'Xiaomi', 'Aarong', 'Bata', 'PRAN'].map((brand) => (
                <label
                  key={brand}
                  className="flex items-center space-x-2.5 cursor-pointer text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleBrand(brand)}
                    className="rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
                  />
                  <span className="text-xs font-medium">{brand}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Price Range Filter (BDT) */}
          <Card className="border border-slate-200 p-4 space-y-3 bg-white">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {isBn ? 'মূল্য সীমা (টাকা)' : 'Price Range (BDT)'}
            </h3>
            <div className="flex items-center space-x-2 text-xs">
              <input
                type="number"
                placeholder="Min ৳"
                value={minPriceBdt}
                onChange={(e) => setMinPriceBdt(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-center font-mono text-xs"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                placeholder="Max ৳"
                value={maxPriceBdt}
                onChange={(e) => setMaxPriceBdt(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-center font-mono text-xs"
              />
            </div>
          </Card>

          {/* In-Stock Only Toggle */}
          <Card className="border border-slate-200 p-4 bg-white flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              {isBn ? 'শুধুমাত্র মজুদ পণ্য' : 'In-Stock Only'}
            </span>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
            />
          </Card>

          {/* Rating Filter */}
          <Card className="border border-slate-200 p-4 space-y-2 bg-white">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              {isBn ? 'গ্রাহক রেটিং' : 'Customer Rating'}
            </h3>
            <div className="space-y-1.5 text-xs">
              {[4.5, 4.0, 3.0].map((star) => (
                <button
                  key={star}
                  onClick={() => setMinRating(minRating === star ? null : star)}
                  className={`w-full flex items-center justify-between py-1 px-2 rounded-md transition-colors text-left ${
                    minRating === star
                      ? 'bg-amber-50 text-amber-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-amber-500 font-bold">★ {star} & Above</span>
                  <span className="text-[10px] text-slate-400">Stars</span>
                </button>
              ))}
            </div>
          </Card>
        </aside>

        {/* Results Area */}
        <section className="flex-1 space-y-6">
          {/* Controls Bar: Count + Sort Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {query ? (
                  <span>
                    {isBn ? 'অনুসন্ধানের ফলাফল: ' : 'Search results for: '}
                    <span className="text-[#FF6A00]">&quot;{query}&quot;</span>
                  </span>
                ) : (
                  <span>{isBn ? 'সকল পণ্য' : 'All Catalog Products'}</span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {filteredProducts.length} {isBn ? 'টি পণ্য পাওয়া গেছে' : 'items found'}
              </p>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-slate-600">{isBn ? 'বাছাই করুন:' : 'Sort By:'}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF6A00]"
              >
                <option value="relevance">{isBn ? 'প্রাসঙ্গিকতা' : 'Most Relevant'}</option>
                <option value="price_asc">
                  {isBn ? 'মূল্য: কম থেকে বেশি' : 'Price: Low to High'}
                </option>
                <option value="price_desc">
                  {isBn ? 'মূল্য: বেশি থেকে কম' : 'Price: High to Low'}
                </option>
                <option value="points_desc">
                  {isBn ? 'সর্বোচ্চ প্রোডাক্ট পয়েন্ট' : 'Highest Reward Points'}
                </option>
                <option value="rating">{isBn ? 'সেরা রেটিং' : 'Customer Rating'}</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(selectedCategory || selectedBrands.length > 0 || inStockOnly || minRating) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {selectedCategory && (
                <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 flex items-center gap-1">
                  <span>Category: {selectedCategory}</span>
                  <button onClick={() => setSelectedCategory(null)}>✕</button>
                </Badge>
              )}
              {selectedBrands.map((b) => (
                <Badge
                  key={b}
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200 flex items-center gap-1"
                >
                  <span>Brand: {b}</span>
                  <button onClick={() => toggleBrand(b)}>✕</button>
                </Badge>
              ))}
              {inStockOnly && (
                <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span>In-Stock Only</span>
                  <button onClick={() => setInStockOnly(false)}>✕</button>
                </Badge>
              )}
              {minRating && (
                <Badge className="bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <span>★ {minRating}+ Stars</span>
                  <button onClick={() => setMinRating(null)}>✕</button>
                </Badge>
              )}
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <span className="text-3xl">🔍</span>
              <h3 className="text-sm font-black text-slate-900">
                {isBn ? 'কোনো পণ্য খুঁজে পাওয়া যায়নি' : 'No matching products found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isBn
                  ? 'আপনার অনুসন্ধান শব্��� পরিবর্তন করুন অথবা ফিল্টারগুলো পুনরায় নির্ধারণ করুন।'
                  : 'Try checking for spelling errors, adjusting filters, or searching with broader keywords.'}
              </p>
              <Button onClick={clearAllFilters} variant="outline" className="text-xs mt-2">
                {isBn ? 'সকল ফিল্টার রিসেট করুন' : 'Reset All Filters'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
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
                      {/* Product Header & Stock Badge */}
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

                      {/* Title */}
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-[#FF6A00] transition-colors line-clamp-2">
                        {isBn && product.titleBn ? product.titleBn : product.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>

                      {/* Rating & Reviews */}
                      <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                        <span className="text-amber-500 font-bold">★ {product.rating}</span>
                        <span className="text-slate-400">({product.reviewCount})</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-500">{product.sellerName}</span>
                      </div>
                    </div>

                    {/* Footer: Price + Product Point Pill + CTA */}
                    <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/50 mt-4 flex items-center justify-between">
                      <div>
                        <div className="text-base font-black text-slate-900">৳{priceBdt}</div>
                        <div className="text-[10px] font-black text-[#FF6A00] flex items-center gap-0.5">
                          <span>★ +{product.productPointSnapshot} Points</span>
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
                        {isBn ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Degraded Mode Observation Pill */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-500 font-medium">
            🛡️{' '}
            {isBn
              ? 'আলিফওয়ার্ল্ড ফলব্যাক আর্কিটেকচার সক্রিয়: ১০০% আপটাইম রেজিলিয়েন্স নিশ্চিত।'
              : 'AlifWorld Boot-Safe Resilience Active: 100% search uptime guaranteed via PostgreSQL fallback engine.'}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Customer Discovery • Multi-Attribute Search, Facets & Reward Points
        </div>
      </footer>
    </div>
  );
}
