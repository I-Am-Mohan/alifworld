'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default function SellerSettingsPage() {
  const [supportEmail, setSupportEmail] = useState('support@dhakatech.com');
  const [supportPhone, setSupportPhone] = useState('+8801711223344');
  const [streetAddress, setStreetAddress] = useState('House 12, Road 4, Dhanmondi R/A');
  const [division, setDivision] = useState('DHAKA');
  const [district, setDistrict] = useState('Dhaka');
  const [postalCode, setPostalCode] = useState('1205');
  const [defaultCourier, setDefaultCourier] = useState('PATHAO');
  const [vacationMode, setVacationMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
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
                        value="Dhaka Tech Electronics"
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
                        value="dhaka-tech"
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
