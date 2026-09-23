'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Store,
  ShoppingBag,
  Wallet,
  Coins,
  Warehouse,
  Layers,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Building2,
  PackageCheck,
  Database,
  Sliders,
} from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { formatLocalizedCurrency } from '@/shared/utils/localization';

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  // Operational Modules Definition
  const modules = [
    {
      title: 'Orders & Fulfillment',
      desc: 'Platform order pipeline, multi-vendor splits, Pathao dispatch, and tracking.',
      href: '/admin/orders',
      icon: ShoppingBag,
      badge: '14 In Flight',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200',
    },
    {
      title: 'User Directory & IAM',
      desc: 'Bangladesh phone identities, user roles, token status, and account suspension.',
      href: '/admin/users',
      icon: Users,
      badge: 'RBAC Active',
      color: 'from-blue-500/10 to-sky-500/10 text-blue-700 border-blue-200',
    },
    {
      title: 'Merchants & KYC',
      desc: 'Seller onboarding, NBR BIN/TIN compliance, KYC private docs, and store settings.',
      href: '/admin/sellers',
      icon: Store,
      badge: '5 Pending KYC',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-200',
    },
    {
      title: 'Platform Master Setup',
      desc: 'Localization, S3 storage, bKash, Nagad, Pathao, SMS gateways, and feature flags.',
      href: '/admin/setup',
      icon: Sliders,
      badge: 'Config Active',
      color: 'from-amber-500/10 to-yellow-500/10 text-amber-800 border-amber-200',
    },
    {
      title: 'Wallets & Segregated Ledger',
      desc: 'Immutable double-entry ledger, Customer Main, Cashback, and Earnings wallets.',
      href: '/admin/wallets',
      icon: Wallet,
      badge: 'Poisha-Safe',
      color: 'from-purple-500/10 to-indigo-500/10 text-purple-700 border-purple-200',
    },
    {
      title: 'Settlements & Payouts',
      desc: 'Merchant settlement batches, commission deductions, and bank payouts.',
      href: '/admin/settlements',
      icon: Coins,
      badge: 'T+3 Cycle',
      color: 'from-amber-500/10 to-yellow-500/10 text-amber-800 border-amber-200',
    },
    {
      title: 'Warehouses & Stock Ledger',
      desc: 'Central & regional warehouse inventory, bin allocation, and reserve balances.',
      href: '/admin/warehouses',
      icon: Warehouse,
      badge: 'OCC Guarded',
      color: 'from-cyan-500/10 to-blue-500/10 text-cyan-800 border-cyan-200',
    },
    {
      title: 'Catalog Taxonomy',
      desc: 'Master category hierarchy, variant attributes, and NBR VAT rules.',
      href: '/admin/categories',
      icon: Layers,
      badge: '18 Categories',
      color: 'from-rose-500/10 to-pink-500/10 text-rose-700 border-rose-200',
    },
    {
      title: 'RBAC Roles & Matrix',
      desc: 'Granular permissions catalog, system role bindings, and tenant access rules.',
      href: '/admin/roles',
      icon: ShieldCheck,
      badge: '20 Bounded Contexts',
      color: 'from-slate-500/10 to-zinc-500/10 text-slate-800 border-slate-200',
    },
    {
      title: 'Database & Telemetry',
      desc: 'System health probes, Redis connection status, BullMQ workers, and migrations.',
      href: '/admin/database',
      icon: Database,
      badge: 'Live Probes',
      color: 'from-emerald-500/10 to-green-500/10 text-emerald-800 border-emerald-200',
    },
  ];

  interface RecentOrderView {
    id: string;
    customer: string;
    division: string;
    amountPoisha: number;
    points: number;
    status: string;
    date: string;
  }

  // Recent platform orders (empty by default; populated as live transactions occur)
  const recentOrders: RecentOrderView[] = [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Dashboard Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational overview, transactions, and system health status.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs w-fit"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 6 Key Operational Metrics Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('admin.totalGmv')}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ৳14.2M
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center space-x-1">
              <span>+12.4%</span>
              <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('admin.orders')}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              3,842
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              98.4% Fulfillment Rate
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('admin.activeSellers')}
            </span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-[#FF6A00]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              48
            </div>
            <div className="text-[10px] text-amber-700 font-bold mt-1">
              5 Pending KYC Review
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('admin.users')}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              28,500
            </div>
            <div className="text-[10px] text-slate-500 font-medium mt-1">
              E.164 BD Normalized
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('admin.pointsLedger')}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              1.42M
            </div>
            <div className="text-[10px] text-purple-700 font-bold mt-1">
              Non-Convertible Pool
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('admin.systemHealth')}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
              99.98%
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('admin.operational')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Operational Modules Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {t('admin.modulesTitle')}
            </h3>
            <p className="text-xs text-slate-500">
              Select an operational section to inspect, verify, or configure administrative parameters.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {modules.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br border ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                    {item.badge}
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-900 group-hover:text-[#D97706] transition-colors flex items-center space-x-1.5">
                  <span>{item.title}</span>
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-[#F59E0B]" />
                </h4>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-amber-700">
                <span>Enter Module</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live Operations: Recent Orders & Architecture Invariants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                {t('admin.recentOrders')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time pipeline across customer carts, seller splits, and delivery dispatches.
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center space-x-1"
            >
              <span>View All Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3 shadow-xs">
                <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
              </div>
              <p className="text-sm font-bold text-slate-800">No data available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Live platform orders will appear here as customers place purchases across stores.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Order Number</th>
                    <th className="pb-3">Customer / Region</th>
                    <th className="pb-3">Amount (BDT)</th>
                    <th className="pb-3">Points</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-mono font-bold text-slate-900">
                        {order.id}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-900">{order.customer}</div>
                        <div className="text-[10px] text-slate-400">{order.division} Division</div>
                      </td>
                      <td className="py-3 font-mono font-bold text-slate-900">
                        ৳{(order.amountPoisha / 100).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[10px]">
                          +{order.points} pts
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.status === 'SHIPPED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : order.status === 'PROCESSING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 font-mono text-[10px]">
                        {order.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Architecture Invariants & Compliance Status Card */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-black text-sm uppercase tracking-wider pb-3 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-[#F59E0B]" />
              <span>{t('admin.systemInvariants')}</span>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-start space-x-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">BDT Poisha Precision</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    1 BDT = 100 Poisha. Integer math enforced on all wallets, splits, and cart items.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-sky-50/50 border border-sky-200/60 flex items-start space-x-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Independent Product Points</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    Points are segregated discrete units. Zero automatic conversion to fiat currency.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-200/60 flex items-start space-x-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Transactional Outbox</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    BullMQ relays events for email, notifications, and meilisearch safely.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Tenant Scoped Isolation</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    Merchants cannot access or modify peer store orders, inventory, or KYC documents.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Platform Rule Version</span>
            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">v1.0.0</span>
          </div>
        </section>
      </div>
    </div>
  );
}
