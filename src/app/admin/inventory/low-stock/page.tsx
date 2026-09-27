'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface AdminLowStockView {
  id: string;
  sellerName: string;
  sellerCode: string;
  warehouseName: string;
  warehouseCode: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  reorderPoint: number;
  recommendedReorderQuantity: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export default function AdminLowStockPage() {
  const [items] = useState<AdminLowStockView[]>([
    {
      id: 'stb_dhk_walton_depot',
      sellerName: 'Walton Official Store',
      sellerCode: 'SEL-WLT-01',
      warehouseName: 'Dhaka Tech Banani Depot',
      warehouseCode: 'DHK-DTH-01',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro',
      variantTitle: 'Ocean Blue / 128GB',
      onHand: 4,
      reserved: 2,
      available: 2,
      lowStockThreshold: 10,
      reorderPoint: 20,
      recommendedReorderQuantity: 38,
      urgency: 'HIGH',
    },
    {
      id: 'stb_ctg_walton_hub',
      sellerName: 'Walton Official Store',
      sellerCode: 'SEL-WLT-01',
      warehouseName: 'Chittagong Port Hub',
      warehouseCode: 'CTG-HUB-01',
      sku: 'WLT-PRX60-BLK-64',
      productTitle: 'Walton Primo S8 Pro',
      variantTitle: 'Midnight Black / 64GB',
      onHand: 0,
      reserved: 0,
      available: 0,
      lowStockThreshold: 5,
      reorderPoint: 15,
      recommendedReorderQuantity: 30,
      urgency: 'CRITICAL',
    },
    {
      id: 'stb_dhk_xiaomi_depot',
      sellerName: 'Xiaomi Bangladesh Direct',
      sellerCode: 'SEL-XMI-02',
      warehouseName: 'Dhaka Tech Banani Depot',
      warehouseCode: 'DHK-DTH-01',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      variantTitle: 'Moonlight White',
      onHand: 14,
      reserved: 2,
      available: 12,
      lowStockThreshold: 10,
      reorderPoint: 20,
      recommendedReorderQuantity: 28,
      urgency: 'MEDIUM',
    },
  ]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                Admin Console (অ্যাডমিন কনসোল)
              </span>
              <h1 className="text-base font-black text-white leading-tight">
                Platform Inventory Low-Stock Oversight
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/sellers"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              Seller Applications
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition-all"
            >
              ← Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border border-red-200 bg-red-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-red-600">
                Out of Stock SKUs (মজুদ শূন্য)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-700">
                {items.filter((i) => i.urgency === 'CRITICAL').length}
              </div>
              <p className="text-xs text-red-600/80 mt-1 font-medium">Immediate reorder required</p>
            </CardContent>
          </Card>

          <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-amber-700">
                Low Stock Warnings (কম স্টক সতর্কতা)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-800">
                {items.filter((i) => i.urgency === 'HIGH').length}
              </div>
              <p className="text-xs text-amber-700/80 mt-1 font-medium">At or below low stock threshold</p>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-blue-700">
                Reorder Point Reached (পুনঃক্রয় লেভেল)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-800">
                {items.filter((i) => i.urgency === 'MEDIUM').length}
              </div>
              <p className="text-xs text-blue-700/80 mt-1 font-medium">Order replenishment recommended</p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Inventory Low Stock Monitor Table */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Platform Warehouses Low Stock Control</span>
              <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                {items.length} Flagged SKUs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <TableHead>Urgency</TableHead>
                  <TableHead>Seller & SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Available / OnHand</TableHead>
                  <TableHead className="text-right">Low Stock Threshold</TableHead>
                  <TableHead className="text-right">Reorder Point</TableHead>
                  <TableHead className="text-right">Rec. Reorder Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      {item.urgency === 'CRITICAL' && (
                        <Badge className="bg-red-600 text-white text-[10px] font-bold">
                          CRITICAL
                        </Badge>
                      )}
                      {item.urgency === 'HIGH' && (
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          HIGH
                        </Badge>
                      )}
                      {item.urgency === 'MEDIUM' && (
                        <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                          MEDIUM
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-xs">{item.productTitle}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        <span className="font-bold text-slate-700">{item.sellerName}</span> ({item.sku})
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800">{item.warehouseName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.warehouseCode}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">
                      <span className={item.available === 0 ? 'text-red-600' : 'text-slate-900'}>
                        {item.available}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400">/ {item.onHand}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{item.lowStockThreshold}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{item.reorderPoint}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-black text-[#FF6A00]">
                      +{item.recommendedReorderQuantity} units
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Admin Platform Operations • Central Low-Stock & Reorder Monitoring
        </div>
      </footer>
    </div>
  );
}
