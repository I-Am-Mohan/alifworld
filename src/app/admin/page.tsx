'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  LogOut,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Search,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
  Lock,
  Building2,
  PackageCheck,
  Server,
  Database,
  Sliders,
} from 'lucide-react';
import { AlifLogo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { useI18n } from '@/i18n/context';

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  roles: string[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const u = json.data;
          const roles = u.roles || [];
          if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
            setUser({
              id: u.id,
              name: u.name,
              email: u.email,
              phone: u.phone,
              roles: u.roles,
            });
            return;
          }
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/admin/login');
    router.refresh();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCurrentUser();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {t('admin.signingIn')}
        </span>
      </div>
    );
  }

  // Unauthorized state (not logged in or not an admin)
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between">
        <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <AlifLogo size="sm" href="/" />
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              {t('admin.returnToStore')}
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-900/5 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#F59E0B] flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center space-x-1.5 text-[11px] uppercase tracking-widest font-mono font-bold text-[#D97706] bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-3">
              <ShieldAlert className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Platform IAM Restriction</span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t('admin.loginTitle')}
            </h1>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              {t('admin.unauthorized')}
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <Link
                href="/admin/login"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-bold text-sm shadow-md shadow-amber-500/20 hover:from-[#D97706] hover:to-[#B45309] transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>{t('admin.signIn')}</span>
              </Link>
              <Link
                href="/"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                {t('admin.returnToStore')}
              </Link>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-400">
          © 2026 AlifWorld Security &amp; Platform IAM Gateway.
        </footer>
      </div>
    );
  }

  // Operational Modules Definition
  const modules = [
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
      title: 'Orders & Fulfillment',
      desc: 'Platform order pipeline, multi-vendor splits, Pathao dispatch, and tracking.',
      href: '/admin/orders',
      icon: ShoppingBag,
      badge: '14 In Flight',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200',
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

  // Recent platform orders sample
  const recentOrders = [
    {
      id: 'ORD-20260922-0001',
      customer: 'Tanvir Ahmed',
      division: 'Dhaka',
      amountPoisha: 2534850,
      points: 450,
      status: 'PROCESSING',
      date: '10 mins ago',
    },
    {
      id: 'ORD-20260922-0002',
      customer: 'Nusrat Jahan',
      division: 'Chittagong',
      amountPoisha: 1850000,
      points: 280,
      status: 'PAID',
      date: '35 mins ago',
    },
    {
      id: 'ORD-20260922-0003',
      customer: 'Farhan Kabir',
      division: 'Sylhet',
      amountPoisha: 4290000,
      points: 750,
      status: 'SHIPPED',
      date: '1 hour ago',
    },
    {
      id: 'ORD-20260922-0004',
      customer: 'Sadia Rahman',
      division: 'Rajshahi',
      amountPoisha: 980000,
      points: 120,
      status: 'DELIVERED',
      date: '3 hours ago',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
          {/* Brand & Portal Title */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <AlifLogo size="sm" href="/admin" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6A00] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                  Operations Console
                </span>
                <span className="text-[10px] font-mono text-slate-400">Asia/Dhaka</span>
              </div>
              <h1 className="text-xs font-black text-slate-900 leading-tight">
                AlifWorld Platform Administration
              </h1>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <LanguageSwitcher />

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              title="Refresh telemetry data"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* User Profile Pill */}
            <div className="hidden md:flex items-center space-x-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl py-1.5 px-3">
              <div className="w-7 h-7 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight flex items-center space-x-1.5">
                  <span className="max-w-[120px] truncate">{user.name || user.email}</span>
                  <span className="text-[9px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                    {user.roles[0]}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono leading-none truncate max-w-[140px]">
                  {user.email}
                </div>
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('admin.signOut')}</span>
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 md:hidden text-slate-700 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white p-4 space-y-3 shadow-lg">
            <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-black font-bold flex items-center justify-center">
                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">{user.name || 'Admin'}</div>
                <div className="text-xs text-slate-500">{user.email}</div>
                <div className="text-[10px] text-amber-700 font-mono font-bold mt-0.5">
                  {user.roles.join(', ')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {modules.slice(0, 6).map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-amber-50/50"
                >
                  <m.icon className="w-4 h-4 text-amber-600" />
                  <span className="truncate">{m.title}</span>
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <Link
                href="/"
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                ← {t('admin.returnToStore')}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-rose-600 font-bold flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('admin.signOut')}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Dashboard Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-950 to-neutral-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10">
          <div className="pointer-events-none absolute -right-16 -bottom-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="pointer-events-none absolute right-40 top-0 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-400/20 text-amber-400 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bangladesh E-Commerce Operational Gateway</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {t('admin.dashboard')}
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {t('admin.dashboardDesc')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[120px]">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Operational Time
                </div>
                <div className="text-sm font-black text-amber-400 mt-0.5">Asia/Dhaka (GMT+6)</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[120px]">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Currency Base
                </div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">BDT (৳ Minor Poisha)</div>
              </div>
            </div>
          </div>
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

        {/* 9 Core Operational Modules Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {t('admin.modulesTitle')}
              </h3>
              <p className="text-xs text-slate-500">
                Select a domain boundary to inspect, verify, or configure administrative operations.
              </p>
            </div>
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 sm:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 AlifWorld Platform Technologies Ltd. All rights reserved.</span>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span>Server: Single Next.js Monolith</span>
            <span>•</span>
            <span>DB: PostgreSQL 16 + Prisma</span>
            <span>•</span>
            <span>Audit: Immutable Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
