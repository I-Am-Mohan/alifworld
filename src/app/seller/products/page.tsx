import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function SellerProductsPage() {
  const products = [
    {
      id: 'prd_walton_s8pro_01',
      title: 'Walton Primo S8 Pro (8GB / 128GB)',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো',
      slug: 'walton-primo-s8-pro',
      category: 'Smartphones & Tablets',
      brand: 'Walton',
      sku: 'WALT-S8PRO',
      basePrice: '৳21,990.00',
      compareAtPrice: '৳24,990.00',
      productPoint: 450,
      variantsCount: 2,
      status: 'PUBLISHED',
      imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=100&h=100&fit=crop',
      updatedAt: '2026-09-22',
    },
    {
      id: 'prd_xiaomi_buds5p_02',
      title: 'Xiaomi Redmi Buds 5 Pro Wireless ANC',
      titleBn: 'শাওমি রেডমি বাডস ৫ প্রো',
      slug: 'xiaomi-redmi-buds-5-pro',
      category: 'Audio & Headphones',
      brand: 'Xiaomi',
      sku: 'MI-BUDS5P',
      basePrice: '৳6,490.00',
      compareAtPrice: '৳7,490.00',
      productPoint: 120,
      variantsCount: 1,
      status: 'PUBLISHED',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
      updatedAt: '2026-09-22',
    },
    {
      id: 'prd_smart_watch_03',
      title: 'Realme Watch 3 Pro AMOLED Display',
      titleBn: 'রিয়েলমি ওয়াচ ৩ প্রো',
      slug: 'realme-watch-3-pro',
      category: 'Wearables & Smartwatches',
      brand: 'Realme',
      sku: 'RLM-W3PRO',
      basePrice: '৳5,890.00',
      compareAtPrice: null,
      productPoint: 95,
      variantsCount: 1,
      status: 'DRAFT',
      imageUrl: null,
      updatedAt: '2026-09-22',
    },
  ];

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
            <span>Catalog & Inventory</span>
          </div>
          <h1 className="text-3xl font-black">Store Products & Variants</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your store catalog with BDT integer poisha pricing, discrete Product Points, and multi-SKU variants.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/seller"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800 transition-colors"
          >
            ← Back to Storefront
          </Link>
          <Link
            href="/seller/products/new"
            className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-lg inline-flex items-center gap-1.5"
          >
            <span>+ Add New Product</span>
          </Link>
        </div>
      </header>

      {/* Catalog Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-neutral-800 bg-neutral-900/40">
          <CardContent className="p-5">
            <div className="text-xs text-neutral-400 font-semibold">Active Published Listings</div>
            <div className="text-2xl font-black text-white mt-1">2 Products</div>
            <div className="text-xs text-emerald-400 mt-1">Visible on Storefront</div>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900/40">
          <CardContent className="p-5">
            <div className="text-xs text-neutral-400 font-semibold">Drafts In Progress</div>
            <div className="text-2xl font-black text-amber-400 mt-1">1 Draft</div>
            <div className="text-xs text-neutral-500 mt-1">Awaiting gallery images</div>
          </CardContent>
        </Card>
        <Card className="border-neutral-800 bg-neutral-900/40">
          <CardContent className="p-5">
            <div className="text-xs text-neutral-400 font-semibold">Total Product Points Assigned</div>
            <div className="text-2xl font-black text-brand-orange mt-1">665 Points</div>
            <div className="text-xs text-neutral-500 mt-1">Independent buyer rewards</div>
          </CardContent>
        </Card>
      </div>

      {/* Product Catalog Table */}
      <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur">
        <CardHeader className="pb-3 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-white">Product Inventory ({products.length})</CardTitle>
            <p className="text-xs text-neutral-400 mt-0.5">
              Filtered to merchant tenant <span className="font-mono text-brand-orange">sel_dhaka_tech_01</span>.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="search"
              placeholder="Search by title, SKU or brand..."
              className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white placeholder-neutral-500 w-60 focus:outline-none focus:border-brand-orange"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-900/60">
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400 font-bold text-xs">Product Details</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Category & Brand</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">BDT Price</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Product Points</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Variants</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Status</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="border-neutral-800 hover:bg-neutral-800/30">
                  <TableCell className="py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-neutral-500">No Img</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm hover:text-brand-orange transition-colors">
                          <Link href={`/products/${product.slug}`}>{product.title}</Link>
                        </div>
                        {product.titleBn && (
                          <div className="text-xs text-neutral-400">{product.titleBn}</div>
                        )}
                        <div className="text-[10px] font-mono text-neutral-500">SKU: {product.sku}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-white font-medium">{product.category}</div>
                    <div className="text-[11px] text-neutral-400">Brand: {product.brand}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-mono font-bold text-white">{product.basePrice}</div>
                    {product.compareAtPrice && (
                      <div className="text-[11px] font-mono line-through text-neutral-500">
                        {product.compareAtPrice}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-amber-950/60 text-brand-orange border border-brand-orange/30 text-xs font-mono font-bold">
                      🪙 {product.productPoint} Points
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-neutral-300">
                      {product.variantsCount} {product.variantsCount === 1 ? 'SKU' : 'SKUs'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.status === 'PUBLISHED' && (
                      <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                        PUBLISHED
                      </Badge>
                    )}
                    {product.status === 'DRAFT' && (
                      <Badge className="bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px]">
                        DRAFT
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white text-xs h-7 px-2.5"
                      >
                        Edit
                      </Button>
                      <Link
                        href={`/products/${product.slug}`}
                        target="_blank"
                        className="text-neutral-400 hover:text-white text-xs px-2 py-1 border border-neutral-800 rounded bg-neutral-900/60"
                      >
                        View
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
