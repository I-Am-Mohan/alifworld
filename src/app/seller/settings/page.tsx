'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/i18n/context';
import { csrfFetch } from '@/shared/security/csrf-client';

export const dynamic = 'force-dynamic';

export default function SellerSettingsPage() {
  const { t } = useI18n();
  const [sellerId, setSellerId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [sellerVersion, setSellerVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('+8801711223344');
  const [streetAddress, setStreetAddress] = useState('House 12, Road 4, Dhanmondi R/A');
  const [division, setDivision] = useState('DHAKA');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [defaultCourier, setDefaultCourier] = useState('PATHAO');
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationMessage, setVacationMessage] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [shippingPolicy, setShippingPolicy] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [publicEmailEnabled, setPublicEmailEnabled] = useState(false);
  const [publicPhoneEnabled, setPublicPhoneEnabled] = useState(false);
  const [publicPickupAddressEnabled, setPublicPickupAddressEnabled] = useState(false);
  const [brandingFile, setBrandingFile] = useState<File | null>(null);
  const [brandingType, setBrandingType] = useState<'LOGO' | 'BANNER'>('LOGO');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const profileResponse = await fetch('/api/v1/seller/profile');
      const profileJson = await profileResponse.json().catch(() => null);
      if (!profileResponse.ok || !profileJson?.success) throw new Error(profileJson?.error?.message || 'Unable to load seller profile.');
      setSellerId(profileJson.data.id);
      setBusinessName(profileJson.data.businessName || '');
      setSlug(profileJson.data.slug || '');
      setSellerVersion(profileJson.data.settings?.version || 1);
      const settings = profileJson.data.settings;
      setSupportEmail(settings?.supportEmail || '');
      setSupportPhone(settings?.supportPhone || '');
      setVacationMode(settings?.vacationMode || false);
      setVacationMessage(settings?.vacationMessage || '');
      setStoreDescription(settings?.storeDescription || '');
      setShippingPolicy(settings?.shippingPolicy || '');
      setReturnPolicy(settings?.returnPolicy || '');
      setCancellationPolicy(settings?.cancellationPolicy || '');
      setPublicEmailEnabled(settings?.publicEmailEnabled || false);
      setPublicPhoneEnabled(settings?.publicPhoneEnabled || false);
      setPublicPickupAddressEnabled(settings?.publicPickupAddressEnabled || false);
      setDefaultCourier(settings?.defaultCourier || 'PATHAO');
      const address = settings?.pickupAddress;
      if (address) {
        setStreetAddress(address.streetAddress || '');
        setDivision(address.division || 'DHAKA');
        setDistrict(address.district || '');
        setUpazila(address.upazila || '');
        setPostalCode(address.postalCode || '');
      }
    } catch (error: any) {
      setSaveError(error.message || 'Unable to load seller profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveError(null);
      const response = await csrfFetch('/api/v1/seller/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, supportEmail: supportEmail || null, supportPhone: supportPhone || null, pickupAddress: { division, district, upazila, streetAddress, postalCode }, defaultCourier, vacationMode, vacationMessage: vacationMessage || null, storeDescription: storeDescription || null, shippingPolicy: shippingPolicy || null, returnPolicy: returnPolicy || null, cancellationPolicy: cancellationPolicy || null, publicEmailEnabled, publicPhoneEnabled, publicPickupAddressEnabled, version: sellerVersion }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.error?.message || 'Unable to save seller settings.');
      setSellerVersion(json.data.version);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (error: any) {
      setSaveError(error.message || 'Unable to save seller settings.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-bold">
                Seller Center
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                Store Profile &amp; Logistics Settings
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/seller/products"
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
            >
              Manage Products
            </Link>
            <Link
              href="/seller"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {loading && <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">{t('common.loading')}</div>}
        {saveError && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">{saveError}</div>}
        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <span>✓</span>
            <span>Store logistics settings successfully updated. Saved under OCC version control.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Form: 2 Cols */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Brand & Contacts */}
              <Card className="p-6 bg-white border-slate-200">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6A00] mr-2 inline-block" />
                  Merchant Contacts &amp; Storefront Identity
                </h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Registered Business Name
                      </label>
                      <input
                        type="text"
                        disabled
                        value={businessName}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Storefront URL Handle (Slug)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={slug}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-[#0284C7] font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Customer Support Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Support Hotline (E.164 BD Phone) *
                      </label>
                      <input
                        type="text"
                        required
                        value={supportPhone}
                        onChange={(e) => setSupportPhone(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="space-y-5 bg-white p-6">
                <h2 className="text-base font-bold text-slate-900">{t('sellerProfile.branding')}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([['LOGO', 'sellerProfile.logo'], ['BANNER', 'sellerProfile.banner']] as const).map(([type, label]) => (
                    <label key={type} className="block text-xs font-semibold text-slate-700">{t(label)}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { setBrandingType(type); setBrandingFile(event.target.files?.[0] || null); }} className="mt-2 block w-full rounded-lg border border-slate-300 p-2 text-xs" />
                    </label>
                  ))}
                </div>
                <button type="button" disabled={!brandingFile || !sellerId} onClick={async () => { if (!brandingFile) return; const form = new FormData(); form.set('sellerId', sellerId); form.set('assetType', brandingType); form.set('version', String(sellerVersion)); form.set('file', brandingFile); const response = await csrfFetch('/api/v1/seller/settings/branding', { method: 'POST', body: form }); const json = await response.json().catch(() => null); if (!response.ok || !json?.success) { setSaveError(json?.error?.message || t('sellerProfile.brandingFailed')); return; } setSellerVersion(json.data.version); setBrandingFile(null); setSaveSuccess(true); }} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">{t('sellerProfile.uploadBranding')}</button>
                <h2 className="pt-3 text-base font-bold text-slate-900">{t('sellerProfile.policies')}</h2>
                {([['storeDescription', storeDescription, setStoreDescription, 'sellerProfile.description'], ['shippingPolicy', shippingPolicy, setShippingPolicy, 'sellerProfile.shippingPolicy'], ['returnPolicy', returnPolicy, setReturnPolicy, 'sellerProfile.returnPolicy'], ['cancellationPolicy', cancellationPolicy, setCancellationPolicy, 'sellerProfile.cancellationPolicy']] as const).map(([key, value, setter, label]) => <label key={key} className="block text-xs font-semibold text-slate-700">{t(label)}<textarea value={value} onChange={(event) => setter(event.target.value)} maxLength={key === 'storeDescription' ? 2000 : 4000} className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 p-2.5 text-xs" /></label>)}
                <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-700"><h2 className="text-base font-bold text-slate-900">{t('sellerProfile.publicContacts')}</h2><label className="flex gap-2"><input type="checkbox" checked={publicEmailEnabled} onChange={(event) => setPublicEmailEnabled(event.target.checked)} />{t('sellerProfile.publicEmail')}</label><label className="flex gap-2"><input type="checkbox" checked={publicPhoneEnabled} onChange={(event) => setPublicPhoneEnabled(event.target.checked)} />{t('sellerProfile.publicPhone')}</label><label className="flex gap-2"><input type="checkbox" checked={publicPickupAddressEnabled} onChange={(event) => setPublicPickupAddressEnabled(event.target.checked)} />{t('sellerProfile.publicPickup')}</label></div>
              </Card>

              {/* Warehouse Depot & Pickup Location */}
              <Card className="p-6 bg-white border-slate-200">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] mr-2 inline-block" />
                  Primary Logistics Warehouse &amp; Pickup Address
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Street Address (House, Road, Area) *
                    </label>
                    <input
                      type="text"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Division *
                      </label>
                      <select
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                      >
                        <option value="DHAKA">Dhaka</option>
                        <option value="CHITTAGONG">Chittagong</option>
                        <option value="RAJSHAHI">Rajshahi</option>
                        <option value="KHULNA">Khulna</option>
                        <option value="BARISAL">Barisal</option>
                        <option value="SYLHET">Sylhet</option>
                        <option value="RANGPUR">Rangpur</option>
                        <option value="MYMENSINGH">Mymensingh</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        District *
                      </label>
                      <input
                        type="text"
                        required
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Upazila / Thana *
                      </label>
                      <input
                        type="text"
                        required
                        value={upazila}
                        onChange={(e) => setUpazila(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Courier Defaults & Vacation Mode */}
              <Card className="p-6 bg-white border-slate-200">
                <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2 inline-block" />
                  Courier Integration &amp; Vacation Mode
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Courier Provider
                    </label>
                    <select
                      value={defaultCourier}
                      onChange={(e) => setDefaultCourier(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                    >
                      <option value="PATHAO">Pathao Courier (Same-Day Dhaka &amp; Nationwide)</option>
                      <option value="STEADFAST">Steadfast Logistics (Nationwide Coverage)</option>
                      <option value="REDX">RedX Logistics</option>
                      <option value="PAPERFLY">Paperfly</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vacationMode}
                        onChange={(e) => setVacationMode(e.target.checked)}
                        className="rounded border-slate-300 text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Vacation Mode</div>
                        <div className="text-[11px] text-slate-500">
                          Temporarily pauses storefront checkout for your products while preserving ratings.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <Button
                    type="submit"
                    className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs px-6 py-2.5 shadow-sm shadow-orange-500/25"
                  >
                    Save Configuration
                  </Button>
                </div>
              </Card>
            </form>
          </div>

          {/* Right Sidebar: Regulatory Credentials */}
          <div className="space-y-6">
            <Card className="p-6 bg-white border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Regulatory Credentials</h3>
              <p className="text-xs text-slate-500 mb-4">
                These credentials are verified by platform operations. Contact support to update legal tax records.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono">TRADE LICENSE</span>
                  <span className="font-mono font-bold text-slate-800">TRAD/DNCC/042189/2024</span>
                  <Badge variant="success" size="sm" className="mt-1 block w-fit">VERIFIED</Badge>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono">NBR 13-DIGIT BIN</span>
                  <span className="font-mono font-bold text-slate-800">0012345678901</span>
                  <Badge variant="success" size="sm" className="mt-1 block w-fit">VERIFIED</Badge>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono">12-DIGIT TIN</span>
                  <span className="font-mono font-bold text-slate-800">123456789012</span>
                  <Badge variant="success" size="sm" className="mt-1 block w-fit">VERIFIED</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
