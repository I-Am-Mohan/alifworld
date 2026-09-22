'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Percent,
  Search,
  Filter,
  Receipt,
  FileSpreadsheet,
  Coins,
  Sparkles,
  HeartHandshake,
  Award,
  ArrowLeft,
  Scale,
  BookOpen,
} from 'lucide-react';

interface ChartAccount {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balancePoisha: bigint;
  description: string;
}

interface JournalView {
  id: string;
  journalNumber: string;
  description: string;
  referenceType: string;
  totalPoisha: bigint;
  ruleVersion: string;
  postedAt: string;
  debits: Array<{ account: string; amountPoisha: bigint }>;
  credits: Array<{ account: string; amountPoisha: bigint }>;
}

interface SplitRuleView {
  code: string;
  version: string;
  name: string;
  splits: Record<string, number>;
  isActive: boolean;
}

export default function AdminWalletsAndLedgerPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'journals' | 'rules' | 'pools'>('accounts');

  const [accounts] = useState<ChartAccount[]>([
    {
      code: '1010-CASH-GATEWAY',
      name: 'Cash at Digital Gateway (Asset)',
      type: 'ASSET',
      balancePoisha: BigInt(2534850), // ৳25,348.50
      description: 'Inward payments collected via bKash, Nagad, and SSLCommerz',
    },
    {
      code: '2010-CUSTOMER-MAIN-LIABILITY',
      name: 'Customer Main Wallet Liability',
      type: 'LIABILITY',
      balancePoisha: BigInt(50000), // ৳500.00
      description: 'Withdrawable customer fiat balances held in trust',
    },
    {
      code: '2020-CUSTOMER-SHOPPING-LIABILITY',
      name: 'Customer Shopping Wallet Liability',
      type: 'LIABILITY',
      balancePoisha: BigInt(20000), // ৳200.00
      description: 'Customer store credit balances dedicated to checkout',
    },
    {
      code: '2030-CUSTOMER-GOODLUCK-LIABILITY',
      name: 'Customer Good-Luck Wallet Liability',
      type: 'LIABILITY',
      balancePoisha: BigInt(15000), // ৳150.00
      description: 'Customer promotional lottery prize draw balances',
    },
    {
      code: '2040-CUSTOMER-CHARITY-LIABILITY',
      name: 'Customer Charity Wallet Liability',
      type: 'LIABILITY',
      balancePoisha: BigInt(5000), // ৳50.00
      description: 'Allocated customer charitable donations under NBR rules',
    },
    {
      code: '4010-PLATFORM-COMMISSION-REVENUE',
      name: 'Marketplace Commission Revenue',
      type: 'REVENUE',
      balancePoisha: BigInt(109950), // ৳1,099.50 (5% platform fee)
      description: 'Platform earned commissions on delivered seller merchandise',
    },
    {
      code: '4020-SERVICE-CHARGE-REVENUE',
      name: 'Platform Service Charge Revenue',
      type: 'REVENUE',
      balancePoisha: BigInt(10000), // ৳100.00 (10% reward service fee)
      description: 'Platform service charge deductions on loyalty reward pools',
    },
    {
      code: '5010-PROMOTIONAL-REWARDS-EXPENSE',
      name: 'Promotional Rewards Expense Pool',
      type: 'EXPENSE',
      balancePoisha: BigInt(100000), // ৳1,000.00
      description: 'Corporate-funded expense pool for customer incentive distribution',
    },
  ]);

  const [journals] = useState<JournalView[]>([
    {
      id: 'jrn_01j7x4b9e8m02k3f8d7c6b5a1',
      journalNumber: 'JRN-20260922-0001',
      description: 'Customer order reward distribution across multi-account wallets',
      referenceType: 'REWARD_DISTRIBUTION',
      totalPoisha: BigInt(100000),
      ruleVersion: 'v1.0.0',
      postedAt: '2026-09-22T12:00:00.000Z',
      debits: [
        { account: '5010-PROMOTIONAL-REWARDS-EXPENSE', amountPoisha: BigInt(100000) },
      ],
      credits: [
        { account: '2010-CUSTOMER-MAIN-LIABILITY', amountPoisha: BigInt(50000) },
        { account: '2020-CUSTOMER-SHOPPING-LIABILITY', amountPoisha: BigInt(20000) },
        { account: '2030-CUSTOMER-GOODLUCK-LIABILITY', amountPoisha: BigInt(15000) },
        { account: '2040-CUSTOMER-CHARITY-LIABILITY', amountPoisha: BigInt(5000) },
        { account: '4020-SERVICE-CHARGE-REVENUE', amountPoisha: BigInt(10000) },
      ],
    },
  ]);

  const [rules] = useState<SplitRuleView[]>([
    {
      code: 'CUSTOMER_REWARD_SPLIT',
      version: 'v1.0.0',
      name: 'Customer Loyalty Reward Split Policy',
      splits: {
        MAIN: 5000,
        SHOPPING: 2000,
        GOOD_LUCK: 1500,
        CHARITY: 500,
        SERVICE_CHARGE: 1000,
      },
      isActive: true,
    },
    {
      code: 'SELLER_CLUB_SPLIT',
      version: 'v1.0.0',
      name: 'Seller Club Star Pool Split Policy',
      splits: {
        MAIN: 7000,
        GOOD_LUCK: 1500,
        CHARITY: 500,
        SERVICE_CHARGE: 1000,
      },
      isActive: true,
    },
  ]);

  const formatBdt = (poisha: bigint) => {
    const taka = Number(poisha) / 100;
    return `৳${taka.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
              <span className="font-bold text-sm text-slate-100">SuperAdmin Backoffice</span>
              <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-2 py-0.5 rounded-full font-mono font-medium">
                DOUBLE-ENTRY LEDGERS & REWARDS
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-medium">IAM Role: SuperAdmin</span>
            </div>

            <Link
              href="/admin/settlements"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium transition-colors"
            >
              Settlement Console
            </Link>

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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#F59E0B] font-mono uppercase tracking-wider mb-1">
              <Scale className="w-4 h-4" />
              <span>Double-Entry Conservation: Sum(Debits) == Sum(Credits)</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Chart of Accounts & Reward Allocation Ledgers
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Mathematically balanced multi-wallet ledgers, versioned split policies, and decoupled loyalty token auditing.
            </p>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Cash at Gateway (Asset)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatBdt(BigInt(2534850))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Account: 1010-CASH-GATEWAY</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Customer Wallet Liabilities</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400 font-mono">
              {formatBdt(BigInt(90000))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Main + Shopping + Good-Luck + Charity</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Platform Revenue Accrued</span>
              <Percent className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {formatBdt(BigInt(119950))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">5% Commission + 10% Service Fee</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Ledger Balance Invariant</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400">
              100% Balanced
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Zero Out-of-Balance Residuals</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-8 text-sm">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'accounts'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chart of Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('journals')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'journals'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Journal Transactions ({journals.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'rules'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Versioned Split Policies ({rules.length})
          </button>
        </div>

        {/* Tab 1: Chart of Accounts */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Account Code</th>
                      <th className="p-4">Account Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Balance (Poisha)</th>
                      <th className="p-4">Accounting Function</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {accounts.map((acc) => (
                      <tr key={acc.code} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-white">{acc.code}</td>
                        <td className="p-4 font-medium text-slate-300">{acc.name}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              acc.type === 'ASSET'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : acc.type === 'LIABILITY'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : acc.type === 'REVENUE'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {acc.type}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-white">
                          {formatBdt(acc.balancePoisha)}
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">{acc.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Journal Transactions */}
        {activeTab === 'journals' && (
          <div className="space-y-4">
            {journals.map((j) => (
              <div key={j.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-white text-sm">{j.journalNumber}</span>
                      <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                        {j.referenceType}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{j.ruleVersion}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{j.description}</p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-500 uppercase block">Balanced Total</span>
                    <span className="font-bold text-base text-emerald-400">{formatBdt(j.totalPoisha)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Debits */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-rose-400 block">
                      Debits (Dr)
                    </span>
                    <div className="space-y-1.5">
                      {j.debits.map((d, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex justify-between items-center">
                          <span className="font-mono text-slate-300">{d.account}</span>
                          <span className="font-mono font-bold text-rose-400">{formatBdt(d.amountPoisha)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Credits */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-emerald-400 block">
                      Credits (Cr)
                    </span>
                    <div className="space-y-1.5">
                      {j.credits.map((c, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex justify-between items-center">
                          <span className="font-mono text-slate-300">{c.account}</span>
                          <span className="font-mono font-bold text-emerald-400">+{formatBdt(c.amountPoisha)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Versioned Split Policies */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rules.map((r) => {
              const totalBps = Object.values(r.splits).reduce((a, b) => a + b, 0);
              return (
                <div key={r.code} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white text-sm">{r.code}</span>
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                          {r.version}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{r.name}</p>
                    </div>

                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                      ACTIVE (100% SUM)
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {Object.entries(r.splits).map(([target, bps]) => (
                      <div key={target} className="flex justify-between items-center p-2 rounded-lg bg-slate-800/30">
                        <span className="font-medium text-slate-300">{target}</span>
                        <span className="font-mono font-bold text-[#F59E0B]">
                          {(bps / 100).toFixed(2)}% ({bps} bps)
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Cumulative Basis Point Total</span>
                    <span className="font-mono font-bold text-white">{totalBps} / 10,000 bps</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
