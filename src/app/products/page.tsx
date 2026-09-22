'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProductItem {
  id: string;
  title: string;
  titleBn: string;
  category: string;
  brand: string;
  price: string;
  priceValue: number;
  comparePrice?: string;
  points: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  seller: string;
  imageUrl: string;
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'points'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  const allProducts: ProductItem[] = [
    {
      id: 'prd_walton_s8pro_01',
      title: 'Walton Primo S8 Pro (8GB / 128GB)',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো',
      category: 'Smartphones',
      brand: 'Walton',
      price: '৳21,990.00',
      priceValue: 21990,
      comparePrice: '৳24,990.00',
      points: 450,
      rating: 4.8,
      reviews: 142,
      inStock: true,
      seller: 'Dhaka Tech Electronics',
      imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_xiaomi_buds5p_02',
      title: 'Xiaomi Redmi Buds 5 Pro Wireless ANC',
      titleBn: 'শাওমি রেডমি বাডস ৫ প্রো',
      category: 'Audio',
      brand: 'Xiaomi',
      price: '৳6,490.00',
      priceValue: 6490,
      comparePrice: '৳7,490.00',
      points: 120,
      rating: 4.9,
      reviews: 86,
      inStock: true,
      seller: 'Dhaka Tech Electronics',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_smart_watch_03',
      title: 'Realme Watch 3 Pro AMOLED Display',
      titleBn: 'রিয়েলমি ওয়াচ ৩ প্রো',
      category: 'Wearables',
      brand: 'Realme',
      price: '৳5,890.00',
      priceValue: 5890,
      comparePrice: '৳6,990.00',
      points: 95,
      rating: 4.7,
      reviews: 54,
      inStock: true,
      seller: 'Gadget Haven BD',
      imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_anker_charger_04',
      title: 'Anker 65W GaN Fast Charger 3-Port',
      titleBn: 'অ্যাঙ্কার ৬৫ ওয়াট ফাস্ট চার্জার',
      category: 'Accessories',
      brand: 'Anker',
      price: '৳3,450.00',
      priceValue: 3450,
      comparePrice: '৳3,950.00',
      points: 60,
      rating: 4.9,
      reviews: 210,
      inStock: true,
      seller: 'Anker Bangladesh Official',
      imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_samsung_galaxy_a54',
      title: 'Samsung Galaxy A54 5G Awesome Graphite',
      titleBn: 'স্যামসাং গ্যালাক্সি এ৫৪ ৫জি',
      category: 'Smartphones',
      brand: 'Samsung',
      price: '৳48,990.00',
      priceValue: 48990,
      comparePrice: '৳52,000.00',
      points: 800,
      rating: 4.8,
      reviews: 95,
      inStock: true,
      seller: 'Samsung Authorized BD',
      imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd_sony_wh1000xm5',
      title: 'Sony WH-1000XM5 Wireless Noise Cancelling',
      titleBn: 'সনি ডব্লিউএইচ-১০০০এক্সএম৫ হেডফোন',
      category: 'Audio',
      brand: 'Sony',
      price: '৳38,500.00',
      priceValue: 38500,
      comparePrice: '৳42,000.00',
      points: 650,
      rating: 5.0,
      reviews: 43,
      inStock: true,
      seller: 'AudioPhile Bangladesh',
      imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=80',
    },
  ];

  // Filtering logic
  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.titleBn.includes(searchQuery) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesBrand = selectedBrand === 'ALL' || p.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchesStock = !inStockOnly || p.inStock;

    return matchesSearch && matchesCategory && matchesBrand && matchesStock;
  });

  // Sorting
  filteredProducts.sort((a, b) => {
    if (sortBy === 'price-asc') return a.priceValue - b.priceValue;
    if (sortBy === 'price-desc') return b.priceValue - a.priceValue;
    if (sortBy === 'points') return b.points - a.points;
    return 0; // featured
  });

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-6">
          <AlifLogo size="md" href="/" />

          {/* Live Search */}
          <div className="flex-1 max-w-lg relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, Bangla, brand..."
              className="w-full bg-slate-50 border border-slate-300 rounded-full py-2 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6A00] focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/seller"
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
            >
              Seller Center
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar & Product Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Catalog</span>
          {selectedCategory !== 'ALL' && (
            <>
              <span>/</span>
              <span className="text-[#FF6A00] font-bold">{selectedCategory}</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar: Filters */}
          <aside className="lg:col-span-1 space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Categories</h3>
              <div className="space-y-2 text-xs">
                {['ALL', 'Smartphones', 'Audio', 'Wearables', 'Accessories'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-orange-50 text-[#EA580C] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Brands</h3>
              <div className="space-y-2 text-xs">
                {['ALL', 'Walton', 'Xiaomi', 'Realme', 'Samsung', 'Sony', 'Anker'].map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedBrand === brand
                        ? 'bg-sky-50 text-[#0284C7] font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {brand === 'ALL' ? 'All Brands' : brand}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Availability</h3>
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00]"
                />
                <span>In Stock Only</span>
              </label>
            </div>
          </aside>

          {/* Right Product Grid */}
          <div className="lg:col-span-3">
            {/* Header / Sort Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
              <div className="text-xs text-slate-600">
                Showing <strong className="text-slate-900">{filteredProducts.length}</strong> verified products
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-3 text-slate-800 focus:outline-none focus:border-[#FF6A00]"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="points">Product Points (Highest)</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500 text-sm">No products found matching your filters.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setSelectedBrand('ALL');
                    setInStockOnly(false);
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-black text-white text-xs font-bold hover:bg-neutral-800"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image with point badge */}
                      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 right-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FF6A00] text-white shadow">
                            +{product.points} PTS
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-700">{product.brand}</span>
                          <span>★ {product.rating} ({product.reviews})</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-2 group-hover:text-[#FF6A00] transition-colors">
                          {product.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{product.titleBn}</p>

                        <div className="mt-3 flex items-baseline space-x-2">
                          <span className="text-lg font-black text-slate-950">{product.price}</span>
                          {product.comparePrice && (
                            <span className="text-xs text-slate-400 line-through">{product.comparePrice}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#0284C7] font-medium mt-1">
                          Sold by: {product.seller}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <button
                        type="button"
                        className="w-full py-2 rounded-lg bg-black text-white hover:bg-[#FF6A00] text-xs font-bold transition-colors shadow-sm"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
