'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface AdminQuarantineItemView {
  id: string;
  rmaNumber: string;
  orderId: string;
  sellerName: string;
  warehouseName: string;
  sku: string;
  productTitle: string;
  quarantinedQty: number;
  customerReason: string;
  createdAt: string;
  inspectionStatus: 'PENDING_INSPECTION' | 'RESTOCKED' | 'DAMAGED' | 'WRITE_OFF';
}

export default function AdminRmaInspectionPage() {
  const [quarantinedItems, setQuarantinedItems] = useState<AdminQuarantineItemView[]>([
    {
      id: 'q_001',
      rmaNumber: 'RMA-2026-BANANI-01',
      orderId: 'ORD-BD-99881',
      sellerName: 'Walton Official Store',
      warehouseName: 'Dhaka Tech Banani Depot',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro',
      quarantinedQty: 2,
      customerReason: 'Buyer claimed minor packaging damage during transit',
      createdAt: '2026-09-27 11:20:00',
      inspectionStatus: 'PENDING_INSPECTION',
    },
    {
      id: 'q_002',
      rmaNumber: 'RMA-2026-CTG-04',
      orderId: 'ORD-BD-99895',
      sellerName: 'Xiaomi Bangladesh Direct',
      warehouseName: 'Chittagong Port Hub',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      quarantinedQty: 10,
      customerReason: 'Returned under 7-day buyer return guarantee',
      createdAt: '2026-09-27 10:00:00',
      inspectionStatus: 'PENDING_INSPECTION',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleInspect = (
    id: string,
    result: 'PASSED_RESTOCK' | 'FAILED_DAMAGED' | 'FAILED_WRITE_OFF'
  ) => {
    setQuarantinedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus =
            result === 'PASSED_RESTOCK'
              ? ('RESTOCKED' as const)
              : result === 'FAILED_DAMAGED'
              ? ('DAMAGED' as const)
              : ('WRITE_OFF' as const);
          setToastMessage(
            result === 'PASSED_RESTOCK'
              ? `✓ QC Inspection PASSED for '${item.rmaNumber}'. Restocked ${item.quarantinedQty} units to available inventory.`
              : `✕ QC Inspection Result recorded: ${result}. Balance updated.`
          );
          setTimeout(() => setToastMessage(null), 4000);
          return { ...item, inspectionStatus: nextStatus };
        }
        return item;
      })
    );
  };

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
                Quality Control Console (গুণমান পরীক্ষা)
              </span>
              <h1 className="text-base font-black text-white leading-tight">
                RMA Return Quarantine Inspection & Restocking
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/inventory/approvals"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              Maker-Checker Approvals
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
        {toastMessage && (
          <div className="p-4 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 text-xs font-bold shadow-md">
            {toastMessage}
          </div>
        )}

        {/* Quarantined Return Inspection Table */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Quarantined Returned Items Awaiting Inspection</span>
              <Badge className="bg-purple-600 text-white font-mono text-[10px]">
                {quarantinedItems.filter((i) => i.inspectionStatus === 'PENDING_INSPECTION').length} Items to Inspect
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <TableHead>Status</TableHead>
                  <TableHead>RMA & Seller</TableHead>
                  <TableHead>SKU & Product</TableHead>
                  <TableHead className="text-right">Quarantined Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">QC Inspection Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarantinedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      {item.inspectionStatus === 'PENDING_INSPECTION' && (
                        <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                          PENDING QC
                        </Badge>
                      )}
                      {item.inspectionStatus === 'RESTOCKED' && (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          PASSED & RESTOCKED
                        </Badge>
                      )}
                      {item.inspectionStatus === 'DAMAGED' && (
                        <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                          MARKED DAMAGED
                        </Badge>
                      )}
                      {item.inspectionStatus === 'WRITE_OFF' && (
                        <Badge className="bg-red-600 text-white text-[10px] font-bold">
                          WRITTEN OFF
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-xs">{item.rmaNumber}</div>
                      <div className="text-[10px] font-mono text-slate-500">
                        <span className="text-slate-700 font-bold">{item.sellerName}</span> ({item.orderId})
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-xs">{item.productTitle}</div>
                      <div className="text-[10px] font-mono text-slate-500">{item.sku}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-black text-purple-600">
                      {item.quarantinedQty} units
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{item.customerReason}</TableCell>
                    <TableCell className="text-center">
                      {item.inspectionStatus === 'PENDING_INSPECTION' ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <Button
                            onClick={() => handleInspect(item.id, 'PASSED_RESTOCK')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2"
                          >
                            ✓ Pass & Restock
                          </Button>
                          <Button
                            onClick={() => handleInspect(item.id, 'FAILED_DAMAGED')}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold h-7 px-2"
                          >
                            Damaged
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500">{item.inspectionStatus}</span>
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
          AlifWorld Admin Operations • Quality Control Inspection & Quarantine Management
        </div>
      </footer>
    </div>
  );
}
