'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingBag,
  Sparkles,
  HeartHandshake,
  Award,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Download,
  Percent,
} from 'lucide-react';

export default function CustomerWalletPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'journal' | 'ranks'>('overview');

  // Multi-wallet mock state matching Section 10 seed
  const balances = {
    mainPoisha: BigInt(50000),      // ৳500.00
    shoppingPoisha: BigInt(20000),  // ৳200.00
    goodLuckPoisha: BigInt(15000),  // ৳150.00
    charityPoisha: BigInt(5000),    // ৳50.00
    availablePoints: 450,
    pendingPoints: 0,
    lifetimePoints: 450,
  };

  const formatBdt = (poisha: bigint) => {
    const taka = Number(poisha) / 100;
    return `৳${taka.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pointEvents = [
    {
      id: 'pev_01j7x4b9e8m02k3f8d7c6b5a1',
      orderNumber: 'ORD-20260922-0001',
      itemTitle: 'Nexus Pro Smartphone 5G',
      eventType: 'ORDER_RELEASED',
      points: 450,
      ruleVersion: 'v1.0.0',
      createdAt: '2026-09-22T12:00:00.000Z',
    },
  ];

  const journalEntries = [
    {
      id: 'jrn_01j7x4b9e8m02k3f8d7c6b5a1',
      journalNumber: 'JRN-20260922-0001',
      description: 'Order reward distribution (50/20/15/5/10 rule split)',
      referenceType: 'REWARD_DISTRIBUTION',
      totalPoisha: BigInt(100000), // ৳1,000.00 total funded reward
      postedAt: '2026-09-22T12:00:00.000Z',
      breakdown: [
        { label: 'Main Wallet (50%)', amountPoisha: BigInt(50000), direction: 'CREDIT' },
        { label: 'Shopping Wallet (20%)', amountPoisha: BigInt(20000), direction: 'CREDIT' },
        { label: 'Good Luck Wallet (15%)', amountPoisha: BigInt(15000), direction: 'CREDIT' },
        { label: 'Charity Wallet (5%)', amountPoisha: BigInt(5000), direction: 'CREDIT' },
        { label: 'Service Charge Fee (10%)', amountPoisha: BigInt(10000), direction: 'CREDIT' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlifLogo size="sm" href="/" />
            <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
            <span className="font-bold text-sm text-slate-800 hidden sm:block">Customer Rewards & Wallets</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Storefront</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome & Integrity Alert */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Double-Entry Balanced Ledger & Decoupled Product Points</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              My Wallet & Loyalty Hub
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Exact minor-unit poisha accounting across segregated wallets. Product Points are independent units designated per SKU with zero conversion leakage.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 uppercase font-mono">Customer Club Tier</span>
              <div className="font-black text-slate-900 flex items-center space-x-1 justify-end">
                <Award className="w-4 h-4 text-[#F59E0B]" />
                <span>Bronze Member</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Multi-Account Wallets + Decoupled Points Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Main Wallet */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">Main Wallet</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatBdt(balances.mainPoisha)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Withdrawable / Spendable</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-emerald-700 font-medium">Available</span>
              <span className="font-mono text-slate-500">Holds: ৳0.00</span>
            </div>
          </div>

          {/* Shopping Wallet */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">Shopping Credit</span>
                <ShoppingBag className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatBdt(balances.shoppingPoisha)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Instant Store Checkout</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-blue-700 font-medium">Store Credit</span>
              <span className="font-mono text-slate-500">20% Split</span>
            </div>
          </div>

          {/* Good Luck Wallet */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">Good-Luck Pool</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatBdt(balances.goodLuckPoisha)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Promotional Lottery Tickets</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-amber-800 font-medium">Draw Eligible</span>
              <span className="font-mono text-slate-500">15% Split</span>
            </div>
          </div>

          {/* Charity Wallet */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-semibold text-slate-700">Charity Donations</span>
                <HeartHandshake className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {formatBdt(balances.charityPoisha)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Allocated Zakat / Aid</div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-rose-700 font-medium">Verified Causes</span>
              <span className="font-mono text-slate-500">5% Split</span>
            </div>
          </div>

          {/* Decoupled Product Points */}
          <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-amber-800 mb-2">
                <span className="font-bold">Product Points (PP)</span>
                <Coins className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {balances.availablePoints} <span className="text-xs font-sans font-normal text-slate-500">pts</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1">Decoupled Loyalty Units</div>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
              <span className="text-[#F59E0B] font-bold">Lifetime: {balances.lifetimePoints}</span>
              <span className="font-mono text-slate-500">Escrow: 0</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-8 text-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'overview'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Multi-Wallet Balances
          </button>
          <button
            onClick={() => setActiveTab('points')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'points'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Product Points History ({pointEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'journal'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Double-Entry Ledger Postings ({journalEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('ranks')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'ranks'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Club Ranks & Star Bands
          </button>
        </div>

        {/* Tab 1: Overview & Wallet Details */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Wallet Architecture & Policies</h2>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-3">
                  <Receipt className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">50% Main Wallet:</span> Fully spendable across the marketplace or withdrawable to City Bank, bKash, or Nagad following minimum threshold verification.
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-3">
                  <ShoppingBag className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">20% Shopping Wallet:</span> Non-withdrawable commercial store credits dedicated exclusively for cart checkouts across verified sellers.
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-3">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">15% Good-Luck Wallet:</span> Enters the user into weekly and monthly prize draws with verifiable transparency.
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-3">
                  <HeartHandshake className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">5% Charity Pool:</span> Directly disbursed to audited social development initiatives in Bangladesh under NBR guidelines.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full py-2.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Withdraw Main Balance</span>
                </button>
                <Link
                  href="/"
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Spend Shopping Credits</span>
                </Link>
              </div>

              <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                All transactions backed by balanced double-entry accounting journals with cryptographic hash auditability.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Decoupled Product Points */}
        {activeTab === 'points' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Chronological Product Point Stream</h3>
                <p className="text-[11px] text-slate-500">Points are frozen at checkout and released once the return inspection window closes.</p>
              </div>
              <div className="font-mono text-xs text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Current Available: {balances.availablePoints} PP
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[11px] border-b border-slate-100">
                <tr>
                  <th className="p-4">Event ID</th>
                  <th className="p-4">Order Reference</th>
                  <th className="p-4">Purchased SKU</th>
                  <th className="p-4 text-center">Point Change</th>
                  <th className="p-4">Rule Version</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pointEvents.map((pe) => (
                  <tr key={pe.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-slate-400">{pe.id}</td>
                    <td className="p-4 font-mono font-medium text-slate-900">{pe.orderNumber}</td>
                    <td className="p-4 font-medium">{pe.itemTitle}</td>
                    <td className="p-4 text-center font-mono font-bold text-emerald-600">
                      +{pe.points} PP
                    </td>
                    <td className="p-4 font-mono text-slate-400">{pe.ruleVersion}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>RELEASED</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Double-Entry Journal Postings */}
        {activeTab === 'journal' && (
          <div className="space-y-4">
            {journalEntries.map((jrn) => (
              <div key={jrn.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">{jrn.journalNumber}</span>
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                        {jrn.referenceType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{jrn.description}</p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 uppercase block">Total Journal Value</span>
                    <span className="font-bold text-sm text-slate-900">{formatBdt(jrn.totalPoisha)}</span>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Balanced Posting Breakdown (Sum of Debits == Sum of Credits)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                    {jrn.breakdown.map((b, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                        <span className="text-[11px] text-slate-500 font-medium">{b.label}</span>
                        <div className="mt-1 font-mono font-bold text-slate-900">
                          +{formatBdt(b.amountPoisha)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Club Ranks & Star Bands */}
        {activeTab === 'ranks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">Customer Club Tiers (Daily Qualification)</h3>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-900">Bronze Club</span>
                    <p className="text-[11px] text-amber-700">Threshold: 3,000 Product Points</p>
                  </div>
                  <span className="font-mono text-amber-800 font-bold text-xs">1.0% Pool Share</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between opacity-80">
                  <div>
                    <span className="font-bold text-slate-800">Silver Club</span>
                    <p className="text-[11px] text-slate-500">Threshold: 4,000 Product Points</p>
                  </div>
                  <span className="font-mono text-slate-600 font-bold text-xs">2.0% Pool Share</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between opacity-80">
                  <div>
                    <span className="font-bold text-slate-800">Gold Club</span>
                    <p className="text-[11px] text-slate-500">Threshold: 5,000 Product Points</p>
                  </div>
                  <span className="font-mono text-slate-600 font-bold text-xs">3.0% Pool Share</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">Competitive Star Bands</h3>
                <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">
                  LEADERBOARD
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Mega Star Band</span>
                    <p className="text-[11px] text-slate-500">Top 1 – 10 leaderboard rankings</p>
                  </div>
                  <span className="font-mono text-slate-800 font-bold text-xs">1.0% Pool Allocation</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Super Star Band</span>
                    <p className="text-[11px] text-slate-500">Rankings 11 – 50</p>
                  </div>
                  <span className="font-mono text-slate-800 font-bold text-xs">1.0% Pool Allocation</span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">Star Band</span>
                    <p className="text-[11px] text-slate-500">Rankings 51 – 100</p>
                  </div>
                  <span className="font-mono text-slate-800 font-bold text-xs">1.0% Pool Allocation</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
