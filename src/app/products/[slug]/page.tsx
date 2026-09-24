'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlifLogo } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('Midnight Black');
  const [selectedStorage, setSelectedStorage] = useState('8GB / 128GB');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'specs' | 'description' | 'reviews'>('specs');
  const [cartToast, setCartToast] = useState<string | null>(null);

  const product = {
    id: 'prd_walton_s8pro_01',
    title: 'Walton Primo S8 Pro Gaming Smartphone (8GB / 128GB)',
    titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো গেমিং স্মার্টফোন (৮জিবি র‍্যাম / ১২৮জিবি রম)',
    slug: params.slug || 'walton-primo-s8-pro',
    brand: 'Walton',
    category: 'Smartphones & Tablets',
    seller: {
      id: 'sel_dhaka_tech_01',
      name: 'Dhaka Tech Electronics',
      slug: 'dhaka-tech',
      isVerified: true,
      rating: '4.9 ★ (1,240 reviews)',
      location: 'Banani, Dhaka',
    },
    priceBdt: '৳21,990.00',
    compareAtPriceBdt: '৳24,990.00',
    discountPercent: '12% OFF',
    productPoints: 450,
    taxRatePercent: 5.0,
    sku: 'WALT-S8PRO-BLK-128',
    warranty: '1 Year Official Walton Warranty (Nationwide Service Centers)',
    description:
      'Flagship gaming and multimedia performance powered by the high-efficiency MediaTek Helio gaming processor. Equipped with an ultra-responsive 6.78-inch FHD+ 90Hz display, a versatile 64MP AI Quad-Camera matrix, and a long-lasting 5000mAh battery accompanied by a 33W super-fast charger in the box.',
    descriptionBn:
      'অক্টাকোর গেমিং প্রসেসর সমৃদ্ধ ওয়ালটন প্রিমো এস৮ প্রো। রয়েছে ৬.৭৮ ইঞ্চি ফুল এইচডি প্লাস ৯০ হার্জ ডিসপ্লে, ৬৪ মেগাপিক্সেল এআই কোয়াড ক্যামেরা এবং ৩৩ ওয়াট ফাস্ট চার্জিং সুবিধা।',
    colors: [
      { name: 'Midnight Black', hex: '#1E293B', inStock: true },
      { name: 'Ocean Blue', hex: '#0284C7', inStock: true },
      { name: 'Emerald Green', hex: '#059669', inStock: true },
    ],
    storages: ['6GB / 64GB', '8GB / 128GB'],
    media: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&h=800&fit=crop',
    ],
    specs: [
      { key: 'Display Screen', value: '6.78" FHD+ IPS LCD, 90Hz Refresh Rate, 500 nits' },
      { key: 'Processor / Chipset', value: 'MediaTek Helio G95 Octa-core Gaming Processor' },
      { key: 'RAM & Internal Storage', value: '8GB LPDDR4X RAM + 128GB UFS 2.1 Storage' },
      { key: 'Rear Camera System', value: '64MP Main (f/1.8) + 8MP Ultra-wide + 2MP Macro + 2MP Depth' },
      { key: 'Selfie Camera', value: '16MP AI Front Camera with Portrait Mode' },
      { key: 'Battery & Charging', value: '5000mAh Li-Po, 33W Type-C Fast Charger Included' },
      { key: 'Security & Sensors', value: 'Side-mounted Fingerprint Sensor, AI Face Unlock' },
      { key: 'Operating System', value: 'Android 12 (Clean Stock Experience, No Bloatware)' },
      { key: 'SIM & Connectivity', value: 'Dual 4G Nano-SIM + Dedicated MicroSD Slot up to 512GB' },
    ],
    reviews: [
      { user: 'Sabbir Ahmed', rating: 5, date: '18 September 2026', comment: 'Excellent performance and camera quality! Delivery arrived in Dhaka within 24 hours. Walton genuine warranty validated on arrival.' },
      { user: 'Tahmina Akter', rating: 5, date: '12 September 2026', comment: 'Smooth 90Hz screen and battery lasts well over a day on heavy usage. Received 450 Product Points directly in my balance!' },
      { user: 'Mahmudul Hasan', rating: 4, date: '04 September 2026', comment: 'Great budget gaming phone. The 33W charger in the box is very handy.' },
    ],
    relatedProducts: [
      {
        id: 'rel_xiaomi_earbuds',
        title: 'Xiaomi Redmi Buds 5 Pro Wireless ANC',
        price: '৳6,490.00',
        points: 120,
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80',
        slug: 'xiaomi-redmi-buds-5-pro',
      },
      {
        id: 'rel_fast_charger',
        title: 'Anker 65W GaN Dual-Port Fast Charger',
        price: '৳3,250.00',
        points: 65,
        imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80',
        slug: 'anker-65w-gan-charger',
      },
      {
        id: 'rel_walton_pad',
        title: 'Walton Walpad 10H Android Tablet (4GB/64GB)',
        price: '৳17,500.00',
        points: 350,
        imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=80',
        slug: 'walton-walpad-10h',
      },
    ]
  };

  const handleAddToCart = () => {
    setCartToast('This preview product is not available for checkout.');
    setTimeout(() => setCartToast(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 text-center font-medium">
        <span>🇧🇩 100% Authentic Nationwide Marketplace • Earn Loyalty Product Points with Every Delivery</span>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <AlifLogo size="md" />

          {/* Search bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <input
                type="search"
                placeholder="Search products, brands, essentials in Bangladesh..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00] transition-all"
              />
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/products" className="text-xs font-bold text-slate-600 hover:text-[#FF6A00] px-2 py-1">
              Browse Catalog
            </Link>
            <Link href="/seller">
              <Button variant="outline" size="sm" className="text-xs font-bold">
                Seller Center
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="secondary" size="sm" className="text-xs font-bold">
                Admin Console
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 flex-wrap">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-slate-900">Electronics &amp; Gadgets</Link>
          <span>/</span>
          <span className="text-slate-700 font-semibold">{product.category}</span>
          <span>/</span>
          <span className="text-[#FF6A00] font-bold truncate max-w-xs">{product.title}</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Cart Toast Notification */}
        {cartToast && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🛍️</span>
              <span>{cartToast}</span>
            </div>
            <Link href="/products" className="text-emerald-700 underline text-xs">
              Continue Shopping →
            </Link>
          </div>
        )}

        {/* Product Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Image Gallery (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-square rounded-2xl border border-slate-200 bg-white overflow-hidden relative group shadow-sm flex items-center justify-center p-4">
              <Image unoptimized width={800} height={800}
                src={product.media[selectedImageIndex]}
                alt={product.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <Badge variant="orange" className="absolute top-4 left-4 font-black text-xs shadow-sm">
                {product.discountPercent}
              </Badge>
              <Badge variant="blue" className="absolute top-4 right-4 font-bold text-xs shadow-sm">
                Official BD Model
              </Badge>
            </div>

            {/* Thumbnail selector */}
            <div className="flex space-x-3">
              {product.media.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 h-20 rounded-xl border bg-white overflow-hidden p-1 transition-all ${
                    selectedImageIndex === idx
                      ? 'border-[#FF6A00] ring-2 ring-[#FF6A00]/30 shadow-sm'
                      : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <Image unoptimized width={80} height={80} src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* Merchant Guarantee Card */}
            <Card className="bg-slate-50/70 border-slate-200/90 shadow-sm p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-bold text-[#FF6A00] shadow-sm">
                  DT
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>Sold by {product.seller.name}</span>
                    <Badge variant="green" size="sm">✓ Verified Merchant</Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {product.seller.rating} • {product.seller.location}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Details & Purchasing (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="blue" className="font-bold">
                  {product.brand}
                </Badge>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-mono font-medium">SKU: {product.sku}</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-amber-500 font-bold">★★★★★ 4.9 (1,240 reviews)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {product.title}
              </h1>
              <p className="text-sm text-slate-500 mt-1 font-medium">{product.titleBn}</p>
            </div>

            {/* Price & Loyalty Points Box */}
            <Card className="bg-white border-slate-200/90 shadow-sm p-5 space-y-4">
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                  {product.priceBdt}
                </span>
                <span className="text-base font-mono line-through text-slate-400">
                  {product.compareAtPriceBdt}
                </span>
                <Badge variant="orange" size="sm">
                  Save ৳3,000.00
                </Badge>
              </div>

              {/* Independent Product Points Loyalty Reward */}
              <div className="p-3.5 rounded-xl bg-orange-50/70 border border-[#FF6A00]/20 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🪙</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Earn <span className="text-[#FF6A00] font-black font-mono">{product.productPoints} Product Points</span> on Delivery
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Independent customer loyalty reward • Automatically credited to your wallet
                    </div>
                  </div>
                </div>
                <Badge variant="orange" size="sm">Points Engine</Badge>
              </div>

              <div className="text-xs text-slate-500 flex items-center space-x-2 pt-1">
                <span>✓ NBR Mushak-6.3 VAT Inclusive ({product.taxRatePercent}% ICT Concession)</span>
                <span>•</span>
                <span>Integer Poisha Precision</span>
              </div>
            </Card>

            {/* Color Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Color Option: <span className="text-slate-900 font-black">{selectedColor}</span>
              </label>
              <div className="flex space-x-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center space-x-2 transition-all ${
                      selectedColor === c.name
                        ? 'border-[#FF6A00] bg-orange-50 text-[#FF6A00] ring-1 ring-[#FF6A00]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                RAM / Storage Option: <span className="text-slate-900 font-black">{selectedStorage}</span>
              </label>
              <div className="flex space-x-2">
                {product.storages.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStorage(s)}
                    className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${
                      selectedStorage === s
                        ? 'border-[#0284C7] bg-sky-50 text-[#0284C7] ring-1 ring-[#0284C7]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity and Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 text-xs font-mono font-bold text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold text-sm"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-emerald-600 font-bold">
                  ✓ In Stock (Dhaka Hub Ready to Dispatch)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Primary Button: Vibrant Orange from logo arrow */}
                <Button
                  variant="primary"
                  onClick={handleAddToCart}
                  disabled
                  className="flex-1 py-3 text-sm font-black shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>🛍️</span>
                  <span>Add to Shopping Bag</span>
                </Button>

                {/* Secondary Button: Solid Clean Black */}
                <Button
                  variant="secondary"
                  onClick={handleAddToCart}
                  disabled
                  className="sm:w-44 py-3 text-sm font-black shadow-sm"
                >
                  ⚡ Buy Now
                </Button>

                <Button
                  variant="outline"
                  className="py-3 px-4 text-xs font-bold hover:bg-slate-50 text-slate-700"
                >
                  ♡ Wishlist
                </Button>
              </div>
            </div>

            {/* Trust and Delivery Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center space-x-3 shadow-sm">
                <span className="text-2xl">🚚</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Fast Nationwide Delivery</div>
                  <div className="text-[11px] text-slate-500">Dhaka: 24 hrs • Nationwide: 48-72 hrs</div>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center space-x-3 shadow-sm">
                <span className="text-2xl">🛡️</span>
                <div>
                  <div className="text-xs font-bold text-slate-900">Official Brand Warranty</div>
                  <div className="text-[11px] text-slate-500">1 Year Official Service Warranty</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabs Section */}
        <section className="mt-14 border-t border-slate-200 pt-8">
          <div className="flex items-center space-x-4 border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
                activeTab === 'specs'
                  ? 'border-[#FF6A00] text-[#FF6A00]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('description')}
              className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
                activeTab === 'description'
                  ? 'border-[#FF6A00] text-[#FF6A00]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Description &amp; Highlights
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 text-sm font-bold transition-colors border-b-2 ${
                activeTab === 'reviews'
                  ? 'border-[#FF6A00] text-[#FF6A00]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Customer Reviews ({product.reviews.length})
            </button>
          </div>

          {activeTab === 'specs' && (
            <Card className="bg-white border-slate-200/90 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 text-xs">
                {product.specs.map((spec, i) => (
                  <div
                    key={spec.key}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${
                      i % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'
                    }`}
                  >
                    <span className="font-bold text-slate-700 sm:w-1/3">{spec.key}</span>
                    <span className="text-slate-900 sm:w-2/3 font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'description' && (
            <Card className="bg-white border-slate-200/90 shadow-sm p-6 space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#FF6A00] mb-2">
                  Product Overview
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed">{product.description}</p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0284C7] mb-2">
                  বাংলা বিবরণ
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed">{product.descriptionBn}</p>
              </div>
            </Card>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {product.reviews.map((rev, i) => (
                <Card key={i} className="bg-white border-slate-200/90 shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                        {rev.user.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-slate-900">{rev.user}</span>
                      <Badge variant="green" size="sm">Verified Buyer</Badge>
                    </div>
                    <span className="text-xs text-slate-400">{rev.date}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-amber-500 text-xs my-2">
                    {'★'.repeat(rev.rating)}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recommended Accessories Section */}
        <section className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Frequently Bought Together</h2>
              <p className="text-xs text-slate-500">Complementary devices and certified accessories</p>
            </div>
            <Link href="/products" className="text-xs font-bold text-[#FF6A00] hover:underline">
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {product.relatedProducts.map((rel) => (
              <Card key={rel.id} className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="aspect-[4/3] bg-slate-50 p-4 flex items-center justify-center overflow-hidden">
                  <Image unoptimized width={320} height={240}
                    src={rel.imageUrl}
                    alt={rel.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-xs text-slate-900 line-clamp-2 min-h-[32px]">{rel.title}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 font-mono">{rel.price}</span>
                    <Badge variant="orange" size="sm">+{rel.points} pts</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 text-xs font-bold hover:border-[#FF6A00] hover:text-[#FF6A00]"
                  >
                    Add Accessory
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
            <div>
              <AlifLogo size="sm" className="mb-3" />
              <p className="text-slate-500 leading-relaxed">
                Bangladesh&apos;s trusted marketplace. Pure authentic products, integer poisha precision, and statutory NBR compliance.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-3">Customer Service</h4>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/help" className="hover:text-slate-900">Help Center &amp; FAQs</Link></li>
                <li><Link href="/returns" className="hover:text-slate-900">Returns &amp; Replacement</Link></li>
                <li><Link href="/contact" className="hover:text-slate-900">24/7 Hotline Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-3">Seller Ecosystem</h4>
              <ul className="space-y-2 text-slate-600">
                <li><Link href="/seller" className="hover:text-slate-900">Become an Alif Merchant</Link></li>
                <li><Link href="/seller/kyc" className="hover:text-slate-900">Merchant KYC Guidelines</Link></li>
                <li><Link href="/seller/inventory" className="hover:text-slate-900">Fulfillment by Alif (FBA)</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-3">Accepted Payment Methods</h4>
              <div className="flex flex-wrap gap-2 text-slate-500 font-mono text-[11px]">
                <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">bKash</span>
                <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">Nagad</span>
                <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">Visa / MC</span>
                <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">Cash on Delivery</span>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            © 2026 AlifWorld. All rights reserved. Dhaka, Bangladesh.
          </div>
        </div>
      </footer>
    </div>
  );
}
