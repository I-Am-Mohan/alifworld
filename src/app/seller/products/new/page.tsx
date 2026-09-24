import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ProductDraftEditor from './draft-editor';

export const dynamic = 'force-dynamic';

function LegacyNewProductPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-orange font-bold mb-1">
            <Link href="/seller" className="hover:underline">
              Merchant Network
            </Link>
            <span>/</span>
            <Link href="/seller/products" className="hover:underline">
              Catalog
            </Link>
            <span>/</span>
            <span>New Listing</span>
          </div>
          <h1 className="text-3xl font-black">Create Product Listing</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Publish products to AlifWorld with integer poisha pricing, independent Product Points, and taxonomy tagging.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/seller/products"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800 transition-colors"
          >
            ← Cancel & Return
          </Link>
          <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-lg">
            Save as Draft
          </Button>
        </div>
      </header>

      {/* Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information */}
          <Card className="border-neutral-800 bg-neutral-900/40">
            <CardHeader className="border-b border-neutral-800 pb-3">
              <CardTitle className="text-base font-bold text-white">General Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Product Title (English) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Walton Primo S8 Pro (8GB RAM / 128GB ROM)"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-white focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Product Title (বাংলা)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: ওয়ালটন প্রিমো এস৮ প্রো (৮জিবি র‍্যাম / ১২৮জিবি রম)"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-white focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  URL Slug (Auto-generated or custom) *
                </label>
                <div className="flex rounded-lg border border-neutral-700 bg-neutral-800 overflow-hidden text-xs">
                  <span className="px-3 py-2 bg-neutral-900 text-neutral-500 font-mono">
                    {(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/^https?:\/\//, '').replace(/\/$/, '')}/products/
                  </span>
                  <input
                    type="text"
                    placeholder="walton-primo-s8-pro"
                    className="flex-1 px-3 py-2 bg-transparent text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Full Description & Specifications (Markdown supported) *
                </label>
                <textarea
                  rows={5}
                  placeholder="Detailed product highlights, technical specs, and included accessories..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-white focus:outline-none focus:border-brand-orange"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Product Points */}
          <Card className="border-neutral-800 bg-neutral-900/40">
            <CardHeader className="border-b border-neutral-800 pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold text-white">Pricing & Rewards Strategy</CardTitle>
                <Badge variant="outline" className="border-brand-orange text-brand-orange text-[10px]">
                  Independent Value Invariant
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Selling Price (BDT) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-neutral-400 font-bold text-sm">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="21,990.00"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-white font-mono focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Stored internally in minor units: <span className="font-mono text-brand-orange">2199000 poisha</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Compare-at MSRP Price (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-neutral-400 font-bold text-sm">৳</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="24,990.00"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-white font-mono focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">Cross-out original price displayed to buyers.</p>
                </div>
              </div>

              {/* Product Points Box */}
              <div className="p-4 rounded-xl border border-brand-orange/30 bg-brand-orange/5">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🪙 Product Points Awarded to Buyer</span>
                  </label>
                  <span className="text-[10px] text-brand-orange font-bold uppercase">Points Invariant</span>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 450"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-white font-mono focus:outline-none focus:border-brand-orange"
                />
                <p className="text-[11px] text-neutral-400 mt-2">
                  <strong className="text-white">Note:</strong> Product price and Product Points are separate independent values. Do not infer a conversion rate. Points are credited to buyer wallets upon final delivery confirmation.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Product Media */}
          <Card className="border-neutral-800 bg-neutral-900/40">
            <CardHeader className="border-b border-neutral-800 pb-3">
              <CardTitle className="text-base font-bold text-white">Media Gallery</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="border-2 border-dashed border-neutral-700 rounded-xl p-6 text-center hover:border-brand-orange transition-colors cursor-pointer bg-neutral-900/20">
                <div className="w-10 h-10 rounded-full bg-neutral-800 text-brand-orange mx-auto flex items-center justify-center font-bold text-lg mb-2">
                  📷
                </div>
                <div className="text-sm font-semibold text-white">Upload Product Images</div>
                <p className="text-xs text-neutral-400 mt-1">
                  Drag and drop PNG, JPG, or WebP files (up to 10MB each). Permanent S3 upload.
                </p>
                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Or paste S3 / CDN image URL..."
                    className="w-full max-w-md mx-auto px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Settings Column */}
        <div className="space-y-6">
          {/* Classification */}
          <Card className="border-neutral-800 bg-neutral-900/40">
            <CardHeader className="border-b border-neutral-800 pb-3">
              <CardTitle className="text-sm font-bold text-white">Taxonomy & Category</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Category *</label>
                <select className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white focus:outline-none focus:border-brand-orange">
                  <option value="cat_phones">Smartphones & Tablets (5% NBR VAT)</option>
                  <option value="cat_audio">Audio & Headphones (15% NBR VAT)</option>
                  <option value="cat_fashion">Fashion & Lifestyle (7.5% NBR VAT)</option>
                  <option value="cat_groceries">Groceries & Daily Essentials (0% Exempt)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Brand *</label>
                <select className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white focus:outline-none focus:border-brand-orange">
                  <option value="brd_walton">Walton (Verified)</option>
                  <option value="brd_xiaomi">Xiaomi (Verified)</option>
                  <option value="brd_alif">Alif Official</option>
                  <option value="brd_samsung">Samsung (Verified)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Product Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="smartphone, walton, android, 4g"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* SKU & Inventory Details */}
          <Card className="border-neutral-800 bg-neutral-900/40">
            <CardHeader className="border-b border-neutral-800 pb-3">
              <CardTitle className="text-sm font-bold text-white">Identification & Stock</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Base SKU (Stock Keeping Unit)
                </label>
                <input
                  type="text"
                  placeholder="e.g. WALT-S8PRO"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Barcode / EAN / UPC</label>
                <input
                  type="text"
                  placeholder="8941234567890"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Estimated Weight (Grams)
                </label>
                <input
                  type="number"
                  placeholder="195"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Warranty Information</label>
                <input
                  type="text"
                  placeholder="1 Year Official Brand Warranty"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProductDraftEditor;
