'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  ShieldCheck,
  Store,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Percent,
  Receipt,
  FileSpreadsheet,
  ArrowLeft,
  CreditCard,
  Send,
} from 'lucide-react';

interface SettlementItem {
  id: string;
  settlementNumber: string;
  periodStart: string;
  periodEnd: string;
  grossOrderPoisha: bigint;
  shippingFeePoisha: bigint;
  taxPoisha: bigint;
  commissionPoisha: bigint;
  refundDeductionPoisha: bigint;
  netPayoutPoisha: bigint;
  status: 'PENDING' | 'AUDITED' | 'APPROVED' | 'DISBURSED';
  disbursedAt?: string;
}

interface PayoutItem {
  id: string;
  payoutNumber: string;
  settlementNumber: string;
  channel: 'BEFTN' | 'RTGS' | 'BKASH_DISBURSEMENT' | 'NAGAD_DISBURSEMENT';
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  amountPoisha: bigint;
  status: 'PENDING' | 'INITIATED' | 'SUCCESS' | 'FAILED';
  gatewayReference: string;
  disbursedAt: string;
}

interface CommissionRecord {
  id: string;
  orderNumber: string;
  groupNumber: string;
  basisPoisha: bigint;
  rateBps: number;
  commissionPoisha: bigint;
  ruleVersion: string;
  status: 'EARNED' | 'REVERSED' | 'SETTLED';
  createdAt: string;
}

export default function SellerFinancesPage() {
  const [activeTab, setActiveTab] = useState<'settlements' | 'payouts' | 'commissions' | 'bank_account'>('settlements');
  const [requestPayoutSuccess, setRequestPayoutSuccess] = useState(false);

  // Mock initial financial state based on Section 9 seed records
  const [settlements] = useState<SettlementItem[]>([
    {
      id: 'stl_01j7x4b9e8m02k3f8d7c6b5a4',
      settlementNumber: 'STL-20260922-0001',
      periodStart: '2026-09-15T00:00:00.000Z',
      periodEnd: '2026-09-22T23:59:59.000Z',
      grossOrderPoisha: BigInt(2199000), // ৳21,990.00
      shippingFeePoisha: BigInt(6000),  // ৳60.00
      taxPoisha: BigInt(329850),        // ৳3,298.50
      commissionPoisha: BigInt(109950), // 5% = ৳1,099.50
      refundDeductionPoisha: BigInt(0),
      netPayoutPoisha: BigInt(2424900), // ৳24,249.00
      status: 'APPROVED',
      disbursedAt: '2026-09-22T14:45:00.000Z',
    },
    {
      id: 'stl_01j7x4b9e8m02k3f8d7c6b5a5',
      settlementNumber: 'STL-20260915-0002',
      periodStart: '2026-09-08T00:00:00.000Z',
      periodEnd: '2026-09-14T23:59:59.000Z',
      grossOrderPoisha: BigInt(598000), // ৳5,980.00
      shippingFeePoisha: BigInt(6000),  // ৳60.00
      taxPoisha: BigInt(89700),         // ৳897.00
      commissionPoisha: BigInt(29900),  // 5% = ৳299.00
      refundDeductionPoisha: BigInt(0),
      netPayoutPoisha: BigInt(663800),  // ৳6,638.00
      status: 'DISBURSED',
      disbursedAt: '2026-09-15T16:20:00.000Z',
    },
  ]);

  const [payouts] = useState<PayoutItem[]>([
    {
      id: 'pot_01j7x4b9e8m02k3f8d7c6b5a1',
      payoutNumber: 'POT-20260922-0001',
      settlementNumber: 'STL-20260922-0001',
      channel: 'BEFTN',
      bankName: 'City Bank PLC',
      accountNumber: '•••••••••5001',
      routingNumber: '225272345',
      amountPoisha: BigInt(2424900), // ৳24,249.00
      status: 'SUCCESS',
      gatewayReference: 'BEFTN-CB-20260922-7721',
      disbursedAt: '2026-09-22T15:30:00.000Z',
    },
    {
      id: 'pot_01j7x4b9e8m02k3f8d7c6b5a2',
      payoutNumber: 'POT-20260915-0001',
      settlementNumber: 'STL-20260915-0002',
      channel: 'BEFTN',
      bankName: 'City Bank PLC',
      accountNumber: '•••••••••5001',
      routingNumber: '225272345',
      amountPoisha: BigInt(663800), // ৳6,638.00
      status: 'SUCCESS',
      gatewayReference: 'BEFTN-CB-20260915-1194',
      disbursedAt: '2026-09-15T16:20:00.000Z',
    },
  ]);

  const [commissions] = useState<CommissionRecord[]>([
    {
      id: 'com_01j7x4b9e8m02k3f8d7c6b5a1',
      orderNumber: 'ORD-20260922-0001',
      groupNumber: 'ORD-20260922-0001-SFG01',
      basisPoisha: BigInt(2199000),
      rateBps: 500, // 5.00%
      commissionPoisha: BigInt(109950),
      ruleVersion: 'v1.0.0',
      status: 'EARNED',
      createdAt: '2026-09-22T10:35:00.000Z',
    },
    {
      id: 'com_01j7x4b9e8m02k3f8d7c6b5a2',
      orderNumber: 'ORD-20260915-0002',
      groupNumber: 'ORD-20260915-0002-SFG01',
      basisPoisha: BigInt(598000),
      rateBps: 500, // 5.00%
      commissionPoisha: BigInt(29900),
      ruleVersion: 'v1.0.0',
      status: 'SETTLED',
      createdAt: '2026-09-15T09:12:00.000Z',
    },
  ]);

  const formatBdt = (poisha: bigint) => {
    const taka = Number(poisha) / 100;
    return `৳${taka.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Aggregates
  const totalGrossPoisha = BigInt(2797000); // ৳27,970.00
  const totalCommissionPoisha = BigInt(139850); // ৳1,398.50
  const totalDisbursedPoisha = BigInt(3088700); // ৳30,887.00
  const pendingSettlementPoisha = BigInt(0);

  const handleRequestPayout = () => {
    setRequestPayoutSuccess(true);
    setTimeout(() => setRequestPayoutSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#F59E0B]/30">
      {/* Top Merchant Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <AlifLogo size="sm" href="/" />
            <div className="h-5 w-[1px] bg-slate-700 hidden sm:block" />
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-100">Merchant Center</span>
              <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-2 py-0.5 rounded-full font-mono font-medium">
                FINANCE & SETTLEMENTS
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="text-slate-300 font-medium">Dhaka Tech Retail Ltd</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-mono">BIN: 002910293-0101</span>
            </div>

            <Link
              href="/seller/orders"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium transition-colors"
            >
              Fulfillment Orders
            </Link>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Storefront
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title & Payout Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#F59E0B] font-mono uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>NBR Mushak 6.3 & Bangladesh Bank BEFTN Compliant</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Seller Finances & Wire Settlements
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Exact minor-unit integer ledger (1 BDT = 100 poisha). Platform fee locked at 5.00% (500 bps) with automated weekly BEFTN bank wire disbursal.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRequestPayout}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-lg transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Disburse Weekly Payout</span>
            </button>
          </div>
        </div>

        {requestPayoutSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Weekly settlement batch STL-20260922-0001 submitted to Bangladesh Bank BEFTN clearing network. Disbursal confirmation expected within 1 business day.</span>
            </div>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Gross Fulfilled Sales</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatBdt(totalGrossPoisha)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              2,797,000 poisha delivered
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Platform Commission (5%)</span>
              <Percent className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              -{formatBdt(totalCommissionPoisha)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              500 bps rate locked (rule v1.0.0)
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Total Disbursed Payouts</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatBdt(totalDisbursedPoisha)}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Transferred via City Bank BEFTN</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Settlement Cycle Status</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-white">
              Weekly (Mondays)
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Next batch: 29 Sep 2026
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-8 text-sm">
          <button
            onClick={() => setActiveTab('settlements')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'settlements'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Settlement Batches ({settlements.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'payouts'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Electronic Payouts ({payouts.length})
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'commissions'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Commission Audit Ledger ({commissions.length})
          </button>
          <button
            onClick={() => setActiveTab('bank_account')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'bank_account'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Disbursal Routing Account
          </button>
        </div>

        {/* Tab 1: Settlement Batches */}
        {activeTab === 'settlements' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Settlement Batch</th>
                      <th className="p-4">Period</th>
                      <th className="p-4 text-right">Gross Subtotal</th>
                      <th className="p-4 text-right">Shipping + VAT</th>
                      <th className="p-4 text-right">5% Commission</th>
                      <th className="p-4 text-right">Net Payout</th>
                      <th className="p-4 text-center">Audit Status</th>
                      <th className="p-4 text-center">Statement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {settlements.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-medium text-white">
                          <div>{batch.settlementNumber}</div>
                          <div className="text-[10px] text-slate-500">{batch.id}</div>
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(batch.periodStart).toLocaleDateString()} –{' '}
                          {new Date(batch.periodEnd).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right font-mono font-semibold">
                          {formatBdt(batch.grossOrderPoisha)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">
                          {formatBdt(batch.shippingFeePoisha + batch.taxPoisha)}
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
                              batch.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : batch.status === 'DISBURSED'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{batch.status}</span>
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            title="Download NBR Mushak 6.3 Statement"
                            className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Payout Transfers */}
        {activeTab === 'payouts' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Payout Ref</th>
                      <th className="p-4">Settlement Batch</th>
                      <th className="p-4">Channel & Bank</th>
                      <th className="p-4">Account Reference</th>
                      <th className="p-4 text-right">Disbursed Amount</th>
                      <th className="p-4">BEFTN Clearance ID</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-medium text-white">
                          {payout.payoutNumber}
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {payout.settlementNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{payout.bankName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Routing: {payout.routingNumber} ({payout.channel})</div>
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {payout.accountNumber}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          {formatBdt(payout.amountPoisha)}
                        </td>
                        <td className="p-4 font-mono text-slate-400 text-[11px]">
                          {payout.gatewayReference}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{payout.status}</span>
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

        {/* Tab 3: Commission Ledger */}
        {activeTab === 'commissions' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Commission ID</th>
                      <th className="p-4">Order Number</th>
                      <th className="p-4">Fulfillment Group</th>
                      <th className="p-4 text-right">Basis Subtotal</th>
                      <th className="p-4 text-center">Platform Rate</th>
                      <th className="p-4 text-right">Commission Debited</th>
                      <th className="p-4 text-center">Rule Version</th>
                      <th className="p-4 text-center">Ledger Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {commissions.map((comm) => (
                      <tr key={comm.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono text-slate-400 text-[11px]">
                          {comm.id}
                        </td>
                        <td className="p-4 font-mono font-medium text-white">
                          {comm.orderNumber}
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {comm.groupNumber}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {formatBdt(comm.basisPoisha)}
                        </td>
                        <td className="p-4 text-center font-mono text-[#F59E0B]">
                          {(comm.rateBps / 100).toFixed(2)}%
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-amber-400">
                          {formatBdt(comm.commissionPoisha)}
                        </td>
                        <td className="p-4 text-center font-mono text-slate-400">
                          {comm.ruleVersion}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {comm.status}
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

        {/* Tab 4: Payout Account Settings */}
        {activeTab === 'bank_account' && (
          <div className="max-w-2xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">Verified Commercial Bank Account</h2>
                <p className="text-xs text-slate-400">Bangladesh Bank BEFTN / NPSB Electronic Clearing Profile</p>
              </div>
              <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>VERIFIED</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px]">Bank Institution</span>
                <p className="font-semibold text-white mt-0.5">City Bank PLC</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px]">Branch Name</span>
                <p className="font-semibold text-white mt-0.5">Gulshan Avenue Branch, Dhaka</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px]">Account Legal Title</span>
                <p className="font-semibold text-white mt-0.5">Dhaka Tech Retail Ltd</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px]">Account Number</span>
                <p className="font-mono text-white mt-0.5">1102938475001</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px]">Bangladesh Bank Routing</span>
                <p className="font-mono text-white mt-0.5">225272345</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-mono text-[10px]">Disbursal Currency</span>
                <p className="font-mono text-emerald-400 font-bold mt-0.5">BDT (Bangladeshi Taka)</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>To update bank routing information, please submit an audited corporate resolution.</span>
              <button className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium transition-colors">
                Request Change
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
