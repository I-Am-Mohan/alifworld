'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { useI18n } from '@/i18n/context';
import { formatLocalizedCurrency } from '@/shared/utils/localization';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Percent,
  RefreshCw,
  Search,
  Filter,
  Check,
  FileSpreadsheet,
  AlertCircle,
  FileCheck2,
  ShieldAlert,
  ArrowLeft,
  RotateCcw,
  CreditCard,
  Send,
} from 'lucide-react';

interface SettlementBatch {
  id: string;
  settlementNumber: string;
  sellerId: string;
  sellerName: string;
  period: string;
  grossPoisha: bigint;
  shippingPoisha: bigint;
  taxPoisha: bigint;
  commissionPoisha: bigint;
  netPayoutPoisha: bigint;
  status: 'PENDING' | 'AUDITED' | 'APPROVED' | 'DISBURSED';
}

interface InwardPayment {
  id: string;
  paymentNumber: string;
  orderNumber: string;
  gateway: string;
  gatewayTrxId: string;
  amountPoisha: bigint;
  feePoisha: bigint;
  status: 'CAPTURED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  webhookVerified: boolean;
  capturedAt: string;
}

interface RefundLog {
  id: string;
  refundNumber: string;
  orderNumber: string;
  sellerName: string;
  amountPoisha: bigint;
  reversedPoints: number;
  commissionAdjustmentPoisha: bigint;
  reason: string;
  status: 'PROCESSED';
  createdAt: string;
}

export default function AdminSettlementsPage() {
  const { locale } = useI18n();
  const [activeTab, setActiveTab] = useState<'batches' | 'payments' | 'refunds'>('batches');
  const [batches, setBatches] = useState<SettlementBatch[]>([
    {
      id: 'stl_01j7x4b9e8m02k3f8d7c6b5a4',
      settlementNumber: 'STL-20260922-0001',
      sellerId: 'sel_01j7x4b9e8m02k3f8d7c6b5a1',
      sellerName: 'Dhaka Tech Retail Ltd',
      period: '15 Sep – 22 Sep 2026',
      grossPoisha: BigInt(2199000),
      shippingPoisha: BigInt(6000),
      taxPoisha: BigInt(329850),
      commissionPoisha: BigInt(109950), // 5%
      netPayoutPoisha: BigInt(2424900),
      status: 'AUDITED',
    },
    {
      id: 'stl_01j7x4b9e8m02k3f8d7c6b5a5',
      settlementNumber: 'STL-20260922-0002',
      sellerId: 'sel_01j7x4b9e8m02k3f8d7c6b5a2',
      sellerName: 'Bengal Heritage Crafts',
      period: '15 Sep – 22 Sep 2026',
      grossPoisha: BigInt(845000),
      shippingPoisha: BigInt(6000),
      taxPoisha: BigInt(126750),
      commissionPoisha: BigInt(42250), // 5%
      netPayoutPoisha: BigInt(935500),
      status: 'PENDING',
    },
  ]);

  const [payments] = useState<InwardPayment[]>([
    {
      id: 'pay_01j7x4b9e8m02k3f8d7c6b5a1',
      paymentNumber: 'PAY-20260922-0001',
      orderNumber: 'ORD-20260922-0001',
      gateway: 'BKASH',
      gatewayTrxId: 'TRX99201948BK',
      amountPoisha: BigInt(2534850),
      feePoisha: BigInt(38023),
      status: 'CAPTURED',
      webhookVerified: true,
      capturedAt: '2026-09-22T10:30:00.000Z',
    },
    {
      id: 'pay_01j7x4b9e8m02k3f8d7c6b5a2',
      paymentNumber: 'PAY-20260922-0002',
      orderNumber: 'ORD-20260922-0002',
      gateway: 'NAGAD',
      gatewayTrxId: 'NGD20260922883',
      amountPoisha: BigInt(693700),
      feePoisha: BigInt(10405),
      status: 'CAPTURED',
      webhookVerified: true,
      capturedAt: '2026-09-22T11:45:00.000Z',
    },
  ]);

  const [refunds] = useState<RefundLog[]>([
    {
      id: 'ref_01j7x4b9e8m02k3f8d7c6b5a1',
      refundNumber: 'REF-20260922-0001',
      orderNumber: 'ORD-20260921-0009',
      sellerName: 'Dhaka Tech Retail Ltd',
      amountPoisha: BigInt(299000), // ৳2,990.00
      reversedPoints: 60, // 60 discrete Product Points reversed
      commissionAdjustmentPoisha: BigInt(14950), // 5% = ৳149.50 reversal
      reason: 'DEFECTIVE (Factory seal damaged)',
      status: 'PROCESSED',
      createdAt: '2026-09-22T12:00:00.000Z',
    },
  ]);

  const formatBdt = (poisha: bigint) => formatLocalizedCurrency(poisha, locale);

  const handleApproveBatch = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: 'APPROVED' } : b))
    );
  };

  const handleDisburseBatch = (batchId: string) => {
    setBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status: 'DISBURSED' } : b))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#F59E0B]/30">
      {/* SuperAdmin Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <AlifLogo size="sm" href="/" />
            <div className="h-5 w-[1px] bg-slate-700 hidden sm:block" />
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-100">SuperAdmin Operations</span>
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
                FINANCIAL RECONCILIATION
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-medium">IAM Role: SuperAdmin</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-mono">MFA: ACTIVE</span>
            </div>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#F59E0B] font-mono uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4" />
              <span>Bangladesh Bank Electronic Clearing & NBR Mushak Compliance</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Marketplace Settlement & Reconciliation Console
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Multi-tenant merchant clearing batches, automated 5% platform commission accruals, and gateway webhook signature verification.
            </p>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Total Captured Inflows</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatBdt(BigInt(3228550))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              bKash / Nagad / SSLCommerz
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Commissions Booked (5%)</span>
              <Percent className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {formatBdt(BigInt(152200))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              500 bps platform revenue
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Awaiting Disbursal</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatBdt(BigInt(3360400))}
            </div>
            <div className="text-[11px] text-blue-400 mt-1">
              {batches.filter((b) => b.status !== 'DISBURSED').length} batches pending wire
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Webhook IPN Authenticity</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400">
              100% Verified
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              HMAC SHA-256 checked
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-8 text-sm">
          <button
            onClick={() => setActiveTab('batches')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'batches'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Settlement Clearing Batches ({batches.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'payments'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Gateway Inflows & Webhooks ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'refunds'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Refunds & Point Rollbacks ({refunds.length})
          </button>
        </div>

        {/* Tab 1: Settlement Batches */}
        {activeTab === 'batches' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Batch Number</th>
                      <th className="p-4">Merchant Store</th>
                      <th className="p-4">Period</th>
                      <th className="p-4 text-right">Gross Subtotal</th>
                      <th className="p-4 text-right">5% Commission</th>
                      <th className="p-4 text-right">Net Payout</th>
                      <th className="p-4 text-center">Audit Status</th>
                      <th className="p-4 text-center">SuperAdmin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-medium text-white">
                          {batch.settlementNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{batch.sellerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{batch.sellerId}</div>
                        </td>
                        <td className="p-4 text-slate-400">{batch.period}</td>
                        <td className="p-4 text-right font-mono font-medium">
                          {formatBdt(batch.grossPoisha)}
                        </td>
                        <td className="p-4 text-right font-mono text-amber-400">
                          -{formatBdt(batch.commissionPoisha)}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          {formatBdt(batch.netPayoutPoisha)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                              batch.status === 'DISBURSED'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : batch.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{batch.status}</span>
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {batch.status === 'AUDITED' && (
                            <button
                              onClick={() => handleApproveBatch(batch.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                            >
                              Approve Batch
                            </button>
                          )}
                          {batch.status === 'APPROVED' && (
                            <button
                              onClick={() => handleDisburseBatch(batch.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-[11px] transition-colors"
                            >
                              Disburse BEFTN
                            </button>
                          )}
                          {batch.status === 'DISBURSED' && (
                            <span className="text-[11px] text-slate-500 font-mono">Disbursed</span>
                          )}
                          {batch.status === 'PENDING' && (
                            <span className="text-[11px] text-amber-400 font-mono">Auditing...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Inward Gateway Payments */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Payment Ref</th>
                      <th className="p-4">Order Number</th>
                      <th className="p-4">Gateway</th>
                      <th className="p-4">TrxID Reference</th>
                      <th className="p-4 text-right">Captured Amount</th>
                      <th className="p-4 text-right">Gateway Fee</th>
                      <th className="p-4 text-center">IPN Webhook HMAC</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-medium text-white">{p.paymentNumber}</td>
                        <td className="p-4 font-mono text-slate-400">{p.orderNumber}</td>
                        <td className="p-4 font-semibold text-slate-300">{p.gateway}</td>
                        <td className="p-4 font-mono text-slate-400">{p.gatewayTrxId}</td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatBdt(p.amountPoisha)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-500">
                          {formatBdt(p.feePoisha)}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            <span>VALID (SHA256)</span>
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{p.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Partial Refunds & Point Rollbacks */}
        {activeTab === 'refunds' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Refund Ref</th>
                      <th className="p-4">Order Number</th>
                      <th className="p-4">Merchant Target</th>
                      <th className="p-4 text-right">Refund Amount</th>
                      <th className="p-4 text-center">Points Reversed</th>
                      <th className="p-4 text-right">5% Comm. Reversal</th>
                      <th className="p-4">Audit Reason</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {refunds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-medium text-white">{r.refundNumber}</td>
                        <td className="p-4 font-mono text-slate-400">{r.orderNumber}</td>
                        <td className="p-4 text-white font-medium">{r.sellerName}</td>
                        <td className="p-4 text-right font-mono font-bold text-rose-400">
                          -{formatBdt(r.amountPoisha)}
                        </td>
                        <td className="p-4 text-center font-mono text-amber-400">
                          -{r.reversedPoints} pts
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-400">
                          +{formatBdt(r.commissionAdjustmentPoisha)}
                        </td>
                        <td className="p-4 text-slate-300">{r.reason}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
