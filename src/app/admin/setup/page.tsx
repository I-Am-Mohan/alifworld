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
  ArrowLeftRight,
  Languages,
  Check,
  X,
  Coins,
} from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { CurrencyConfig, DEFAULT_CURRENCIES, parseCurrencies, formatCurrencyAmount } from '@/shared/types/currency';
import { LanguageDefinition } from '@/i18n/types';

type SetupTab = 'localization' | 'storage' | 'payments' | 'couriers' | 'sms' | 'features';

export default function AdminSetupPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SetupTab>('localization');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 3-Option Currency Management State
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [newCurrencyPosition, setNewCurrencyPosition] = useState<'left' | 'right'>('left');

  // Database-driven platform languages state
  const [languages, setLanguages] = useState<LanguageDefinition[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangNativeName, setNewLangNativeName] = useState('');
  const [newLangWord, setNewLangWord] = useState('');
  const [newLangDirection, setNewLangDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [showAddLangModal, setShowAddLangModal] = useState(false);

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
    PLATFORM_CURRENCIES: JSON.stringify(DEFAULT_CURRENCIES),
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

  const loadLanguages = async () => {
    try {
      setLoadingLanguages(true);
      const res = await fetch('/api/v1/system/languages');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLanguages(json.data.languages || []);
          if (json.data.defaultLocale) {
            updateSetting('PLATFORM_DEFAULT_LOCALE', json.data.defaultLocale);
          }
        }
      }
    } catch {
      // Fallback silently to defaults
    } finally {
      setLoadingLanguages(false);
    }
  };

  // Fetch settings and database languages on mount
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
    loadLanguages();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSetting = (key: string) => {
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
        showToast(t('admin.setupSaved'));
        await loadLanguages();
      } else {
        throw new Error(json?.error?.message || t('admin.saveSettingsFailed'));
      }
    } catch (err: any) {
      showToast(err.message || t('admin.saveSettingsError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Database-Backed Language Management Handlers
  // ---------------------------------------------------------------------------
  const handleSetDefaultLanguage = async (code: string) => {
    try {
      const res = await fetch('/api/v1/system/languages/default', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultLocale: code }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        updateSetting('PLATFORM_DEFAULT_LOCALE', code);
        await loadLanguages();
        showToast(t('admin.defaultLanguageUpdated', { code }));
      } else {
        throw new Error(json.error?.message || t('admin.defaultLanguageFailed'));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newLangCode.trim().toLowerCase();
    const cleanName = newLangName.trim();
    const cleanNative = newLangNativeName.trim();
    const cleanWord = newLangWord.trim();

    if (!cleanCode || !cleanName || !cleanNative || !cleanWord) {
      showToast(t('admin.languageFieldsRequired'), 'error');
      return;
    }

    try {
      const res = await fetch('/api/v1/system/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: cleanCode,
          name: cleanName,
          nativeName: cleanNative,
          wordForLanguage: cleanWord,
          direction: newLangDirection,
          isActive: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(t('admin.languageRegistered', { name: cleanName }));
        setNewLangCode('');
        setNewLangName('');
        setNewLangNativeName('');
        setNewLangWord('');
        setNewLangDirection('ltr');
        setShowAddLangModal(false);
        await loadLanguages();
      } else {
        throw new Error(json.error?.message || t('admin.languageRegisterFailed'));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleLanguageStatus = async (code: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/system/languages/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          t('admin.languageStatusUpdated', {
            code,
            status: !currentStatus ? t('admin.activated') : t('admin.deactivated'),
          })
        );
        await loadLanguages();
      } else {
        throw new Error(json.error?.message || t('admin.languageUpdateFailed'));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteLanguage = async (code: string) => {
    if (code === settings.PLATFORM_DEFAULT_LOCALE) {
      showToast(t('admin.defaultLanguageCannotDelete'), 'error');
      return;
    }
    try {
      const res = await fetch(`/api/v1/system/languages/${code}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(t('admin.languageRemoved', { code }));
        await loadLanguages();
      } else {
        throw new Error(json.error?.message || t('admin.languageRemoveFailed'));
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // 3-Option Currency Management Handlers (Name, Symbol, Position: left|right)
  // ---------------------------------------------------------------------------
  const currencies: CurrencyConfig[] = parseCurrencies(settings.PLATFORM_CURRENCIES);

  const addCurrency = () => {
    const cleanName = newCurrencyName.trim().toUpperCase();
    const cleanSymbol = newCurrencySymbol.trim();
    if (!cleanName || !cleanSymbol) {
      showToast(t('admin.currencyNameSymbolRequired'), 'error');
      return;
    }
    if (currencies.some((c) => c.name === cleanName)) {
      showToast(t('admin.currencyAlreadyExists', { name: cleanName }), 'error');
      return;
    }
    const updated = [
      ...currencies,
      { name: cleanName, symbol: cleanSymbol, position: newCurrencyPosition },
    ];
    updateSetting('PLATFORM_CURRENCIES', JSON.stringify(updated));
    setNewCurrencyName('');
    setNewCurrencySymbol('');
    setNewCurrencyPosition('left');
    showToast(
      t('admin.currencyAdded', {
        name: cleanName,
        symbol: cleanSymbol,
        position: newCurrencyPosition,
      })
    );
  };

  const removeCurrency = (name: string) => {
    if (name === settings.PLATFORM_CURRENCY) {
      showToast(t('admin.primaryCurrencyCannotRemove', { name }), 'error');
      return;
    }
    if (currencies.length <= 1) {
      showToast(t('admin.currencyRequired'), 'error');
      return;
    }
    const updated = currencies.filter((c) => c.name !== name);
    updateSetting('PLATFORM_CURRENCIES', JSON.stringify(updated));
    showToast(t('admin.currencyRemoved', { name }));
  };

  const toggleCurrencyPosition = (name: string) => {
    const updated = currencies.map((c) =>
      c.name === name
        ? { ...c, position: (c.position === 'left' ? 'right' : 'left') as 'left' | 'right' }
        : c
    );
    updateSetting('PLATFORM_CURRENCIES', JSON.stringify(updated));
    const target = updated.find((c) => c.name === name);
    showToast(t('admin.currencyPositionSwitched', { name, position: target?.position || '' }));
  };

  const handleSendTestSms = async () => {
    setSendingTestSms(true);
    setTimeout(() => {
      setSendingTestSms(false);
      showToast(
        t('admin.testSmsDispatched', {
          phone: testPhoneNumber,
          provider: settings.SMS_GATEWAY_PROVIDER,
        })
      );
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
      {/* Tab 1: Localization & Multi-Currency */}
      {activeTab === 'localization' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xs">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-amber-600" />
                  <span>Regional &amp; Localization Parameters</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform business timezone, dynamic database-managed languages, and 3-option multi-currency settings.
                </p>
              </div>
              <button
                type="button"
                onClick={loadLanguages}
                disabled={loadingLanguages}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLanguages ? 'animate-spin' : ''}`} />
                <span>Sync DB Locales</span>
              </button>
            </div>

            {/* Timezone and Default Language */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Platform Timezone */}
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

              {/* Default Language (Database-Driven) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Default Platform Language (Database Controlled)
                </label>
                <select
                  value={settings.PLATFORM_DEFAULT_LOCALE}
                  onChange={(e) => handleSetDefaultLanguage(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 font-medium"
                >
                  {languages.length > 0 ? (
                    languages.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.nativeName}) — [{l.code}] {l.isDefault ? '• ACTIVE DEFAULT' : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="bn">বাংলা (Bengali) — [bn]</option>
                      <option value="en">English — [en]</option>
                    </>
                  )}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  System default locale stored in PostgreSQL <code className="text-amber-700 font-mono">system_configs</code> table.
                </span>
              </div>
            </div>

            {/* Section: Supported Platform Languages (Database Controlled) */}
            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                    <Languages className="w-4 h-4 text-amber-600" />
                    <span>Supported Platform Languages (Database Controlled)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dynamic language registry managed in the database. Active languages automatically power the customer storefront language switcher.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddLangModal(!showAddLangModal)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddLangModal ? 'Close Form' : 'Add Supported Language'}</span>
                </button>
              </div>

              {/* Add Language Form (Expandable) */}
              {showAddLangModal && (
                <form
                  onSubmit={handleAddLanguage}
                  className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4 animate-in fade-in duration-150"
                >
                  <div className="text-xs font-bold text-amber-950 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Register New Platform Language in Database</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Language Code *
                      </label>
                      <input
                        type="text"
                        value={newLangCode}
                        onChange={(e) => setNewLangCode(e.target.value)}
                        placeholder="e.g. ar, hi, ur"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={newLangName}
                        onChange={(e) => setNewLangName(e.target.value)}
                        placeholder="e.g. Arabic, Hindi"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Native Script *
                      </label>
                      <input
                        type="text"
                        value={newLangNativeName}
                        onChange={(e) => setNewLangNativeName(e.target.value)}
                        placeholder="e.g. العربية, हिन्दी"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Word for &quot;Language&quot; *
                      </label>
                      <input
                        type="text"
                        value={newLangWord}
                        onChange={(e) => setNewLangWord(e.target.value)}
                        placeholder="e.g. لغة, भाषा"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Direction *
                      </label>
                      <select
                        value={newLangDirection}
                        onChange={(e) => setNewLangDirection(e.target.value as 'ltr' | 'rtl')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-amber-500"
                      >
                        <option value="ltr">LTR (Left to Right)</option>
                        <option value="rtl">RTL (Right to Left)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddLangModal(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      Save Language to Database
                    </button>
                  </div>
                </form>
              )}

              {/* Registered Languages Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {languages.map((l) => {
                  const isDefault = l.code === settings.PLATFORM_DEFAULT_LOCALE || l.isDefault;
                  return (
                    <div
                      key={l.code}
                      className={`p-4 rounded-2xl border transition-all ${
                        isDefault
                          ? 'border-amber-300 bg-amber-50/40 shadow-xs ring-1 ring-amber-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-slate-900">{l.name}</span>
                            <span className="text-xs text-slate-600 font-semibold">({l.nativeName})</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-700 uppercase">
                              {l.code}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono font-semibold text-slate-600 uppercase">
                              {l.direction}
                            </span>
                            <span className="text-[11px] text-slate-500 italic">
                              &ldquo;{l.wordForLanguage}&rdquo;
                            </span>
                          </div>
                        </div>

                        {isDefault ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                            DEFAULT
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteLanguage(l.code)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove language from database"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleLanguageStatus(l.code, l.isActive)}
                          disabled={isDefault}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                            l.isActive
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          } ${isDefault ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${l.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{l.isActive ? 'Active' : 'Inactive'}</span>
                        </button>

                        {!isDefault && l.isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultLanguage(l.code)}
                            className="text-amber-700 hover:text-amber-900 font-bold text-[11px] hover:underline cursor-pointer"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: Multi-Currency Management (3 Options: Name, Symbol, Position) */}
            <div className="pt-6 border-t border-slate-100 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>Currency Management (3 Configurable Options)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Manage platform settlement currencies with 3 required specifications: <strong>1. Currency Name (Code)</strong>, <strong>2. Currency Symbol</strong>, and <strong>3. Position (Left vs Right)</strong>.
                </p>
              </div>

              {/* Default Platform Currency Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Default Platform Base Currency
                  </label>
                  <select
                    value={settings.PLATFORM_CURRENCY}
                    onChange={(e) => updateSetting('PLATFORM_CURRENCY', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 font-medium"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.name} value={curr.name}>
                        {curr.name} ({curr.symbol}) — Symbol on {curr.position === 'left' ? `Left (${curr.symbol} 100)` : `Right (100 ${curr.symbol})`}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Authoritative base unit. Order snapshots, ledger postings, and wallet balances are denominated in this currency.
                  </span>
                </div>

                {/* Add New Currency Form with 3 Options */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add New Currency (Specify 3 Options)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Option 1: Currency Name */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        1. Name (Code) *
                      </label>
                      <input
                        type="text"
                        value={newCurrencyName}
                        onChange={(e) => setNewCurrencyName(e.target.value)}
                        placeholder="e.g. INR, USD, EUR"
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs uppercase outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    {/* Option 2: Currency Symbol */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        2. Symbol *
                      </label>
                      <input
                        type="text"
                        value={newCurrencySymbol}
                        onChange={(e) => setNewCurrencySymbol(e.target.value)}
                        placeholder="e.g. ₹, $, €, ৳"
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    {/* Option 3: Currency Position */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        3. Position *
                      </label>
                      <select
                        value={newCurrencyPosition}
                        onChange={(e) => setNewCurrencyPosition(e.target.value as 'left' | 'right')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs outline-none focus:border-amber-500 font-medium"
                      >
                        <option value="left">Left ({newCurrencySymbol || '৳'} 100)</option>
                        <option value="right">Right (100 {newCurrencySymbol || '৳'})</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Preview:{' '}
                      <strong className="text-slate-900">
                        {newCurrencyPosition === 'left'
                          ? `${newCurrencySymbol || '৳'} 1,500.00`
                          : `1,500.00 ${newCurrencySymbol || '৳'}`}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={addCurrency}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Currency</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Registered Currencies Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Registered Platform Currencies ({currencies.length})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currencies.map((curr) => {
                    const isPrimary = curr.name === settings.PLATFORM_CURRENCY;
                    return (
                      <div
                        key={curr.name}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPrimary
                            ? 'border-emerald-300 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-200'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-900 font-black text-base flex items-center justify-center shrink-0">
                              {curr.symbol}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-black text-slate-900">{curr.name}</span>
                                <span className="text-xs text-slate-500 font-semibold font-mono">({curr.symbol})</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 mt-0.5 block">
                                {formatCurrencyAmount(1250, curr)}
                              </span>
                            </div>
                          </div>

                          {isPrimary ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                              PRIMARY
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeCurrency(curr.name)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove currency"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          {/* Position Switcher Toggle */}
                          <button
                            type="button"
                            onClick={() => toggleCurrencyPosition(curr.name)}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Click to toggle symbol position between left and right"
                          >
                            <ArrowLeftRight className="w-3 h-3 text-slate-500" />
                            <span>
                              Position: {curr.position === 'left' ? 'Left' : 'Right'} (
                              {curr.position === 'left' ? `${curr.symbol} 100` : `100 ${curr.symbol}`})
                            </span>
                          </button>

                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => updateSetting('PLATFORM_CURRENCY', curr.name)}
                              className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] hover:underline cursor-pointer"
                            >
                              Make Primary
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  title: 'Points Cash Convertible',
                  desc: 'Enable or disable converting customer loyalty Product Points into wallet balance or checkout cash discounts.',
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
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{flag.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSetting(flag.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
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
