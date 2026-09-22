'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface SellerProduct {
  id: string;
  title: string;
  titleBn: string;
  slug: string;
  category: string;
  brand: string;
  sku: string;
  basePrice: string;
  compareAtPrice: string | null;
  productPoint: number;
  variantsCount: number;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  imageUrl: string | null;
  updatedAt: string;
}

export default function SellerProductsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form state
  const [newTitle, setNewTitle] = useState('');
  const [newTitleBn, setNewTitleBn] = useState('');
  const [newCategory, setNewCategory] = useState('Smartphones & Tablets');
  const [newPrice, setNewPrice] = useState('12500');
  const [newPoints, setNewPoints] = useState('150');

  const [products, setProducts] = useState<SellerProduct[]>([
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
  ]);

  const filteredProducts = products.filter((p) => {
    const matchesTab = activeTab === 'ALL' || p.status === activeTab;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.titleBn.includes(searchQuery) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const priceNum = parseFloat(newPrice) || 0;
    const pointsNum = parseInt(newPoints) || 0;

    const newProd: SellerProduct = {
      id: `prd_${Date.now()}`,
      title: newTitle,
      titleBn: newTitleBn || newTitle,
      slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: newCategory,
      brand: 'Custom Brand',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      basePrice: `৳${priceNum.toLocaleString('en-BD')}.00`,
      compareAtPrice: null,
      productPoint: pointsNum,
      variantsCount: 1,
      status: 'DRAFT',
      imageUrl: null,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setProducts([newProd, ...products]);
    setShowAddModal(false);
    setNewTitle('');
    setNewTitleBn('');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-bold">
                Seller Center
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                Product Catalog Management
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs shadow-sm shadow-orange-500/25"
            >
              + Create Product
            </Button>
            <Link
              href="/seller/inventory"
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
            >
              Inventory Control
            </Link>
            <Link
              href="/seller"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Top Summary Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Store Product Catalog</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage multi-SKU variants, BDT poisha prices, and discrete Product Points under merchant isolation.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-orange-50 border border-orange-200 text-[#EA580C] font-bold">
              {products.filter((p) => p.status === 'PUBLISHED').length} Published
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold">
              {products.filter((p) => p.status === 'DRAFT').length} Drafts
            </span>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Status Tabs */}
          <div className="flex border-b border-slate-200 space-x-2 w-full sm:w-auto">
            {(['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-3 text-xs font-bold transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-[#FF6A00] text-[#FF6A00]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? `All (${products.length})` : tab}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, Bangla, SKU..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6A00] focus:ring-1 focus:ring-orange-200"
            />
          </div>
        </div>

        {/* Products Table */}
        <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Product &amp; SKU</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Category &amp; Brand</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-right">Base Price (BDT)</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-right">Product Points</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Variants</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Status</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => (
                  <TableRow key={p.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            'IMG'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{p.title}</div>
                          <div className="text-[11px] text-slate-400">{p.titleBn}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">{p.sku}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-700">{p.category}</div>
                      <div className="text-[11px] text-slate-500">{p.brand}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold text-xs text-slate-950">{p.basePrice}</div>
                      {p.compareAtPrice && (
                        <div className="text-[10px] text-slate-400 line-through">{p.compareAtPrice}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-xs text-[#0284C7] bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full font-mono">
                        +{p.productPoint} pts
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-slate-700">
                      {p.variantsCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.status === 'PUBLISHED' ? (
                        <Badge variant="success" size="sm">PUBLISHED</Badge>
                      ) : p.status === 'DRAFT' ? (
                        <Badge variant="warning" size="sm">DRAFT</Badge>
                      ) : (
                        <Badge variant="default" size="sm">ARCHIVED</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          setProducts(products.map((item) => {
                            if (item.id === p.id) {
                              return {
                                ...item,
                                status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                              };
                            }
                            return item;
                          }));
                        }}
                        className="text-xs text-[#FF6A00] font-bold hover:underline"
                      >
                        {p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">Create New Product Listing</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new draft product with integer BDT poisha pricing and independent Product Points.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Title (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Walton Primo S9 Pro Smartphone"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Title (Bangla)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ওয়ালটন প্রিমো এস৯ প্রো"
                  value={newTitleBn}
                  onChange={(e) => setNewTitleBn(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                >
                  <option value="Smartphones & Tablets">Smartphones &amp; Tablets</option>
                  <option value="Audio & Headphones">Audio &amp; Headphones</option>
                  <option value="Wearables & Smartwatches">Wearables &amp; Smartwatches</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Base Price (BDT ৳) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Product Points *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newPoints}
                    onChange={(e) => setNewPoints(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold"
                >
                  Save Draft
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
