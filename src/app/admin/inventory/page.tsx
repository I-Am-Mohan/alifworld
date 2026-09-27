'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface AdminStockOverview {
  id: string;
  sellerName: string;
  warehouseName: string;
  warehouseCode: string;
  sku: string;
  productTitle: string;
  onHand: number;
  reserved: number;
  damaged: number;
  quarantined: number;
  available: number;
  lowStockThreshold: number;
  reorderPoint: number;
}

export default function AdminInventoryWorkspacePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'warehouses' | 'ledger'>('overview');

  const [balances] = useState<AdminStockOverview[]>([
    {
      id: 'stb_dhk_walton_phone_hub',
      sellerName: 'Walton Official Store',
      warehouseName: 'Dhaka Central Fulfillment Hub',
      warehouseCode: 'DHK-HUB-01',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro (Ocean Blue)',
      onHand: 80,
      reserved: 5,
      damaged: 1,
      quarantined: 0,
      available: 74,
      lowStockThreshold: 10,
      reorderPoint: 20,
    },
    {
      id: 'stb_dhk_walton_phone_depot',
      sellerName: 'Walton Official Store',
      warehouseName: 'Dhaka Tech Banani Depot',
      warehouseCode: 'DHK-DTH-01',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro (Ocean Blue)',
      onHand: 30,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 30,
      lowStockThreshold: 5,
      reorderPoint: 10,
    },
    {
      id: 'stb_dhk_xiaomi_buds_hub',
      sellerName: 'Xiaomi Bangladesh Direct',
      warehouseName: 'Dhaka Central Fulfillment Hub',
      warehouseCode: 'DHK-HUB-01',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro (White)',
      onHand: 120,
      reserved: 10,
      damaged: 2,
      quarantined: 0,
      available: 108,
      lowStockThreshold: 15,
      reorderPoint: 30,
    },
    {
      id: 'stb_ctg_walton_hub',
      sellerName: 'Walton Official Store',
      warehouseName: 'Chittagong Port Hub',
      warehouseCode: 'CTG-HUB-01',
      sku: 'WLT-PRX60-BLK-64',
      productTitle: 'Walton Primo S8 Pro (Black)',
      onHand: 0,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 0,
      lowStockThreshold: 5,
      reorderPoint: 15,
    },
  ]);

  const totalOnHand = balances.reduce((acc, b) => acc + b.onHand, 0);
  const totalReserved = balances.reduce((acc, b) => acc + b.reserved, 0);
  const totalAvailable = balances.reduce((acc, b) => acc + b.available, 0);
  const lowStockAlertsCount = balances.filter((b) => b.available <= b.lowStockThreshold).length;

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
                Platform Inventory & Warehousing Workspace
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/inventory/low-stock"
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              <span>⚠ Low Stock</span>
            </Link>
            <Link
              href="/admin/inventory/approvals"
              className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              <span>🛡️ Dual Approvals</span>
            </Link>
            <Link
              href="/admin/inventory/returns"
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              <span>↩ RMA QC</span>
            </Link>
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition-all"
            >
              ← Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Strict Invariant Formula Callout */}
        <Card className="border border-slate-300 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Core Inventory Availability Invariant Formula (অপরিবর্তনীয় সূত্র)
              </div>
              <div className="text-sm font-mono font-black text-slate-900 mt-1">
                Available = OnHand - Reserved - Damaged - Quarantined ≥ 0
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-slate-900 text-white font-mono text-[11px]">
                {balances.length} Total Platform SKUs
              </Badge>
              <Badge className="bg-emerald-600 text-white font-mono text-[11px]">
                100% Invariant Compliant
              </Badge>
            </div>
          </div>
        </Card>

        {/* Platform KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500">
                Total Physical OnHand (মোট মজুদ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900">{totalOnHand}</div>
              <p className="text-xs text-slate-500 mt-1">Across 3 active platform hubs</p>
            </CardContent>
          </Card>

          <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-amber-700">
                Locked Checkout Reservations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-800">{totalReserved}</div>
              <p className="text-xs text-amber-700/80 mt-1 font-medium">TTL checkout locks active</p>
            </CardContent>
          </Card>

          <Card className="border border-emerald-200 bg-emerald-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-emerald-700">
                Net Available Stock (উপলব্ধ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-800">{totalAvailable}</div>
              <p className="text-xs text-emerald-700/80 mt-1 font-medium">Ready for buyer checkout</p>
            </CardContent>
          </Card>

          <Card className="border border-red-200 bg-red-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-red-700">
                Low Stock Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-800">{lowStockAlertsCount}</div>
              <p className="text-xs text-red-700/80 mt-1 font-medium">Available ≤ Low Stock Threshold</p>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Platform Stock Overview ({balances.length})
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === 'warehouses'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Warehouse Facilities (3)
          </button>
        </div>

        {/* Tab 1: Platform Stock Overview Table */}
        {activeTab === 'overview' && (
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Multi-Warehouse Stock Balances across Merchants</span>
                <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                  Real-Time Synced
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                    <TableHead>Seller & Product</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">OnHand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Damaged</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b) => (
                    <TableRow key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell>
                        <div className="font-bold text-slate-900 text-xs">{b.productTitle}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          <span className="font-bold text-slate-700">{b.sellerName}</span> ({b.sku})
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">{b.warehouseName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{b.warehouseCode}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{b.onHand}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-amber-600">
                        {b.reserved}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-red-600">{b.damaged}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-emerald-700">
                        {b.available}
                      </TableCell>
                      <TableCell className="text-center">
                        {b.available === 0 ? (
                          <Badge className="bg-red-600 text-white text-[10px] font-bold">
                            OUT OF STOCK
                          </Badge>
                        ) : b.available <= b.lowStockThreshold ? (
                          <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                            LOW STOCK
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            HEALTHY
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Warehouse Facilities */}
        {activeTab === 'warehouses' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-slate-200 bg-white p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-black text-white text-[10px] font-bold">PLATFORM HUB</Badge>
                <span className="text-xs font-mono text-slate-500">DHK-HUB-01</span>
              </div>
              <h3 className="text-sm font-black text-slate-900">Dhaka Central Fulfillment Hub</h3>
              <p className="text-xs text-slate-600">Tejgaon Industrial Area, Dhaka-1208</p>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-700">
                <span>Active SKUs: 200</span>
                <span>Division: DHAKA</span>
              </div>
            </Card>

            <Card className="border border-slate-200 bg-white p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-600 text-white text-[10px] font-bold">SELLER DEPOT</Badge>
                <span className="text-xs font-mono text-slate-500">DHK-DTH-01</span>
              </div>
              <h3 className="text-sm font-black text-slate-900">Dhaka Tech Banani Depot</h3>
              <p className="text-xs text-slate-600">Road 11, Banani, Dhaka-1213</p>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-700">
                <span>Active SKUs: 45</span>
                <span>Division: DHAKA</span>
              </div>
            </Card>

            <Card className="border border-slate-200 bg-white p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-black text-white text-[10px] font-bold">PLATFORM HUB</Badge>
                <span className="text-xs font-mono text-slate-500">CTG-HUB-01</span>
              </div>
              <h3 className="text-sm font-black text-slate-900">Chittagong Port Hub</h3>
              <p className="text-xs text-slate-600">Agrabad Commercial Area, Chittagong</p>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-xs font-bold text-slate-700">
                <span>Active SKUs: 80</span>
                <span>Division: CHITTAGONG</span>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Admin Operations • Multi-Tenant Platform Inventory Workspace
        </div>
      </footer>
    </div>
  );
}
