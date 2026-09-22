import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface ProductDetailPageProps {
  params: {
    slug: string;
  };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  // Mock product data representing Walton Primo S8 Pro or fallback
  const product = {
    id: 'prd_walton_s8pro_01',
    title: 'Walton Primo S8 Pro (8GB RAM / 128GB ROM)',
    titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো (৮জিবি র‍্যাম / ১২৮জিবি রম)',
    slug: params.slug || 'walton-primo-s8-pro',
    brand: 'Walton',
    category: 'Smartphones & Tablets',
    seller: {
      id: 'sel_dhaka_tech_01',
      name: 'Dhaka Tech Electronics',
      slug: 'dhaka-tech',
      isVerified: true,
      rating: '4.9 ★ (1,240 reviews)',
    },
    priceBdt: '৳21,990.00',
    compareAtPriceBdt: '৳24,990.00',
    discountPercent: '12% OFF',
    productPoints: 450,
    taxRatePercent: 5.0,
    sku: 'WALT-S8PRO-BLK-128',
    warranty: '1 Year Official Walton Warranty',
    description:
      'Flagship performance powered by an octa-core Helio gaming processor. Features a 64MP AI Quad camera system, vivid FHD+ display, and a massive 5000mAh battery equipped with 33W super-fast charging.',
    descriptionBn:
      'অক্টাকোর শক্তিশালী প্রসেসর, ৬৪ মেগাপিক্সেল এআই ক্যামেরা এবং দ্রুত চার্জিং সুবিধা সমৃদ্ধ নির্ভরযোগ্য স্মার্টফোন।',
    variants: [
      { name: 'Midnight Black / 128GB', inStock: true },
      { name: 'Ocean Blue / 128GB', inStock: true },
    ],
    media: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop',
    ],
    specs: [
      { key: 'Display', value: '6.78" FHD+ IPS 90Hz' },
      { key: 'Processor', value: 'MediaTek Helio G95 Gaming SoC' },
      { key: 'Memory & Storage', value: '8GB LPDDR4X RAM + 128GB UFS 2.1' },
      { key: 'Rear Camera', value: '64MP Main + 8MP Wide + 2MP Macro + 2MP Depth' },
      { key: 'Battery & Charging', value: '5000mAh with 33W Fast Charger Included' },
      { key: 'Operating System', value: 'Android 12 (Clean Stock Experience)' },
    ],
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-black text-xl tracking-tight">
          <span className="text-white">ALIF</span>
          <span className="text-brand-orange">WORLD</span>
        </Link>
        <div className="flex items-center space-x-4 text-xs font-medium">
          <Link href="/seller" className="text-neutral-400 hover:text-white">
            Seller Center
          </Link>
          <Link href="/admin" className="text-neutral-400 hover:text-white">
            Admin Console
          </Link>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="border-b border-neutral-900 bg-neutral-950/60 px-6 py-2.5 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex items-center space-x-2">
          <Link href="/" className="hover:text-white">
            Home
          </Link>
          <span>/</span>
          <span className="hover:text-white cursor-pointer">Electronics &amp; Gadgets</span>
          <span>/</span>
          <span className="hover:text-white cursor-pointer">{product.category}</span>
          <span>/</span>
          <span className="text-neutral-200 truncate">{product.title}</span>
        </div>
      </nav>

      {/* Main Product Section */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Gallery Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-square rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden relative group flex items-center justify-center">
              <img
                src={product.media[0]}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <Badge className="absolute top-4 left-4 bg-brand-orange text-white font-bold text-xs shadow-lg">
                {product.discountPercent}
              </Badge>
            </div>

            <div className="flex space-x-3">
              {product.media.map((img, idx) => (
                <div
                  key={idx}
                  className={`w-20 h-20 rounded-xl border overflow-hidden cursor-pointer ${
                    idx === 0 ? 'border-brand-orange ring-1 ring-brand-orange' : 'border-neutral-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Details & Actions Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="outline" className="border-brand-globeLightBlue text-brand-globeLightBlue text-xs">
                  {product.brand}
                </Badge>
                <span className="text-neutral-600">•</span>
                <span className="text-xs text-neutral-400 font-mono">SKU: {product.sku}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {product.title}
              </h1>
              {product.titleBn && (
                <p className="text-sm text-neutral-400 mt-1 font-medium">{product.titleBn}</p>
              )}
            </div>

            {/* Merchant Identity Card */}
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/40 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-brand-orange">
                  DT
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Sold by {product.seller.name}</span>
                    <span className="text-emerald-400 text-[10px]">✓ Verified Merchant</span>
                  </div>
                  <div className="text-[11px] text-neutral-400">{product.seller.rating}</div>
                </div>
              </div>
              <Link
                href={`/stores/${product.seller.slug}`}
                className="text-xs text-brand-orange hover:underline font-semibold"
              >
                Visit Store →
              </Link>
            </div>

            {/* Pricing Box with Independent Product Points */}
            <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur space-y-3">
              <div className="flex items-baseline space-x-3">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                  {product.priceBdt}
                </span>
                {product.compareAtPriceBdt && (
                  <span className="text-base font-mono line-through text-neutral-500">
                    {product.compareAtPriceBdt}
                  </span>
                )}
              </div>

              {/* Independent Product Points Badge */}
              <div className="p-3 rounded-xl border border-brand-orange/40 bg-brand-orange/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🪙</span>
                  <div>
                    <div className="text-xs font-bold text-white">
                      Earn <span className="text-brand-orange font-mono font-black">{product.productPoints} Product Points</span> on Delivery
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Independent loyalty reward • Automatically credited upon completed order
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="border-brand-orange text-brand-orange text-[10px]">
                  Points Engine
                </Badge>
              </div>

              <div className="text-[11px] text-neutral-500 flex items-center space-x-2">
                <span>✓ NBR Mushak-6.3 VAT Inclusive ({product.taxRatePercent}% ICT Concession)</span>
                <span>•</span>
                <span>Integer Poisha Precision</span>
              </div>
            </div>

            {/* Variant Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                Select Option / Color
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v, i) => (
                  <button
                    key={v.name}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      i === 0
                        ? 'border-brand-orange bg-brand-orange/10 text-white shadow'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Order Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-base py-6 rounded-xl shadow-xl">
                Add to Shopping Bag
              </Button>
              <Button
                variant="outline"
                className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800 font-bold py-6 px-6 rounded-xl"
              >
                ♡ Save to Wishlist
              </Button>
            </div>

            {/* Delivery & Warranty Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-neutral-400">
              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center space-x-2.5">
                <span className="text-lg">🚚</span>
                <div>
                  <div className="font-semibold text-white">Fast Nationwide Delivery</div>
                  <div>1-2 days Dhaka, 3-5 days Nationwide</div>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center space-x-2.5">
                <span className="text-lg">🛡️</span>
                <div>
                  <div className="font-semibold text-white">Warranty &amp; Returns</div>
                  <div>{product.warranty}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications & Product Story */}
        <section className="mt-14 border-t border-neutral-800 pt-10">
          <h2 className="text-xl font-bold text-white mb-6">Technical Specifications &amp; Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-brand-orange uppercase tracking-wider mb-3">
                Product Highlights
              </h3>
              <p className="text-neutral-300 text-sm leading-relaxed mb-4">{product.description}</p>
              {product.descriptionBn && (
                <p className="text-neutral-400 text-sm leading-relaxed">{product.descriptionBn}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-brand-globeLightBlue uppercase tracking-wider mb-3">
                Hardware &amp; Parameters
              </h3>
              <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/30 overflow-hidden text-xs">
                {product.specs.map((spec) => (
                  <div key={spec.key} className="p-3 flex justify-between">
                    <span className="text-neutral-400">{spec.key}</span>
                    <span className="font-semibold text-white text-right">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
