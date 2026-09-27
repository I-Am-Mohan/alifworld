'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface TransferView {
  id: string;
  fromWarehouse: string;
  toWarehouse: string;
  sku: string;
  productTitle: string;
  quantity: number;
  status: 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  reason: string;
  createdAt: string;
}

interface CountCorrectionView {
  id: string;
  sessionId: string;
  sku: string;
  productTitle: string;
  currentOnHand: number;
  countedQuantity: number;
  variance: number;
  reason: string;
  requiresApproval: boolean;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedBy: string;
  createdAt: string;
}

export default function SellerTransfersPage() {
  const [transfers, setTransfers] = useState<TransferView[]>([
    {
      id: 'trf_001_dhk_ctg',
      fromWarehouse: 'Dhaka Tech Banani Depot (DHK-DTH-01)',
      toWarehouse: 'Dhaka Central Hub (DHK-HUB-01)',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro',
      quantity: 15,
      status: 'IN_TRANSIT',
      reason: 'Rebalancing inventory stock for weekend campaign surge',
      createdAt: '2026-09-27 10:30:00',
    },
    {
      id: 'trf_002_hub_depot',
      fromWarehouse: 'Dhaka Central Hub (DHK-HUB-01)',
      toWarehouse: 'Dhaka Tech Banani Depot (DHK-DTH-01)',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      quantity: 30,
      status: 'COMPLETED',
      reason: 'Replenishment intake for local store fulfillment',
      createdAt: '2026-09-26 16:15:00',
    },
  ]);

  const [corrections, setCorrections] = useState<CountCorrectionView[]>([
    {
      id: 'cor_audit_001',
      sessionId: 'cnt_sept_audit_01',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      currentOnHand: 45,
      countedQuantity: 30,
      variance: -15,
      reason: 'Q3 Physical count discrepancy - impact damage write-off',
      requiresApproval: true,
      status: 'PENDING_APPROVAL',
      submittedBy: 'usr-seller-001',
      createdAt: '2026-09-27 09:15:00',
    },
    {
      id: 'cor_audit_002',
      sessionId: 'cnt_sept_audit_01',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro',
      currentOnHand: 80,
      countedQuantity: 82,
      variance: 2,
      reason: 'Physical count recount surplus found',
      requiresApproval: false,
      status: 'APPROVED',
      submittedBy: 'usr-seller-001',
      createdAt: '2026-09-27 09:20:00',
    },
  ]);

  // Form states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferVariant, setTransferVariant] = useState('WLT-PRX60-BLU-128');
  const [transferQty, setTransferQty] = useState(10);
  const [transferReason, setTransferReason] = useState('Inter-depot stock rebalance');

  const [showCountModal, setShowCountModal] = useState(false);
  const [countSku, setCountSku] = useState('WLT-PRX60-BLU-128');
  const [countedQty, setCountedQty] = useState(70);
  const [countReason, setCountReason] = useState('Monthly physical audit count reconciliation');

  const [message, setMessage] = useState<string | null>(null);

  const handleInitiateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrf: TransferView = {
      id: `trf_${Date.now()}`,
      fromWarehouse: 'Dhaka Tech Banani Depot (DHK-DTH-01)',
      toWarehouse: 'Dhaka Central Hub (DHK-HUB-01)',
      sku: transferVariant,
      productTitle: transferVariant.startsWith('WLT') ? 'Walton Primo S8 Pro' : 'Xiaomi Redmi Buds 5 Pro',
      quantity: transferQty,
      status: 'IN_TRANSIT',
      reason: transferReason,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setTransfers([newTrf, ...transfers]);
    setShowTransferModal(false);
    setMessage(`Stock transfer '${newTrf.id}' initiated for ${transferQty} units (IN_TRANSIT).`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleReceiveTransfer = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'COMPLETED' as const } : t))
    );
    setMessage(`Transfer '${id}' marked as COMPLETED. Stock added to destination balance.`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSubmitCount = (e: React.FormEvent) => {
    e.preventDefault();
    const currentOnHand = countSku.startsWith('WLT') ? 80 : 45;
    const variance = countedQty - currentOnHand;
    const requiresApproval = Math.abs(variance) > 10;

    const newCor: CountCorrectionView = {
      id: `cor_${Date.now()}`,
      sessionId: 'cnt_sept_audit_01',
      sku: countSku,
      productTitle: countSku.startsWith('WLT') ? 'Walton Primo S8 Pro' : 'Xiaomi Redmi Buds 5 Pro',
      currentOnHand,
      countedQuantity: countedQty,
      variance,
      reason: countReason,
      requiresApproval,
      status: requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      submittedBy: 'usr-seller-001',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setCorrections([newCor, ...corrections]);
    setShowCountModal(false);
    if (requiresApproval) {
      setMessage(`Count variance (${variance > 0 ? '+' : ''}${variance} units) exceeds 10 units threshold. Flagged for Admin Maker-Checker Dual Approval.`);
    } else {
      setMessage(`Count variance (${variance > 0 ? '+' : ''}${variance} units) auto-approved and applied to stock balance.`);
    }
    setTimeout(() => setMessage(null), 5000);
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
                Seller Operations
              </span>
              <h1 className="text-base font-black text-slate-900 leading-tight">
                Stock Transfers & Audit Corrections (স্টক হস্তান্তর ও অডিট সংশোধন)
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowTransferModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-sm"
            >
              + Initiate Stock Transfer
            </Button>
            <Button
              onClick={() => setShowCountModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm"
            >
              + Physical Audit Count
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
        {message && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold shadow-sm">
            ℹ {message}
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <Card className="border border-orange-200 bg-orange-50/40 p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900">Initiate Inter-Warehouse Stock Transfer</h3>
            <form onSubmit={handleInitiateTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Product SKU</label>
                  <select
                    value={transferVariant}
                    onChange={(e) => setTransferVariant(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  >
                    <option value="WLT-PRX60-BLU-128">Walton Primo S8 Pro (WLT-PRX60-BLU-128)</option>
                    <option value="MI-BUDS5P-WHT">Xiaomi Redmi Buds 5 Pro (MI-BUDS5P-WHT)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Transfer Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Audit Justification</label>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
              <div className="flex space-x-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#FF6A00] text-white font-bold">
                  Dispatch Transfer
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Physical Count Modal */}
        {showCountModal && (
          <Card className="border border-slate-300 bg-slate-50 p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900">Physical Stock Count Audit Entry</h3>
            <form onSubmit={handleSubmitCount} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target SKU</label>
                  <select
                    value={countSku}
                    onChange={(e) => setCountSku(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  >
                    <option value="WLT-PRX60-BLU-128">Walton Primo S8 Pro (Current: 80)</option>
                    <option value="MI-BUDS5P-WHT">Xiaomi Redmi Buds 5 Pro (Current: 45)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Physical Counted Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={countedQty}
                    onChange={(e) => setCountedQty(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Audit Reason</label>
                  <input
                    type="text"
                    value={countReason}
                    onChange={(e) => setCountReason(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
              <div className="flex space-x-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCountModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-slate-900 text-white font-bold">
                  Submit Count Variance
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Inter-Warehouse Transfers Table */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Inter-Warehouse Transfers (আন্তঃগুদাম হস্তান্তর)</span>
              <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                {transfers.length} Transfer Jobs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <TableHead>Status</TableHead>
                  <TableHead>SKU & Product</TableHead>
                  <TableHead>From Warehouse</TableHead>
                  <TableHead>To Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      {t.status === 'IN_TRANSIT' ? (
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          IN TRANSIT (চলমান)
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          COMPLETED (সম্পন্ন)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-xs">{t.productTitle}</div>
                      <div className="text-[10px] font-mono text-slate-500">{t.sku}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">{t.fromWarehouse}</TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">{t.toWarehouse}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-black text-[#FF6A00]">
                      {t.quantity} units
                    </TableCell>
                    <TableCell className="text-center">
                      {t.status === 'IN_TRANSIT' ? (
                        <Button
                          onClick={() => handleReceiveTransfer(t.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2"
                        >
                          Receive at Dest
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Received</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Physical Count Corrections Table */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Physical Audit Count Corrections (অডিট গণনা সংশোধন)</span>
              <Badge className="bg-slate-900 text-white font-mono text-[10px]">
                {corrections.length} Corrections
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <TableHead>Approval Status</TableHead>
                  <TableHead>SKU & Product</TableHead>
                  <TableHead className="text-right">OnHand</TableHead>
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Audit Justification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      {c.status === 'PENDING_APPROVAL' && (
                        <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                          PENDING DUAL APPROVAL
                        </Badge>
                      )}
                      {c.status === 'APPROVED' && (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          APPROVED
                        </Badge>
                      )}
                      {c.status === 'REJECTED' && (
                        <Badge className="bg-red-600 text-white text-[10px] font-bold">
                          REJECTED
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-xs">{c.productTitle}</div>
                      <div className="text-[10px] font-mono text-slate-500">{c.sku}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{c.currentOnHand}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{c.countedQuantity}</TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs font-black ${
                        c.variance < 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {c.variance > 0 ? `+${c.variance}` : c.variance}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{c.reason}</TableCell>
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
          AlifWorld Seller Operations • Inter-Warehouse Transfers & Audit Correction Workflows
        </div>
      </footer>
    </div>
  );
}
