'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface CategoryItem {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  level: string;
  parentId?: string | null;
  taxRate: string;
  vatConcession: string;
  subCount: number;
  itemCount: number;
  isActive: boolean;
}

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  country: string;
  products: string;
  status: 'VERIFIED' | 'OFFICIAL' | 'PENDING';
  trademarkNumber: string;
}

export default function AdminCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'categories' | 'brands' | 'vat'>('categories');
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const stats = [
    { label: 'Root Categories', count: '8', meta: 'Primary storefront taxonomy', color: 'text-[#FF6A00]' },
    { label: 'Sub-Categories', count: '40', meta: 'Multi-level classification', color: 'text-[#0284C7]' },
    { label: 'Approved Brands', count: '132', meta: 'Trademark-verified registry', color: 'text-[#10B981]' },
    { label: 'Active Catalog Items', count: '12,450', meta: 'Nationwide published items', color: 'text-slate-900' },
  ];

  const [categories, setCategories] = useState<CategoryItem[]>([
    {
      id: 'cat_electronics',
      name: 'Electronics & Gadgets',
      nameBn: 'ইলেকট্রনিক্স ও গ্যাজেটস',
      slug: 'electronics-gadgets',
      level: 'Root',
      parentId: null,
      taxRate: '5.00%',
      vatConcession: 'ICT Concession',
      subCount: 6,
      itemCount: 4210,
      isActive: true,
    },
    {
      id: 'cat_smartphones',
      name: 'Smartphones & Tablets',
      nameBn: 'স্মার্টফোন ও ট্যাবলেট',
      slug: 'smartphones-tablets',
      level: 'Sub-category',
      parentId: 'Electronics & Gadgets',
      taxRate: '5.00%',
      vatConcession: 'ICT Concession',
      subCount: 4,
      itemCount: 1890,
      isActive: true,
    },
    {
      id: 'cat_audio',
      name: 'Audio & Headphones',
      nameBn: 'অডিও ও হেডফোন',
      slug: 'audio-headphones',
      level: 'Sub-category',
      parentId: 'Electronics & Gadgets',
      taxRate: '15.00%',
      vatConcession: 'Standard NBR Rate',
      subCount: 3,
      itemCount: 840,
      isActive: true,
    },
    {
      id: 'cat_fashion',
      name: 'Fashion & Lifestyle',
      nameBn: 'ফ্যাশন ও লাইফস্টাইল',
      slug: 'fashion-lifestyle',
      level: 'Root',
      parentId: null,
      taxRate: '7.50%',
      vatConcession: 'Apparel Concession',
      subCount: 12,
      itemCount: 3500,
      isActive: true,
    },
    {
      id: 'cat_groceries',
      name: 'Groceries & Daily Essentials',
      nameBn: 'মুদি ও নিত্যপ্রয়োজনীয় সামগ্রী',
      slug: 'groceries-essentials',
      level: 'Root',
      parentId: null,
      taxRate: '0.00%',
      vatConcession: 'NBR Mushak Exempt',
      subCount: 15,
      itemCount: 2810,
      isActive: true,
    },
  ]);

  const [brands, setBrands] = useState<BrandItem[]>([
    { id: 'b_walton', name: 'Walton', slug: 'walton', country: 'Bangladesh', products: '450 listings', status: 'VERIFIED', trademarkNumber: 'TM-BD-2018-9901' },
    { id: 'b_xiaomi', name: 'Xiaomi', slug: 'xiaomi', country: 'Global', products: '680 listings', status: 'VERIFIED', trademarkNumber: 'TM-INTL-44820-A' },
    { id: 'b_samsung', name: 'Samsung', slug: 'samsung', country: 'Global', products: '820 listings', status: 'VERIFIED', trademarkNumber: 'TM-INTL-11920-K' },
    { id: 'b_alif', name: 'Alif Official', slug: 'alif-official', country: 'Bangladesh', products: '120 listings', status: 'OFFICIAL', trademarkNumber: 'TM-BD-2026-0001' },
  ]);

  // Form states for new category
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameBn, setNewCatNameBn] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatTax, setNewCatTax] = useState('5.00%');
  const [newCatLevel, setNewCatLevel] = useState('Root');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatSlug.trim()) return;

    const newCat: CategoryItem = {
      id: `cat_${newCatSlug.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: newCatName,
      nameBn: newCatNameBn || newCatName,
      slug: newCatSlug.toLowerCase().replace(/\s+/g, '-'),
      level: newCatLevel,
      parentId: newCatLevel === 'Root' ? null : 'Electronics & Gadgets',
      taxRate: newCatTax,
      vatConcession: newCatTax === '0.00%' ? 'NBR Exempt' : newCatTax === '5.00%' ? 'ICT Concession' : 'Standard Rate',
      subCount: 0,
      itemCount: 0,
      isActive: true,
    };

    setCategories((prev) => [newCat, ...prev]);
    setShowAddModal(false);
    setNewCatName('');
    setNewCatNameBn('');
    setNewCatSlug('');
    setNotification(`Category "${newCat.name}" added successfully to AlifWorld taxonomy.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="md" />
            <div className="hidden md:flex items-center space-x-2 border-l border-slate-200 pl-6">
              <span className="text-xs uppercase tracking-widest font-black text-[#FF6A00]">
                Admin Operations
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-700">Taxonomy &amp; Brand Authority</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <span>+ New Category</span>
            </Button>
            <Link href="/admin">
              <Button variant="secondary" size="sm" className="font-bold">
                ← Admin Console
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Notification Toast */}
        {notification && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2">
              <span>✓</span>
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-900">✕</button>
          </div>
        )}

        {/* Title & Description Banner */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#0284C7] mb-1">
            <span>NBR Mushak-6.3 Architecture</span>
            <span>•</span>
            <span>Catalog Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Catalog Taxonomy &amp; Brand Authority
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Govern multi-level product classifications, statutory NBR VAT rate profiles (15%, 7.5%, 5%, 0% exempt), and verified trademark brand registries for counterfeit prevention across Bangladesh.
          </p>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((st) => (
            <Card key={st.label} className="bg-white border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{st.label}</div>
                <div className={`text-3xl font-black mt-2 ${st.color}`}>{st.count}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{st.meta}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-3 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'categories'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Taxonomy Tree ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'brands'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Brand Authority Registry ({brands.length})
          </button>
          <button
            onClick={() => setActiveTab('vat')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'vat'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            NBR Mushak-6.3 Profiles (4 Tiers)
          </button>
        </div>

        {/* Tab 1: Categories */}
        {activeTab === 'categories' && (
          <Card className="bg-white border-slate-200/90 shadow-sm overflow-hidden mb-8">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Hierarchical Taxonomy Tree</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized categories mapped to Bangladesh Customs HS Codes and NBR VAT rules.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="search"
                  placeholder="Search taxonomy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 w-60 focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Category Name</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Hierarchy Level</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Slug</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">NBR VAT Rate</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-right">Items Listed</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-center">Status</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((cat) => (
                      <TableRow key={cat.id} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                        <TableCell className="py-3.5">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-base">{cat.level === 'Root' ? '📁' : '↳ 📄'}</span>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{cat.name}</div>
                              <div className="text-xs text-slate-500">{cat.nameBn}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                            cat.level === 'Root' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {cat.level}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-slate-500">{cat.slug}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cat.taxRate === '0.00%' ? 'green' : cat.taxRate === '5.00%' ? 'blue' : 'orange'}>
                            {cat.taxRate} ({cat.vatConcession})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-slate-800">
                          {cat.itemCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success">ACTIVE</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2.5"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2 text-[#0284C7] hover:bg-sky-50"
                            >
                              + Sub
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Brand Authority Registry */}
        {activeTab === 'brands' && (
          <Card className="bg-white border-slate-200/90 shadow-sm overflow-hidden mb-8">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Approved Brand Authority Registries</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified trademark registry for catalog classification and anti-counterfeiting enforcement.
                </p>
              </div>
              <Button variant="secondary" size="sm" className="font-bold text-xs">
                + Register Brand
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Brand Name</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Slug</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Country of Origin</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Trademark Registry ID</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Catalog Listings</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-center">Status</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                        <TableCell className="font-bold text-slate-900 text-sm py-3.5 flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                            {brand.name.charAt(0)}
                          </span>
                          <span>{brand.name}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{brand.slug}</TableCell>
                        <TableCell className="text-xs text-slate-600">{brand.country}</TableCell>
                        <TableCell className="font-mono text-xs font-medium text-slate-700">{brand.trademarkNumber}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-slate-800">{brand.products}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={brand.status === 'OFFICIAL' ? 'orange' : 'green'}>
                            {brand.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: NBR Mushak-6.3 Profiles */}
        {activeTab === 'vat' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-white border-slate-200/90 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Standard NBR VAT Tier (15.00%)</h3>
                  <p className="text-xs text-slate-500">Applicable to luxury goods, accessories, and imported hardware</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complies with Bangladesh Value Added Tax and Supplementary Duty Act, 2012. Mushak-6.3 invoice generated automatically on fulfillment with integer poisha breakdown.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Mapped Categories:</span>
                <span className="font-bold text-slate-800">Audio, Watches, Cameras</span>
              </div>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">⚡</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">ICT Concession Tier (5.00%)</h3>
                  <p className="text-xs text-slate-500">Government ICT incentive for Digital Bangladesh growth</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Applies to locally manufactured or assembled smart devices, computers, tablets, and peripherals with documented BTRC/NBR exemption certificates.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Mapped Categories:</span>
                <span className="font-bold text-slate-800">Smartphones, Laptops, Components</span>
              </div>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🌾</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Daily Essentials Exempt (0.00%)</h3>
                  <p className="text-xs text-slate-500">Statutory exemption for raw food and agricultural produce</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strict zero-rate VAT profile enforced for rice, pulses, fresh vegetables, baby food, and basic life-saving medicine items as per NBR SRO notifications.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Mapped Categories:</span>
                <span className="font-bold text-slate-800">Groceries, Fresh Produce, Baby Milk</span>
              </div>
            </Card>

            <Card className="bg-white border-slate-200/90 shadow-sm p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🧵</span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Apparel &amp; Fashion Tier (7.50%)</h3>
                  <p className="text-xs text-slate-500">Standard domestic retail garment VAT concession</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Applicable to ready-made garments, lifestyle accessories, and locally tailored ethnic clothing lines, providing lower consumer friction.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Mapped Categories:</span>
                <span className="font-bold text-slate-800">Men&apos;s Fashion, Women&apos;s Wear, Footwear</span>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Create New Catalog Category</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Appliances"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value);
                    if (!newCatSlug) {
                      setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Category Name (Bengali)
                </label>
                <input
                  type="text"
                  placeholder="e.g. হোম অ্যাপ্লায়েন্স"
                  value={newCatNameBn}
                  onChange={(e) => setNewCatNameBn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. home-appliances"
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Hierarchy Level
                  </label>
                  <select
                    value={newCatLevel}
                    onChange={(e) => setNewCatLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                  >
                    <option value="Root">Root Category</option>
                    <option value="Sub-category">Sub-category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    NBR VAT Profile
                  </label>
                  <select
                    value={newCatTax}
                    onChange={(e) => setNewCatTax(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                  >
                    <option value="5.00%">5.00% (ICT Concession)</option>
                    <option value="15.00%">15.00% (Standard NBR)</option>
                    <option value="7.50%">7.50% (Apparel Concession)</option>
                    <option value="0.00%">0.00% (Exempt Mushak)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  Create Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">AlifWorld Platform</span>
            <span>•</span>
            <span>NBR Mushak-6.3 Tax Governance Matrix</span>
          </div>
          <div>All categories sync dynamically across storefront navigation.</div>
        </div>
      </footer>
    </div>
  );
}
