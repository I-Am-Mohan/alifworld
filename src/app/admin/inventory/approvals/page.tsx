'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface PendingCorrectionView {
  id: string;
  sessionId: string;
  sellerName: string;
  warehouseName: string;
  sku: string;
  productTitle: string;
  currentOnHand: number;
  countedQuantity: number;
  variance: number;
  reason: string;
  submittedBy: string;
  createdAt: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export default function AdminMakerCheckerApprovalsPage() {
  const [corrections, setCorrections] = useState<PendingCorrectionView[]>([
    {
      id: 'cor_audit_001',
      sessionId: 'cnt_sept_audit_01',
      sellerName: 'Xiaomi Bangladesh Direct',
      warehouseName: 'Dhaka Tech Banani Depot',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      currentOnHand: 45,
      countedQuantity: 30,
      variance: -15,
      reason: 'Q3 Physical count discrepancy - impact damage write-off',
      submittedBy: 'usr-seller-001',
      createdAt: '2026-09-27 09:15:00',
      status: 'PENDING_APPROVAL',
    },
    {
      id: 'cor_audit_003',
      sessionId: 'cnt_sept_audit_02',
      sellerName: 'Walton Official Store',
      warehouseName: 'Chittagong Port Hub',
      sku: 'WLT-PRX60-BLK-64',
      productTitle: 'Walton Primo S8 Pro',
      currentOnHand: 50,
      countedQuantity: 32,
      variance: -18,
      reason: 'Water ingress damage during monsoon transport',
      submittedBy: 'usr-seller-002',
      createdAt: '2026-09-27 11:00:00',
      status: 'PENDING_APPROVAL',
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const currentAdminUserId = 'usr-admin-001'; // Separate Admin checker

  const handleApprove = (id: string, approve: boolean) => {
    setCorrections((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          // Maker-Checker Check: Submitter cannot be approver
          if (c.submittedBy === currentAdminUserId) {
            setToastMessage('❌ Maker-Checker Violation: You cannot approve your own submitted correction!');
            setTimeout(() => setToastMessage(null), 4000);
            return c;
          }
          const nextStatus = approve ? ('APPROVED' as const) : ('REJECTED' as const);
          setToastMessage(
            approve
              ? `✓ Correction '${id}' Maker-Checker APPROVED. Stock balance adjusted by ${c.variance} units.`
              : `✕ Correction '${id}' REJECTED.`
          );
          setTimeout(() => setToastMessage(null), 4000);
          return { ...c, status: nextStatus };
        }
        return c;
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
                Admin Maker-Checker Center (দ্বৈত অনুমোদন কেন্দ্র)
              </span>
              <h1 className="text-base font-black text-white leading-tight">
                High-Variance Inventory Audit Correction Approvals
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/inventory/low-stock"
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
            >
              Low-Stock Oversight
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
          <div className="p-4 rounded-xl bg-slate-900 text-amber-400 border border-slate-800 text-xs font-bold shadow-md">
            {toastMessage}
          </div>
        )}

        {/* Security Invariant Callout Banner */}
        <Card className="border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start space-x-3">
            <span className="text-lg">🛡️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase">
                Gate-05 Maker-Checker Dual Authorization Invariant
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed font-medium">
                Physical count corrections with variance exceeding <strong>10 units</strong> require explicit Admin approval before stock balances are updated. By security policy, the submitter (Maker) can never approve their own correction request.
              </p>
            </div>
          </div>
        </Card>

        {/* Pending Audit Approvals Table */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Pending High-Variance Correction Reviews</span>
              <Badge className="bg-purple-600 text-white font-mono text-[10px]">
                {corrections.filter((c) => c.status === 'PENDING_APPROVAL').length} Pending Reviews
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <TableHead>Status</TableHead>
                  <TableHead>Seller & SKU</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">OnHand</TableHead>
                  <TableHead className="text-right">Counted</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Audit Reason</TableHead>
                  <TableHead className="text-center">Maker-Checker Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {corrections.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell>
                      {c.status === 'PENDING_APPROVAL' && (
                        <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                          PENDING APPROVAL
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
                      <div className="text-[10px] font-mono text-slate-500">
                        <span className="text-slate-700 font-bold">{c.sellerName}</span> ({c.sku})
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">{c.warehouseName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{c.currentOnHand}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{c.countedQuantity}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-black text-red-600">
                      {c.variance} units
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{c.reason}</TableCell>
                    <TableCell className="text-center">
                      {c.status === 'PENDING_APPROVAL' ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <Button
                            onClick={() => handleApprove(c.id, true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold h-7 px-2.5"
                          >
                            ✓ Approve
                          </Button>
                          <Button
                            onClick={() => handleApprove(c.id, false)}
                            className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold h-7 px-2.5"
                          >
                            ✕ Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500">{c.status}</span>
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
          AlifWorld Admin Platform Operations • Gate-05 Dual Authorization Inventory Review
        </div>
      </footer>
    </div>
  );
}
