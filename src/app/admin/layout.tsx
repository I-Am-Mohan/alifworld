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
  Edit3,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
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

  // Profile modal states
  const [profileTab, setProfileTab] = useState<'profile' | 'password'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const openProfileModal = () => {
    setProfileDropdownOpen(false);
    setProfileTab('profile');
    setIsEditingProfile(false);
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditPhone(user?.phone || '');
    setProfileError(null);
    setProfileSuccess(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!editName.trim()) {
      setProfileError('Please provide a valid name.');
      return;
    }
    if (!editEmail.trim()) {
      setProfileError('Please provide a valid email address.');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          phone: editPhone.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update profile details.');
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: json.data.name,
              email: json.data.email,
              phone: json.data.phone,
            }
          : null
      );

      setProfileSuccess('Profile details updated successfully! Super Admin email and details updated.');
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message || 'Error saving profile details.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/v1/auth/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to change password.');
      }

      setPasswordSuccess('Password changed successfully! Redirecting to sign in with your new password...');
      setTimeout(() => {
        setProfileModalOpen(false);
        router.push('/admin/login');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

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

  // Loading state or unauthenticated redirecting state
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading...
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
    <div className="h-screen bg-[#FAF9F6] flex flex-col overflow-hidden antialiased">
      {/* Top Application Bar */}
      <header className="shrink-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 h-16 flex items-center justify-between px-4 sm:px-6 shadow-xs">
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
                  {user?.name || 'User'}
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
                    onClick={openProfileModal}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <User className="w-4 h-4 text-amber-600" />
                    <span>Profile Management</span>
                  </button>

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
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:h-full lg:translate-x-0 shrink-0 ${
            sidebarOpen ? 'translate-x-0 shadow-2xl pt-16' : '-translate-x-full'
          } lg:pt-0`}
        >
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
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
        <main className="flex-1 h-full overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Profile Management Interactive Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shadow-xs">
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setProfileTab('profile');
                  setProfileError(null);
                  setProfileSuccess(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  profileTab === 'profile'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>Profile Details</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileTab('password');
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  profileTab === 'password'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                <span>Change Password</span>
              </button>
            </div>

            {/* Tab 1: Profile Details */}
            {profileTab === 'profile' && (
              <div className="space-y-4 text-xs">
                {profileSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {!isEditingProfile ? (
                  <div className="space-y-3.5">
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Full Name
                      </span>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900">
                        {user?.name || 'Super Administrator'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Email Address
                        </span>
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded">
                          Super Admin Login ID
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900">
                        {user?.email || 'Enter your email'}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Bangladesh Mobile Phone
                      </span>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900">
                        {user?.phone || '+8801700000025'}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Assigned RBAC Roles
                      </span>
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

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Identity Active &amp; Verified</span>
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingProfile(true);
                            setEditName(user?.name || '');
                            setEditEmail(user?.email || '');
                            setEditPhone(user?.phone || '');
                            setProfileError(null);
                            setProfileSuccess(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Edit Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileModalOpen(false)}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Email Address (Admin Login ID)
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                      />
                      <p className="text-[10px] text-amber-700 mt-1 font-medium">
                        Super Admin email can be changed here. You will use this new email to sign in to the platform.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Bangladesh Mobile Phone
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="+8801700000025"
                        className="w-full p-2.5 rounded-xl bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Assigned RBAC Roles (System Fixed)
                      </span>
                      <div className="flex flex-wrap gap-1.5 opacity-80">
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

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-xs transition-all disabled:opacity-50 inline-flex items-center space-x-1.5 cursor-pointer"
                      >
                        {profileSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Tab 2: Change Password */}
            {profileTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Enter current password"
                      className="w-full p-2.5 pr-10 rounded-xl bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="At least 8 characters (mixed case, number, symbol)"
                      className="w-full p-2.5 pr-10 rounded-xl bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      className="w-full p-2.5 pr-10 rounded-xl bg-white border border-slate-300 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  For platform security, changing the admin password will immediately secure your account and require signing in with your new credentials.
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-xs transition-all disabled:opacity-50 inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    {passwordSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
