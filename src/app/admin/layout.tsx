'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingBag,
  LayoutTemplate,
  Store,
  RotateCcw,
  Headphones,
  Layers,
  Package,
  Video,
  Award,
  Percent,
  Users,
  Building2,
  MapPin,
  Tag,
  Smartphone,
  Bell,
  HelpCircle,
  Globe,
  ShieldCheck,
  Sliders,
  LogOut,
  Menu,
  X,
  User,
  CheckCircle2,
  ChevronDown,
  Shield,
  KeyRound,
  ExternalLink,
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // If on login page, skip layout shell
  const isLoginPage = pathname === '/admin/login';

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch admin session
  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const roles: string[] = json.data.roles || [];
            if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
              setUser({
                id: json.data.id,
                name: json.data.name,
                email: json.data.email,
                phone: json.data.phone,
                roles,
              });
              setLoading(false);
              return;
            }
          }
        }
        // Not admin or unauthenticated
        router.push('/admin/login');
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    setProfileDropdownOpen(false);
    router.push('/admin/login');
    router.refresh();
  };

  // If login page, render clean children
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Verifying IAM Credentials...
        </span>
      </div>
    );
  }

  // Navigation Groups structure requested
  const navigationSections = [
    {
      header: 'Overview >',
      items: [
        { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { label: 'Home Page Builder', href: '/admin/page-builder', icon: LayoutTemplate },
        { label: 'Seller Landing Page', href: '/admin/seller-landing-page', icon: Store },
        { label: 'Returns', href: '/admin/returns', icon: RotateCcw },
        { label: 'Customer Support', href: '/admin/support', icon: Headphones },
      ],
    },
    {
      header: 'Catalog >',
      items: [
        { label: 'Categories', href: '/admin/categories', icon: Layers },
        { label: 'Products', href: '/admin/products', icon: Package },
        { label: 'Watch & Buy', href: '/admin/watch-and-buy', icon: Video },
        { label: 'Brands', href: '/admin/brands', icon: Award },
        { label: 'Tax Rates', href: '/admin/tax-rates', icon: Percent },
      ],
    },
    {
      header: 'People >',
      items: [
        { label: 'Customers', href: '/admin/customers', icon: Users },
        { label: 'Seller Management', href: '/admin/sellers', icon: Building2 },
        { label: 'Stores', href: '/admin/stores', icon: Store },
        { label: 'Store locations', href: '/admin/store-locations', icon: MapPin },
      ],
    },
    {
      header: 'Marketing >',
      items: [{ label: 'Promos', href: '/admin/promos', icon: Tag }],
    },
    {
      header: 'Communication >',
      items: [
        { label: 'App Notifications', href: '/admin/app-notifications', icon: Smartphone },
        { label: 'Notifications', href: '/admin/notifications', icon: Bell },
        { label: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
        { label: 'Markets', href: '/admin/markets', icon: Globe },
      ],
    },
    {
      header: 'System >',
      items: [
        { label: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck },
        { label: 'Setup', href: '/admin/setup', icon: Sliders },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col antialiased">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
        <div className="flex items-center space-x-3">
          {/* Mobile sidebar toggle button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl border border-slate-200 lg:hidden text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <AlifLogo size="sm" href="/admin" />

          <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-200">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/70 px-2 py-0.5 rounded-md font-mono">
              Admin Console
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              Asia/Dhaka (GMT+6)
            </span>
          </div>
        </div>

        {/* Right side tools: Language & Profile Avatar */}
        <div className="flex items-center space-x-3">
          <LanguageSwitcher />

          {/* User Profile Avatar with Click Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 rounded-2xl hover:bg-slate-100 border border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-haspopup="true"
              aria-expanded={profileDropdownOpen}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="hidden md:block text-left pr-1">
                <span className="block text-xs font-bold text-slate-900 leading-none">
                  {user?.name || 'Mohan'}
                </span>
                <span className="text-[10px] text-amber-700 font-mono font-bold leading-none">
                  {user?.roles[0] || 'SUPER_ADMIN'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 py-2 z-50 animate-in fade-in duration-150">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user?.name || 'Super Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{user?.email}</p>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center space-x-1 text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                      <Shield className="w-2.5 h-2.5" />
                      <span>{user?.roles.join(', ')}</span>
                    </span>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <User className="w-4 h-4 text-amber-600" />
                    <span>Profile Management</span>
                  </button>

                  <Link
                    href="/admin/setup"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span>Platform Setup</span>
                  </Link>

                  <Link
                    href="/"
                    target="_blank"
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                      <span>Customer Storefront</span>
                    </span>
                  </Link>
                </div>

                <div className="pt-1 mt-1 border-t border-slate-100 p-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{t('admin.signOut')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container (Sidebar + Content Workspace) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200/90 pt-16 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          }`}
        >
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            {navigationSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {/* Header in small fonts with > */}
                <h3 className="px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                  {section.header}
                </h3>

                <div className="space-y-0.5 pt-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                      >
                        <item.icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Logout button under System Section */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Sidebar Footer System Badge */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="font-mono">v1.0.0-phase4</span>
            <span className="flex items-center space-x-1 text-emerald-600 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live IAM</span>
            </span>
          </div>
        </aside>

        {/* Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-20 lg:hidden"
          />
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>

      {/* Profile Management Interactive Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Admin Profile Management</h3>
                  <p className="text-xs text-slate-500">IAM Operator Identity &amp; Privileges</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900">
                  {user?.name || 'Platform Super Administrator (Mohan)'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900">
                  {user?.email || 'itsmohan025@gmail.com'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Bangladesh Mobile Phone
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900">
                  {user?.phone || '+8801700000025'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assigned RBAC Roles
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {user?.roles.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold font-mono text-[10px]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Identity Active &amp; Verified</span>
              </span>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
