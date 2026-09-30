'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ProductDetailResult,
  ProductVariantDetail,
} from '@/features/catalog/services/product-detail.service';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || 'walton-primo-s8';

  const [product, setProduct] = useState<ProductDetailResult | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantDetail | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'shipping'>(
    'description'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/catalog/products/${slug}?locale=${locale}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          if (body.data.isRedirect && body.data.targetUrl) {
            // Handle SEO historical slug redirect
            router.replace(body.data.targetUrl);
            return;
          }
          setProduct(body.data);
          if (body.data.variants && body.data.variants.length > 0) {
            setSelectedVariant(body.data.variants[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load product details:', err);
      })
      .finally(() => setLoading(false));
  }, [slug, locale, router]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isBn = locale === 'bn-BD';
  const displayTitle = isBn && product?.titleBn ? product.titleBn : product?.title;
  const displayDescription =
    isBn && product?.descriptionBn ? product.descriptionBn : product?.description;

  const currentPriceFormatted = selectedVariant
    ? selectedVariant.priceBdtFormatted
    : product?.basePriceBdtFormatted;

  const currentPoints = selectedVariant ? selectedVariant.productPoint : product?.productPoint || 0;

  const inStock = selectedVariant
    ? selectedVariant.inStock
    : product?.variants?.some((v) => v.inStock);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Schema.org JSON-LD SEO Metadata */}
      {product?.jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(product.jsonLd) }}
        />
      )}

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
            <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-black hidden sm:block">
              {isBn ? 'পণ্য বিবরণী' : 'Product Details'}
            </span>
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
              {isBn ? 'ক্যাটালগ' : 'Catalog'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main PDP Layout */}
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8"
      >
        {/* Breadcrumb Navigation */}
        {product?.breadcrumbs && (
          <nav
            aria-label="Breadcrumbs"
            className="flex items-center space-x-2 text-xs text-slate-500 font-medium"
          >
            {product.breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.href || idx}>
                {idx > 0 && <span>/</span>}
                <Link
                  href={crumb.href || '/'}
                  className={
                    idx === product.breadcrumbs.length - 1
                      ? 'font-bold text-slate-900'
                      : 'hover:underline'
                  }
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        )}

        {loading ? (
          <div className="p-20 text-center text-xs text-slate-500 font-medium">
            Loading localized product details...
          </div>
        ) : !product ? (
          <div className="p-20 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <span className="text-4xl">🔍</span>
            <h3 className="text-base font-black text-slate-900">
              {isBn ? 'পণ্যটি খুঁজে পাওয়া যায়নি' : 'Product Not Found'}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn
                ? 'পণ্যটি অপসারিত হতে পারে অ��বা লিংকটি সঠিক নয়।'
                : 'The requested product could not be located.'}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors mt-2"
            >
              {isBn ? 'ক্যাটালগে ফিরে যান' : 'Back to Search'}
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Top Product Hero: Media Gallery + Buying Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Left Column: Media Gallery */}
              <div className="space-y-4">
                <div className="w-full aspect-square rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-6 overflow-hidden shadow-xs relative">
                  <div className="text-center space-y-3">
                    <span className="text-6xl">📦</span>
                    <div className="text-xs font-mono text-slate-400">
                      {product.media[activeMediaIndex]?.altText || displayTitle}
                    </div>
                  </div>
                  {product.brand && (
                    <Badge className="absolute top-4 left-4 bg-slate-900 text-white text-[10px] font-bold">
                      {product.brand.name}
                    </Badge>
                  )}
                </div>

                {/* Thumbnails */}
                {product.media.length > 1 && (
                  <div className="flex space-x-3 overflow-x-auto pb-2">
                    {product.media.map((m, idx) => (
                      <button
                        key={m.id || idx}
                        onClick={() => setActiveMediaIndex(idx)}
                        className={`w-16 h-16 rounded-xl border-2 transition-all shrink-0 flex items-center justify-center bg-white text-xs ${
                          idx === activeMediaIndex
                            ? 'border-[#FF6A00] shadow-sm'
                            : 'border-slate-200 opacity-60'
                        }`}
                      >
                        📷 {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Title, Variant Selector, Pricing & CTA */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 text-xs">
                    {product.brand && (
                      <Link
                        href={`/brands/${product.brand.slug}`}
                        className="font-bold text-[#FF6A00] hover:underline uppercase tracking-wider"
                      >
                        {product.brand.name}
                      </Link>
                    )}
                    {product.brand?.isVerified && (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        ✓ Verified Partner
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 leading-tight">
                    {displayTitle}
                  </h1>

                  <div className="flex items-center space-x-2 mt-2 text-xs text-slate-500">
                    <span className="text-amber-500 font-bold">★ 4.8</span>
                    <span>(24 reviews)</span>
                    <span>•</span>
                    <Link href={`/categories/${product.category.slug}`} className="hover:underline">
                      {isBn && product.category.nameBn
                        ? product.category.nameBn
                        : product.category.name}
                    </Link>
                  </div>
                </div>

                {/* Pricing & Product Point Reward Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-baseline space-x-3">
                    <div className="text-3xl font-black text-slate-900">
                      ৳{currentPriceFormatted}
                    </div>
                    {product.compareAtPriceBdtFormatted && (
                      <div className="text-sm font-semibold text-slate-400 line-through">
                        ৳{product.compareAtPriceBdtFormatted}
                      </div>
                    )}
                  </div>

                  {/* Independent Product Point Badge (ADR-0001, ADR-0003) */}
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FF6A00]/10 border border-[#FF6A00]/30 text-[#FF6A00] text-xs font-black">
                    <span>★ +{currentPoints} Product Points</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (
                      {isBn
                        ? 'অর্ডার সমাপ্তির পর ওয়ালেটে জমা হবে'
                        : 'Credited upon order completion'}
                      )
                    </span>
                  </div>
                </div>

                {/* Variant Selection Matrix */}
                {product.variants.length > 1 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 uppercase tracking-wider">
                        {isBn ? 'ভেরিয়েন্ট নির্বাচন করুন:' : 'Select Variant / Configuration:'}
                      </span>
                      {selectedVariant && (
                        <span className="font-mono text-slate-500 text-[11px]">
                          SKU: {selectedVariant.sku}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => {
                        const isSelected = selectedVariant?.id === v.id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariant(v)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all text-left ${
                              isSelected
                                ? 'border-[#FF6A00] bg-[#FF6A00]/5 text-[#FF6A00] shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div>{v.title}</div>
                            <div className="text-[10px] font-mono opacity-80 mt-0.5">
                              ৳{v.priceBdtFormatted}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stock Availability Indicator */}
                <div className="flex items-center space-x-2 text-xs">
                  {inStock ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      ✓ {isBn ? 'স্টকে উপলব্ধ' : 'In Stock'}
                      {selectedVariant ? ` (${selectedVariant.availableQuantity} available)` : ''}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold">
                      ✕ {isBn ? 'স্টক শেষ' : 'Out of Stock'}
                    </Badge>
                  )}
                  {product.warranty && (
                    <span className="text-slate-500 font-medium">🛡️ {product.warranty}</span>
                  )}
                </div>

                {/* Quantity & CTA Buttons */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                      <button
                        onClick={() =>
                          setQuantity(Math.max(product.minOrderQuantity, quantity - 1))
                        }
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 text-xs font-black font-mono">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>

                    <Button
                      disabled={!inStock}
                      onClick={() =>
                        showToast(
                          `Added ${quantity}x ${selectedVariant?.title || displayTitle} to cart!`
                        )
                      }
                      className={`flex-1 py-3 text-xs font-bold ${
                        inStock
                          ? 'bg-[#FF6A00] hover:bg-[#E55F00] text-white shadow-sm'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isBn ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                    </Button>
                  </div>
                </div>

                {/* Merchant Card */}
                <Card className="p-4 border border-slate-200 bg-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Sold & Fulfilled by
                    </span>
                    <div className="font-bold text-xs text-slate-900">
                      {product.seller.storeName}
                    </div>
                  </div>
                  <Link
                    href={`/search?sellerId=${product.seller.id}`}
                    className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 rounded-md text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Visit Store
                  </Link>
                </Card>
              </div>
            </div>

            {/* Bottom Tabs: Description, Specs, Shipping */}
            <div className="border-t border-slate-200 pt-8 space-y-6">
              <div className="flex space-x-6 border-b border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeTab === 'description'
                      ? 'border-[#FF6A00] text-[#FF6A00]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isBn ? 'বিস্তারিত বর্ণনা' : 'Description & Overview'}
                </button>
                <button
                  onClick={() => setActiveTab('specifications')}
                  className={`pb-3 border-b-2 transition-colors ${
                    activeTab === 'specifications'
                      ? 'border-[#FF6A00] text-[#FF6A00]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isBn ? 'বৈশিষ্ট্য ও স্পেসিফিকেশন' : 'Specifications'}
                </button>
              </div>

              {activeTab === 'description' && (
                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-xs">
                  <p>{displayDescription}</p>
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Brand</span>
                    <span className="font-bold text-slate-800">
                      {product.brand?.name || 'Generic'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Category</span>
                    <span className="font-bold text-slate-800">{product.category.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Warranty</span>
                    <span className="font-bold text-slate-800">
                      {product.warranty || 'Standard Warranty'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Minimum Order Qty</span>
                    <span className="font-bold text-slate-800">
                      {product.minOrderQuantity} units
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Localized Storefront • Multi-Variant Selection, BDT Pricing & Verified
          Warranties
        </div>
      </footer>
    </div>
  );
}
