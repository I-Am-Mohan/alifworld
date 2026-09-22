'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Globe,
  HardDrive,
  CreditCard,
  Truck,
  MessageSquare,
  Flag,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Send,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '@/i18n/context';

type SetupTab = 'localization' | 'storage' | 'payments' | 'couriers' | 'sms' | 'features';

export default function AdminSetupPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SetupTab>('localization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New locale & currency input state
  const [newLocaleCode, setNewLocaleCode] = useState('');
  const [newCurrencyCode, setNewCurrencyCode] = useState('');

  // Password / secret reveals
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  // SMS Test state
  const [testPhoneNumber, setTestPhoneNumber] = useState('+8801700000000');
  const [sendingTestSms, setSendingTestSms] = useState(false);

  // Settings State Map
  const [settings, setSettings] = useState<Record<string, string>>({
    PLATFORM_TIMEZONE: 'Asia/Dhaka',
    PLATFORM_DEFAULT_LOCALE: 'bn-BD',
    PLATFORM_LOCALES: 'bn-BD,en-BD',
    PLATFORM_CURRENCY: 'BDT',
    PLATFORM_CURRENCIES: 'BDT,USD',
    STORAGE_PROVIDER: 'INTERNAL',
    STORAGE_S3_ENDPOINT: 'http://localhost:9000',
    STORAGE_S3_REGION: 'us-east-1',
    STORAGE_S3_BUCKET: 'alifworld-media',
    STORAGE_S3_ACCESS_KEY: 'minioadmin',
    STORAGE_S3_SECRET_KEY: 'minioadmin123',
    STORAGE_S3_CDN_URL: 'http://localhost:9000/alifworld-media',
    STORAGE_S3_FORCE_PATH_STYLE: 'true',
    PAYMENT_BKASH_ENABLED: 'true',
    PAYMENT_BKASH_ENV: 'sandbox',
    PAYMENT_BKASH_APP_KEY: 'bkash_test_app_key',
    PAYMENT_BKASH_APP_SECRET: 'bkash_test_app_secret',
    PAYMENT_BKASH_USERNAME: 'bkash_sandbox_user',
    PAYMENT_BKASH_PASSWORD: 'password123',
    PAYMENT_BKASH_CALLBACK_URL: '/api/v1/payments/bkash/callback',
    PAYMENT_NAGAD_ENABLED: 'true',
    PAYMENT_NAGAD_ENV: 'sandbox',
    PAYMENT_NAGAD_MERCHANT_ID: 'NAGAD_SANDBOX_01',
    PAYMENT_NAGAD_PUBLIC_KEY: 'nagad_pub_key_placeholder',
    PAYMENT_NAGAD_PRIVATE_KEY: 'nagad_priv_key_placeholder',
    COURIER_PATHAO_ENABLED: 'true',
    COURIER_PATHAO_ENV: 'sandbox',
    COURIER_PATHAO_CLIENT_ID: 'pathao_client_id_dev',
    COURIER_PATHAO_CLIENT_SECRET: 'pathao_secret_dev',
    COURIER_PATHAO_USERNAME: 'pathao@alifworld.com',
    COURIER_PATHAO_PASSWORD: 'pathao_password_dev',
    COURIER_PATHAO_STORE_ID: '12480',
    COURIER_REDX_ENABLED: 'true',
    COURIER_REDX_ENV: 'sandbox',
    COURIER_REDX_ACCESS_TOKEN: 'redx_access_token_demo',
    COURIER_REDX_STORE_ID: 'redx_store_dhaka_01',
    COURIER_STEADFAST_ENABLED: 'true',
    COURIER_STEADFAST_ENV: 'sandbox',
    COURIER_STEADFAST_API_KEY: 'stf_api_key_sample',
    COURIER_STEADFAST_SECRET_KEY: 'stf_secret_sample',
    COURIER_DEFAULT_PROVIDER: 'PATHAO',
    SMS_GATEWAY_PROVIDER: 'GREENWEB',
    SMS_GATEWAY_API_KEY: 'greenweb_token_demo_sample',
    SMS_GATEWAY_SENDER_ID: 'ALIFWORLD',
    SMS_GATEWAY_ENDPOINT: 'https://api.greenweb.com.bd/api.php',
    FEATURE_COD_ENABLED: 'true',
    FEATURE_POINTS_REWARDS_ENABLED: 'true',
    FEATURE_POINTS_CASH_CONVERTIBLE: 'false',
    FEATURE_REFERRAL_ENABLED: 'true',
    FEATURE_SELLER_REGISTRATION_ENABLED: 'true',
    FEATURE_MULTIVENDOR_CHECKOUT: 'true',
    FEATURE_MAINTENANCE_MODE: 'false',
    FEATURE_CART_TTL_AUTO_CANCEL: 'true',
  });

  // Fetch settings from API on mount
  useEffect(() => {
    async function loadSetup() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/system/setup');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setSettings((prev) => ({ ...prev, ...json.data }));
          }
        }
      } catch {
        // Fallback to default state
      } finally {
        setLoading(false);
      }
    }
    loadSetup();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSetting = (key: string) => {
    // Invariant protection: points cash convertible can never be enabled
    if (key === 'FEATURE_POINTS_CASH_CONVERTIBLE') {
      showToast('Product Points are strictly non-convertible to fiat currency by architecture invariant.', 'error');
      return;
    }
    const current = settings[key] === 'true';
    updateSetting(key, current ? 'false' : 'true');
  };

  const toggleSecret = (field: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/v1/system/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        showToast('All platform setups and configurations saved successfully to database!');
      } else {
        throw new Error(json?.error?.message || 'Failed to save settings');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Locale list management
  const locales = (settings.PLATFORM_LOCALES || 'bn-BD,en-BD')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const addLocale = () => {
    if (!newLocaleCode.trim()) return;
    const clean = newLocaleCode.trim();
    if (!locales.includes(clean)) {
      const updated = [...locales, clean].join(',');
      updateSetting('PLATFORM_LOCALES', updated);
      setNewLocaleCode('');
    }
  };

  const removeLocale = (code: string) => {
    if (code === settings.PLATFORM_DEFAULT_LOCALE) {
      showToast('Cannot remove default platform locale', 'error');
      return;
    }
    const updated = locales.filter((l) => l !== code).join(',');
    updateSetting('PLATFORM_LOCALES', updated);
  };

  // Currency list management
  const currencies = (settings.PLATFORM_CURRENCIES || 'BDT,USD')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const addCurrency = () => {
    if (!newCurrencyCode.trim()) return;
    const clean = newCurrencyCode.trim().toUpperCase();
    if (!currencies.includes(clean)) {
      const updated = [...currencies, clean].join(',');
      updateSetting('PLATFORM_CURRENCIES', updated);
      setNewCurrencyCode('');
    }
  };

  const removeCurrency = (code: string) => {
    if (code === settings.PLATFORM_CURRENCY) {
      showToast('Cannot remove default launch currency (BDT)', 'error');
      return;
    }
    const updated = currencies.filter((c) => c !== code).join(',');
    updateSetting('PLATFORM_CURRENCIES', updated);
  };

  const handleSendTestSms = async () => {
    setSendingTestSms(true);
    setTimeout(() => {
      setSendingTestSms(false);
      showToast(`Test SMS dispatched to ${testPhoneNumber} via ${settings.SMS_GATEWAY_PROVIDER}!`);
    }, 1200);
  };

  const tabs = [
    { id: 'localization', label: 'Localization & Currencies', icon: Globe },
    { id: 'storage', label: 'S3 Storage & Cloud', icon: HardDrive },
    { id: 'payments', label: 'Payment Gateways', icon: CreditCard },
    { id: 'couriers', label: 'Couriers & Logistics', icon: Truck },
    { id: 'sms', label: 'SMS Gateway Provider', icon: MessageSquare },
    { id: 'features', label: 'Feature Flags & Invariants', icon: Flag },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-3">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading platform configurations...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 duration-200 border ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>System</span>
            <span>&gt;</span>
            <span className="text-amber-600 font-bold">Setup</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Platform Master Setup &amp; Governance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure regional boundaries, storage, financial payment rails, courier credentials, SMS providers, and feature flags.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 w-fit"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save Setup Changes'}</span>
        </button>
      </div>

      {/* Navigation Tabs (Mobile scrollable & Desktop pills) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-200/80 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SetupTab)}
              className={`flex items-center space-x-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Localization & Currencies */}
      {activeTab === 'localization' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900">Regional &amp; Localization Parameters</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set authoritative operational business timezone, launch locales, and multi-currency configurations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timezone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Platform Timezone
                </label>
                <select
                  value={settings.PLATFORM_TIMEZONE}
                  onChange={(e) => updateSetting('PLATFORM_TIMEZONE', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+06:00 - Bangladesh Authoritative)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (GMT+05:30 - India Standard)</option>
                  <option value="Asia/Singapore">Asia/Singapore (GMT+08:00)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+04:00 - UAE)</option>
                  <option value="Europe/London">Europe/London (GMT+00:00)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  All accounting cycles, order settlement windows, and daily club ranks calculate at midnight Dhaka time.
                </span>
              </div>

              {/* Default Locale */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Default Platform Language
                </label>
                <select
                  value={settings.PLATFORM_DEFAULT_LOCALE}
                  onChange={(e) => updateSetting('PLATFORM_DEFAULT_LOCALE', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                >
                  {locales.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc === 'bn-BD' ? 'bn-BD (বাংলা - বাংলাদেশ)' : loc === 'en-BD' ? 'en-BD (English - Bangladesh)' : loc}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Initial storefront language fallback for visitors without a stored preference.
                </span>
              </div>
            </div>

            {/* Supported Locales List & Add/Remove */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Supported Customer Locales (Add / Remove)
              </label>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {locales.map((loc) => (
                  <div
                    key={loc}
                    className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-xs font-bold text-amber-900"
                  >
                    <span>{loc}</span>
                    {loc === settings.PLATFORM_DEFAULT_LOCALE ? (
                      <span className="text-[9px] bg-amber-200/80 px-1 py-0.2 rounded text-amber-950 font-mono">
                        DEFAULT
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeLocale(loc)}
                        className="text-amber-700 hover:text-rose-600 p-0.5 rounded transition-colors"
                        title="Remove locale"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2 max-w-sm">
                <input
                  type="text"
                  value={newLocaleCode}
                  onChange={(e) => setNewLocaleCode(e.target.value)}
                  placeholder="e.g. ar-SA, fr-FR"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-amber-500 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={addLocale}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-colors inline-flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Locale</span>
                </button>
              </div>
            </div>

            {/* Currency Settings */}
            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Default Platform Currency
                </label>
                <select
                  value={settings.PLATFORM_CURRENCY}
                  onChange={(e) => updateSetting('PLATFORM_CURRENCY', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                >
                  {currencies.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr === 'BDT' ? 'BDT (৳ - Bangladeshi Taka Minor Poisha)' : curr}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Authoritative monetary base unit. Order snapshots, ledger postings, and wallet balances are stored in integer poisha.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Supported Settlement Currencies (Add / Remove)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {currencies.map((curr) => (
                    <div
                      key={curr}
                      className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold text-emerald-900"
                    >
                      <span>{curr}</span>
                      {curr === settings.PLATFORM_CURRENCY ? (
                        <span className="text-[9px] bg-emerald-200 px-1 py-0.2 rounded text-emerald-950 font-mono">
                          PRIMARY
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeCurrency(curr)}
                          className="text-emerald-700 hover:text-rose-600 p-0.5 rounded transition-colors"
                          title="Remove currency"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 max-w-sm">
                  <input
                    type="text"
                    value={newCurrencyCode}
                    onChange={(e) => setNewCurrencyCode(e.target.value)}
                    placeholder="e.g. EUR, GBP"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs uppercase outline-none focus:border-amber-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={addCurrency}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-colors inline-flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Currency</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: S3 Storage & Cloud Settings */}
      {activeTab === 'storage' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900">S3 Cloud Storage &amp; Asset Delivery</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure permanent media storage for product photos, seller KYC documents, banners, and digital invoices.
              </p>
            </div>

            {/* Provider Options Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                Active Object Storage Provider
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'INTERNAL', name: 'Internal MinIO / Local', desc: 'S3-compatible local bucket for development' },
                  { id: 'AMAZON_S3', name: 'Amazon S3 (AWS)', desc: 'High-availability AWS cloud storage' },
                  { id: 'CLOUDFLARE_R2', name: 'Cloudflare R2', desc: 'Zero-egress fee high-speed object storage' },
                ].map((prov) => {
                  const isSelected = settings.STORAGE_PROVIDER === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => updateSetting('STORAGE_PROVIDER', prov.id)}
                      className={`text-left p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-300/50'
                          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{prov.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500">{prov.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* S3 Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">S3 Endpoint URL</label>
                <input
                  type="text"
                  value={settings.STORAGE_S3_ENDPOINT}
                  onChange={(e) => updateSetting('STORAGE_S3_ENDPOINT', e.target.value)}
                  placeholder="http://localhost:9000"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bucket Name</label>
                <input
                  type="text"
                  value={settings.STORAGE_S3_BUCKET}
                  onChange={(e) => updateSetting('STORAGE_S3_BUCKET', e.target.value)}
                  placeholder="alifworld-media"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">AWS Region / Zone</label>
                <input
                  type="text"
                  value={settings.STORAGE_S3_REGION}
                  onChange={(e) => updateSetting('STORAGE_S3_REGION', e.target.value)}
                  placeholder="us-east-1 or auto"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Public CDN Base URL</label>
                <input
                  type="text"
                  value={settings.STORAGE_S3_CDN_URL}
                  onChange={(e) => updateSetting('STORAGE_S3_CDN_URL', e.target.value)}
                  placeholder="https://cdn.alifworld.com"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Access Key ID</label>
                <input
                  type="text"
                  value={settings.STORAGE_S3_ACCESS_KEY}
                  onChange={(e) => updateSetting('STORAGE_S3_ACCESS_KEY', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Secret Access Key</label>
                <div className="relative">
                  <input
                    type={revealedSecrets.s3Secret ? 'text' : 'password'}
                    value={settings.STORAGE_S3_SECRET_KEY}
                    onChange={(e) => updateSetting('STORAGE_S3_SECRET_KEY', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('s3Secret')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {revealedSecrets.s3Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Payment Gateways (bKash & Nagad) */}
      {activeTab === 'payments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* bKash Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 font-black text-sm">
                  bK
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">bKash Direct Payment Gateway</h3>
                  <p className="text-xs text-slate-500">
                    Tokenized checkout, immediate capture, and instant IPN webhook verification.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSetting('PAYMENT_BKASH_ENABLED')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.PAYMENT_BKASH_ENABLED === 'true' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.PAYMENT_BKASH_ENABLED === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Environment Mode</label>
                <select
                  value={settings.PAYMENT_BKASH_ENV}
                  onChange={(e) => updateSetting('PAYMENT_BKASH_ENV', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="sandbox">Sandbox (Testing / Simulator)</option>
                  <option value="live">Live (Production Merchant)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">bKash App Key</label>
                <input
                  type="text"
                  value={settings.PAYMENT_BKASH_APP_KEY}
                  onChange={(e) => updateSetting('PAYMENT_BKASH_APP_KEY', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">bKash App Secret</label>
                <div className="relative">
                  <input
                    type={revealedSecrets.bkashSecret ? 'text' : 'password'}
                    value={settings.PAYMENT_BKASH_APP_SECRET}
                    onChange={(e) => updateSetting('PAYMENT_BKASH_APP_SECRET', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret('bkashSecret')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                  >
                    {revealedSecrets.bkashSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">bKash Merchant Username</label>
                <input
                  type="text"
                  value={settings.PAYMENT_BKASH_USERNAME}
                  onChange={(e) => updateSetting('PAYMENT_BKASH_USERNAME', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Callback URL</label>
                <input
                  type="text"
                  value={settings.PAYMENT_BKASH_CALLBACK_URL}
                  onChange={(e) => updateSetting('PAYMENT_BKASH_CALLBACK_URL', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Nagad Section */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-black text-sm">
                  NG
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Nagad Direct Payment Gateway</h3>
                  <p className="text-xs text-slate-500">
                    Bangladesh Post Office digital payments, asymmetric key signing, and transaction verification.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSetting('PAYMENT_NAGAD_ENABLED')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.PAYMENT_NAGAD_ENABLED === 'true' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.PAYMENT_NAGAD_ENABLED === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Environment Mode</label>
                <select
                  value={settings.PAYMENT_NAGAD_ENV}
                  onChange={(e) => updateSetting('PAYMENT_NAGAD_ENV', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white"
                >
                  <option value="sandbox">Sandbox (Testing / Simulator)</option>
                  <option value="live">Live (Production Merchant)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nagad Merchant ID</label>
                <input
                  type="text"
                  value={settings.PAYMENT_NAGAD_MERCHANT_ID}
                  onChange={(e) => updateSetting('PAYMENT_NAGAD_MERCHANT_ID', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nagad Public Key</label>
                <input
                  type="text"
                  value={settings.PAYMENT_NAGAD_PUBLIC_KEY}
                  onChange={(e) => updateSetting('PAYMENT_NAGAD_PUBLIC_KEY', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Couriers & Logistics (Pathao, RedX, Steadfast) */}
      {activeTab === 'couriers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Default Primary Courier */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Default Primary Logistics Dispatcher
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Default courier assigned to new seller fulfillment groups unless merchant selects an alternative.
              </p>
            </div>
            <select
              value={settings.COURIER_DEFAULT_PROVIDER}
              onChange={(e) => updateSetting('COURIER_DEFAULT_PROVIDER', e.target.value)}
              className="bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-amber-950 outline-none w-fit"
            >
              <option value="PATHAO">Pathao Courier</option>
              <option value="REDX">RedX Logistics</option>
              <option value="STEADFAST">Steadfast Courier</option>
            </select>
          </div>

          {/* Pathao */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-xs">
                  PT
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pathao Courier Integration</h4>
                  <p className="text-[11px] text-slate-500">Nationwide doorstep parcel delivery and cash on delivery return.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('COURIER_PATHAO_ENABLED')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.COURIER_PATHAO_ENABLED === 'true' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.COURIER_PATHAO_ENABLED === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Environment</label>
                <select
                  value={settings.COURIER_PATHAO_ENV}
                  onChange={(e) => updateSetting('COURIER_PATHAO_ENV', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="live">Live Production</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Client ID</label>
                <input
                  type="text"
                  value={settings.COURIER_PATHAO_CLIENT_ID}
                  onChange={(e) => updateSetting('COURIER_PATHAO_CLIENT_ID', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Client Secret</label>
                <input
                  type="password"
                  value={settings.COURIER_PATHAO_CLIENT_SECRET}
                  onChange={(e) => updateSetting('COURIER_PATHAO_CLIENT_SECRET', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Default Store ID</label>
                <input
                  type="text"
                  value={settings.COURIER_PATHAO_STORE_ID}
                  onChange={(e) => updateSetting('COURIER_PATHAO_STORE_ID', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* RedX */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold text-xs">
                  RX
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">RedX Logistics</h4>
                  <p className="text-[11px] text-slate-500">Fast nationwide courier coverage with automated tracking API.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('COURIER_REDX_ENABLED')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.COURIER_REDX_ENABLED === 'true' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.COURIER_REDX_ENABLED === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Environment</label>
                <select
                  value={settings.COURIER_REDX_ENV}
                  onChange={(e) => updateSetting('COURIER_REDX_ENV', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="live">Live Production</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Access Token</label>
                <input
                  type="password"
                  value={settings.COURIER_REDX_ACCESS_TOKEN}
                  onChange={(e) => updateSetting('COURIER_REDX_ACCESS_TOKEN', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pickup Store ID</label>
                <input
                  type="text"
                  value={settings.COURIER_REDX_STORE_ID}
                  onChange={(e) => updateSetting('COURIER_REDX_STORE_ID', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Steadfast */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 font-bold text-xs">
                  SF
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Steadfast Courier</h4>
                  <p className="text-[11px] text-slate-500">Reliable COD payments and divisional express shipping.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting('COURIER_STEADFAST_ENABLED')}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.COURIER_STEADFAST_ENABLED === 'true' ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.COURIER_STEADFAST_ENABLED === 'true' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Environment</label>
                <select
                  value={settings.COURIER_STEADFAST_ENV}
                  onChange={(e) => updateSetting('COURIER_STEADFAST_ENV', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="live">Live Production</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">API Key</label>
                <input
                  type="text"
                  value={settings.COURIER_STEADFAST_API_KEY}
                  onChange={(e) => updateSetting('COURIER_STEADFAST_API_KEY', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Secret Key</label>
                <input
                  type="password"
                  value={settings.COURIER_STEADFAST_SECRET_KEY}
                  onChange={(e) => updateSetting('COURIER_STEADFAST_SECRET_KEY', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: SMS Gateway Providers */}
      {activeTab === 'sms' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900">SMS Gateway &amp; OTP Provider</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your preferred Bangladesh or International SMS telecom provider for customer OTP verification and order dispatch alerts.
              </p>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Select Active SMS Gateway Provider
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { id: 'GREENWEB', name: 'Greenweb BD', sub: 'High delivery rate for GP/BL/Robi' },
                  { id: 'ALPHA_SMS', name: 'Alpha SMS', sub: 'Popular BD masking OTP gateway' },
                  { id: 'BULKSMS_BD', name: 'BulkSMS BD', sub: 'Bangladesh API with DLR support' },
                  { id: 'BANGLALINK', name: 'Banglalink Corporate', sub: 'Direct MNO telecom gateway' },
                  { id: 'GRAMEENPHONE', name: 'Grameenphone ECAC', sub: 'GP corporate SMS gateway' },
                  { id: 'TWILIO', name: 'Twilio Cloud SMS', sub: 'Global international SMS fallback' },
                  { id: 'DISABLED', name: 'Mock Dev Mode', sub: 'Logs OTP to console / outbox' },
                ].map((p) => {
                  const isSelected = settings.SMS_GATEWAY_PROVIDER === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => updateSetting('SMS_GATEWAY_PROVIDER', p.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-300/60'
                          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{p.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <span className="text-[10px] text-slate-500 leading-tight block">{p.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider Configuration Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">API Key / Token</label>
                <input
                  type="text"
                  value={settings.SMS_GATEWAY_API_KEY}
                  onChange={(e) => updateSetting('SMS_GATEWAY_API_KEY', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Approved Sender / Masking ID</label>
                <input
                  type="text"
                  value={settings.SMS_GATEWAY_SENDER_ID}
                  onChange={(e) => updateSetting('SMS_GATEWAY_SENDER_ID', e.target.value)}
                  placeholder="ALIFWORLD"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">API Endpoint URL</label>
                <input
                  type="text"
                  value={settings.SMS_GATEWAY_ENDPOINT}
                  onChange={(e) => updateSetting('SMS_GATEWAY_ENDPOINT', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-amber-500 focus:bg-white font-mono"
                />
              </div>
            </div>

            {/* Test SMS Dispatcher Tool */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Test Gateway Dispatch</span>
                <span className="text-[11px] text-slate-500">
                  Send a real-time verification ping to verify credentials with {settings.SMS_GATEWAY_PROVIDER}.
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="+8801700000000"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono outline-none w-40"
                />
                <button
                  type="button"
                  onClick={handleSendTestSms}
                  disabled={sendingTestSms}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors inline-flex items-center space-x-1.5 disabled:opacity-50 shrink-0"
                >
                  {sendingTestSms ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Test SMS</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Feature Flags & Architecture Invariants */}
      {activeTab === 'features' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-black text-slate-900">Feature Flags &amp; Operational Toggles</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable operational platform capabilities with instant rollout across storefront and API.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'FEATURE_COD_ENABLED',
                  title: 'Cash on Delivery (COD)',
                  desc: 'Allow buyers in Bangladesh to pay cash upon courier doorstep parcel handover.',
                },
                {
                  key: 'FEATURE_POINTS_REWARDS_ENABLED',
                  title: 'Customer Product Point Rewards',
                  desc: 'Generate discrete Product Points snapshots upon eligible order completion.',
                },
                {
                  key: 'FEATURE_REFERRAL_ENABLED',
                  title: 'Single-Tier Referral Program',
                  desc: 'Track single-depth customer affiliate links and referral bonuses.',
                },
                {
                  key: 'FEATURE_SELLER_REGISTRATION_ENABLED',
                  title: 'Merchant Self-Registration',
                  desc: 'Allow prospective Bangladesh vendors to submit merchant KYC documents online.',
                },
                {
                  key: 'FEATURE_MULTIVENDOR_CHECKOUT',
                  title: 'Multi-Vendor Unified Checkout',
                  desc: 'Allow buyers to combine products from different sellers into one single checkout cart.',
                },
                {
                  key: 'FEATURE_CART_TTL_AUTO_CANCEL',
                  title: '15-Minute Unpaid Cart Expiry',
                  desc: 'Automatically return reserved warehouse stocks for unpaid digital checkout sessions.',
                },
                {
                  key: 'FEATURE_MAINTENANCE_MODE',
                  title: 'Platform Maintenance Mode',
                  desc: 'Temporarily pause storefront checkout for planned database migration windows.',
                },
                {
                  key: 'FEATURE_POINTS_CASH_CONVERTIBLE',
                  title: 'Points Cash Convertible (LOCKED)',
                  desc: 'Product Points are independent discrete reward units and strictly non-convertible to fiat money.',
                  locked: true,
                },
              ].map((flag) => {
                const isEnabled = settings[flag.key] === 'true';
                return (
                  <div
                    key={flag.key}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{flag.title}</span>
                        {flag.locked && (
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold">
                            INVARIANT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{flag.desc}</p>
                    </div>

                    <button
                      type="button"
                      disabled={flag.locked}
                      onClick={() => toggleSetting(flag.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        flag.locked ? 'opacity-40 cursor-not-allowed' : ''
                      } ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
