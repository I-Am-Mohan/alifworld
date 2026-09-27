'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface RmaItemView {
  id: string;
  rmaNumber: string;
  orderId: string;
  warehouseName: string;
  sku: string;
  productTitle: string;
  quantity: number;
  disposition: 'QUARANTINE_INSPECTION' | 'RESTOCK_AVAILABLE' | 'MARK_DAMAGED';
  status: 'RECEIVED' | 'INSPECTED' | 'RESTOCKED' | 'DAMAGED';
  customerReason: string;
  createdAt: string;
}

export default function SellerReturnsPage() {
  const [returns, setReturns] = useState<RmaItemView[]>([
    {
      id: 'rma_rec_001',
      rmaNumber: 'RMA-2026-BANANI-01',
      orderId: 'ORD-BD-99881',
      warehouseName: 'Dhaka Tech Banani Depot',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro',
      quantity: 2,
      disposition: 'QUARANTINE_INSPECTION',
      status: 'RECEIVED',
      customerReason: 'Buyer claimed minor packaging damage during transit',
      createdAt: '2026-09-27 11:20:00',
    },
    {
      id: 'rma_rec_002',
      rmaNumber: 'RMA-2026-BANANI-02',
      orderId: 'ORD-BD-99882',
      warehouseName: 'Dhaka Tech Banani Depot',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      quantity: 5,
      disposition: 'RESTOCK_AVAILABLE',
      status: 'RESTOCKED',
      customerReason: 'Customer ordered wrong size/color (unopened seal)',
      createdAt: '2026-09-26 15:45:00',
    },
  ]);

  const [showRmaModal, setShowRmaModal] = useState(false);
  const [rmaNumber, setRmaNumber] = useState('RMA-2026-NEW-03');
  const [orderId, setOrderId] = useState('ORD-BD-99901');
  const [sku, setSku] = useState('WLT-PRX60-BLU-128');
  const [quantity, setQuantity] = useState(1);
  const [disposition, setDisposition] = useState<'QUARANTINE_INSPECTION' | 'RESTOCK_AVAILABLE' | 'MARK_DAMAGED'>('QUARANTINE_INSPECTION');
  const [customerReason, setCustomerReason] = useState('Customer return - seal intact');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleReceiveRma = (e: React.FormEvent) => {
    e.preventDefault();
    const newRma: RmaItemView = {
      id: `rma_${Date.now()}`,
      rmaNumber,
      orderId,
      warehouseName: 'Dhaka Tech Banani Depot (DHK-DTH-01)',
      sku,
      productTitle: sku.startsWith('WLT') ? 'Walton Primo S8 Pro' : 'Xiaomi Redmi Buds 5 Pro',
      quantity,
      disposition,
      status: disposition === 'RESTOCK_AVAILABLE' ? 'RESTOCKED' : disposition === 'MARK_DAMAGED' ? 'DAMAGED' : 'RECEIVED',
      customerReason,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setReturns([newRma, ...returns]);
    setShowRmaModal(false);
    setToastMessage(`RMA return '${rmaNumber}' received with disposition '${disposition}'.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDirectRestock = (id: string) => {
    setReturns((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, disposition: 'RESTOCK_AVAILABLE' as const, status: 'RESTOCKED' as const } : r
      )
    );
    setToastMessage(`Returned item '${id}' directly restocked into available warehouse inventory balance.`);
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
                Seller Warehouse Returns
              </span>
              <h1 className="text-base font-black text-slate-900 leading-tight">
                RMA Return Restocking & Inspection (রিটার্ন রিস্টকিং ও পরিদর্শন)
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowRmaModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-sm"
            >
              + Log RMA Return Intake
            </Button>
            <Link
              href="/seller/inventory"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              ← Inventory Balances
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-sm">
            ✓ {toastMessage}
          </div>
        )}

        {/* RMA Intake Modal */}
        {showRmaModal && (
          <Card className="border border-orange-200 bg-orange-50/40 p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900">Log RMA Return Merchandise Intake</h3>
            <form onSubmit={handleReceiveRma} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">RMA Reference Number</label>
                  <input
                    type="text"
                    value={rmaNumber}
                    onChange={(e) => setRmaNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Order ID</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU</label>
                  <select
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  >
                    <option value="WLT-PRX60-BLU-128">Walton Primo S8 Pro (WLT-PRX60-BLU-128)</option>
                    <option value="MI-BUDS5P-WHT">Xiaomi Redmi Buds 5 Pro (MI-BUDS5P-WHT)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Returned Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Disposition</label>
                  <select
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="QUARANTINE_INSPECTION">Quarantine for Quality Inspection</option>
                    <option value="RESTOCK_AVAILABLE">Restock Directly to Available Stock</option>
                    <option value="MARK_DAMAGED">Mark Damaged / Defective</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Customer Reason</label>
                  <input
                    type="text"
                    value={customerReason}
                    onChange={(e) => setCustomerReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
              <div className="flex space-x-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowRmaModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#FF6A00] text-white font-bold">
                  Receive RMA Item
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* RMA Returns Log Table */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Returned Merchandise Authorization (RMA) Records</span>
              <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                {returns.length} RMA Entries
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <TableHead>Status / Disposition</TableHead>
                  <TableHead>RMA & Order ID</TableHead>
                  <TableHead>SKU & Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">Restock Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      {r.status === 'RESTOCKED' && (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          RESTOCKED (উপলব্ধ স্টক)
                        </Badge>
                      )}
                      {r.status === 'RECEIVED' && r.disposition === 'QUARANTINE_INSPECTION' && (
                        <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                          QUARANTINED (কোয়ারেন্টাইন)
                        </Badge>
                      )}
                      {r.status === 'DAMAGED' && (
                        <Badge className="bg-red-600 text-white text-[10px] font-bold">
                          DAMAGED (ক্ষতিগ্রস্ত)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-xs">{r.rmaNumber}</div>
                      <div className="text-[10px] font-mono text-slate-500">{r.orderId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-xs">{r.productTitle}</div>
                      <div className="text-[10px] font-mono text-slate-500">{r.sku}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-black text-[#FF6A00]">
                      {r.quantity} units
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{r.customerReason}</TableCell>
                    <TableCell className="text-center">
                      {r.status === 'RECEIVED' ? (
                        <Button
                          onClick={() => handleDirectRestock(r.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2"
                        >
                          Restock Now
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Processed</span>
                      )}
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
          AlifWorld Seller Operations • RMA Restocking & Quarantine Inspection Management
        </div>
      </footer>
    </div>
  );
}
