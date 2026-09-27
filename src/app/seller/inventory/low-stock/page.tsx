'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface LowStockItem {
  id: string;
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

export default function SellerLowStockPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LowStockItem[]>([
    {
      id: 'stb_dhk_walton_depot',
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLowThreshold, setEditLowThreshold] = useState<number>(10);
  const [editReorderPoint, setEditReorderPoint] = useState<number>(20);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Simulated API sync call
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleStartEdit = (item: LowStockItem) => {
    setEditingId(item.id);
    setEditLowThreshold(item.lowStockThreshold);
    setEditReorderPoint(item.reorderPoint);
  };

  const handleSaveThresholds = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const rec = Math.max(editReorderPoint * 2 - item.available, editReorderPoint);
          const urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
            item.available === 0 ? 'CRITICAL' : item.available <= editLowThreshold ? 'HIGH' : 'MEDIUM';
          return {
            ...item,
            lowStockThreshold: editLowThreshold,
            reorderPoint: editReorderPoint,
            recommendedReorderQuantity: rec,
            urgency,
          };
        }
        return item;
      })
    );
    setEditingId(null);
    setToastMessage('Stock thresholds updated successfully. Outbox alert evaluation recalculated.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-bold">
                Seller Inventory Control
              </span>
              <h1 className="text-base font-black text-slate-900 leading-tight">
                Low-Stock Alerts & Reorder Views (কম স্টক ও পুনঃক্রয় বার্তা)
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/seller/inventory"
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
            >
              ← Inventory Balances
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-sm">
            ✓ {toastMessage}
          </div>
        )}

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border border-red-200 bg-red-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-red-600">
                Critical Stockouts (জরুরি স্টকশূন্য)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-700">
                {items.filter((i) => i.urgency === 'CRITICAL').length}
              </div>
              <p className="text-xs text-red-600/80 mt-1 font-medium">Available stock = 0 units</p>
            </CardContent>
          </Card>

          <Card className="border border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-amber-700">
                Low Stock Warning (কম স্টক সতর্কতা)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-800">
                {items.filter((i) => i.urgency === 'HIGH').length}
              </div>
              <p className="text-xs text-amber-700/80 mt-1 font-medium">Available ≤ Low Stock Threshold</p>
            </CardContent>
          </Card>

          <Card className="border border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-blue-700">
                Reorder Threshold Triggered (পুনঃক্রয় লেভেল)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-800">
                {items.filter((i) => i.urgency === 'MEDIUM').length}
              </div>
              <p className="text-xs text-blue-700/80 mt-1 font-medium">Available ≤ Reorder Point</p>
            </CardContent>
          </Card>
        </div>

        {/* Reorder Recommendations Table */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Automated Reorder Recommendations (স্বয়ংক্রিয় পুনঃক্রয় সুপারিশ)</span>
              <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                {items.length} SKUs Require Reorder
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">
                Loading low stock alerts and reorder calculations...
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 font-medium">
                No items currently require reordering. Stock levels are healthy!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                    <TableHead className="w-[120px]">Urgency (জরুরি অবস্থা)</TableHead>
                    <TableHead>SKU & Product Title</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Available / OnHand</TableHead>
                    <TableHead className="text-right">Low Stock Threshold</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Rec. Order Qty</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell>
                        {item.urgency === 'CRITICAL' && (
                          <Badge className="bg-red-600 text-white text-[10px] font-bold">
                            CRITICAL (জরুরি)
                          </Badge>
                        )}
                        {item.urgency === 'HIGH' && (
                          <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                            HIGH (উচ্চ)
                          </Badge>
                        )}
                        {item.urgency === 'MEDIUM' && (
                          <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                            REORDER
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-slate-900 text-xs">{item.productTitle}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.variantTitle} • <span className="text-slate-700">{item.sku}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">{item.warehouseName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{item.warehouseCode}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-mono text-xs font-bold ${
                            item.available === 0
                              ? 'text-red-600'
                              : item.available <= item.lowStockThreshold
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.available}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">/ {item.onHand}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {editingId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editLowThreshold}
                            onChange={(e) => setEditLowThreshold(Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-right text-xs font-mono"
                          />
                        ) : (
                          item.lowStockThreshold
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {editingId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editReorderPoint}
                            onChange={(e) => setEditReorderPoint(Number(e.target.value))}
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-right text-xs font-mono"
                          />
                        ) : (
                          item.reorderPoint
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-xs font-black text-[#FF6A00]">
                          +{item.recommendedReorderQuantity} units
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === item.id ? (
                          <div className="flex items-center justify-center space-x-1">
                            <Button
                              onClick={() => handleSaveThresholds(item.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => setEditingId(null)}
                              variant="outline"
                              className="text-[10px] h-7 px-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleStartEdit(item)}
                            variant="outline"
                            className="text-[10px] font-semibold text-slate-700 hover:bg-slate-100 h-7 px-2"
                          >
                            Config Thresholds
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Seller Operations • Low-Stock Alerts & Concurrency Protected Stock Thresholds
        </div>
      </footer>
    </div>
  );
}
