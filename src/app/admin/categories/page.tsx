import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default function AdminCategoriesPage() {
  const stats = [
    { label: 'Total Categories', count: '48', meta: '8 Root / 40 Sub' },
    { label: 'Approved Brands', count: '132', meta: 'Trademark Verified' },
    { label: 'NBR Tax Profiles', count: '3 Tiers', meta: '15%, 5%, 0% Exempt' },
    { label: 'Active Catalog Items', count: '12,450', meta: 'Published across Bangladesh' },
  ];

  const categories = [
    {
      id: 'cat_electronics',
      name: 'Electronics & Gadgets',
      nameBn: 'ইলেকট্রনিক্স ও গ্যাজেটস',
      slug: 'electronics-gadgets',
      level: 'Root',
      taxRate: '5.00% (ICT Reduced)',
      subCount: 6,
      isActive: true,
    },
    {
      id: 'cat_smartphones',
      name: 'Smartphones & Tablets',
      nameBn: 'স্মার্টফোন ও ট্যাবলেট',
      slug: 'smartphones-tablets',
      level: 'Sub (Electronics & Gadgets)',
      taxRate: '5.00%',
      subCount: 4,
      isActive: true,
    },
    {
      id: 'cat_audio',
      name: 'Audio & Headphones',
      nameBn: 'অডিও ও হেডফোন',
      slug: 'audio-headphones',
      level: 'Sub (Electronics & Gadgets)',
      taxRate: '15.00% (Standard NBR)',
      subCount: 3,
      isActive: true,
    },
    {
      id: 'cat_fashion',
      name: 'Fashion & Lifestyle',
      nameBn: 'ফ্যাশন ও লাইফস্টাইল',
      slug: 'fashion-lifestyle',
      level: 'Root',
      taxRate: '7.50% (Apparel)',
      subCount: 12,
      isActive: true,
    },
    {
      id: 'cat_groceries',
      name: 'Groceries & Daily Essentials',
      nameBn: 'মুদি ও নিত্যপ্রয়োজনীয় সামগ্রী',
      slug: 'groceries-essentials',
      level: 'Root',
      taxRate: '0.00% (NBR Exempt)',
      subCount: 15,
      isActive: true,
    },
  ];

  const brands = [
    { name: 'Walton', slug: 'walton', products: '450 listings', status: 'VERIFIED' },
    { name: 'Xiaomi', slug: 'xiaomi', products: '680 listings', status: 'VERIFIED' },
    { name: 'Samsung', slug: 'samsung', products: '820 listings', status: 'VERIFIED' },
    { name: 'Alif Official', slug: 'alif-official', products: '120 listings', status: 'OFFICIAL' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs uppercase tracking-widest text-brand-orange font-bold mb-1">
            <Link href="/admin" className="hover:underline">
              Operations Console
            </Link>
            <span>/</span>
            <span>Taxonomy Governance</span>
          </div>
          <h1 className="text-3xl font-black">Catalog Taxonomy & Brand Authority</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage multi-level category hierarchies, NBR Mushak-6.3 VAT rate rules, and approved brand trademarks.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800 transition-colors"
          >
            ← Back to Admin
          </Link>
          <Button className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm px-4 py-2 rounded-lg shadow-lg">
            + New Category
          </Button>
        </div>
      </header>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-neutral-800 bg-neutral-900/40">
            <CardContent className="p-5">
              <div className="text-xs text-neutral-400 font-semibold">{stat.label}</div>
              <div className="text-2xl font-black text-white mt-1">{stat.count}</div>
              <div className="text-xs text-brand-orange mt-1">{stat.meta}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Hierarchy Section */}
      <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur mb-8">
        <CardHeader className="pb-3 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-white">Hierarchical Taxonomy Tree</CardTitle>
            <p className="text-xs text-neutral-400 mt-0.5">
              Standardized taxonomy applied across all storefront collections and merchant listing wizards.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="search"
              placeholder="Filter categories..."
              className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-xs text-white placeholder-neutral-500 w-56 focus:outline-none focus:border-brand-orange"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-900/60">
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400 font-bold text-xs">Category Name</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Hierarchy Level</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Slug</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">NBR VAT Rate</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Status</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} className="border-neutral-800 hover:bg-neutral-800/30">
                  <TableCell className="py-4">
                    <div>
                      <div className="font-bold text-white text-sm">{cat.name}</div>
                      <div className="text-xs text-neutral-400">{cat.nameBn}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-neutral-300">{cat.level}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-neutral-400">{cat.slug}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-neutral-800 text-brand-orange border border-neutral-700 text-[11px] font-mono">
                      {cat.taxRate}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      ACTIVE
                    </Badge>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-brand-orange hover:bg-brand-orange/10 text-xs h-7 px-2"
                      >
                        + Subcategory
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Brand Authority Registry */}
      <Card className="border-neutral-800 bg-neutral-900/40 backdrop-blur">
        <CardHeader className="pb-3 border-b border-neutral-800 flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-bold text-white">Approved Brand Registries</CardTitle>
            <p className="text-xs text-neutral-400 mt-0.5">
              Verified brands permitted for catalog classification and anti-counterfeit protection.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-neutral-700 bg-neutral-800 text-white text-xs"
          >
            + Register Brand
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-neutral-900/60">
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400 font-bold text-xs">Brand Name</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Slug</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Active Catalog Listings</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs">Trademark Verification</TableHead>
                <TableHead className="text-neutral-400 font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.slug} className="border-neutral-800 hover:bg-neutral-800/30">
                  <TableCell className="font-bold text-white text-sm py-4">{brand.name}</TableCell>
                  <TableCell className="font-mono text-xs text-neutral-400">{brand.slug}</TableCell>
                  <TableCell className="text-xs text-neutral-300">{brand.products}</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      {brand.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-neutral-700 bg-neutral-800 text-neutral-300 text-xs h-7 px-2.5"
                    >
                      Manage
                    </Button>
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
