'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function CustomerAccountPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'preferences' | 'consent' | 'security' | 'organization'>('profile');
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile form states
  const [name, setName] = useState('Rahim Ahmed');
  const [email] = useState('rahim.ahmed@example.com');
  const [phone] = useState('+8801711223344');
  const [preferredLang, setPreferredLang] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const [profileVersion, setProfileVersion] = useState(1);

  // Address Book states
  const [addresses, setAddresses] = useState([
    {
      id: 'addr_01',
      label: 'Home (বাসা)',
      recipientName: 'Rahim Ahmed',
      recipientPhone: '+8801711223344',
      divisionCode: 'DHAKA',
      district: 'Dhaka',
      upazila: 'Gulshan / Banani',
      addressLine: 'House 42, Road 11, Banani Block D',
      postalCode: '1213',
      isDefault: true,
      version: 1,
    },
    {
      id: 'addr_02',
      label: 'Office (অফিস)',
      recipientName: 'Rahim Ahmed',
      recipientPhone: '+8801711223344',
      divisionCode: 'DHAKA',
      district: 'Dhaka',
      upazila: 'Motijheel',
      addressLine: 'City Centre, Level 14, Motijheel C/A',
      postalCode: '1000',
      isDefault: false,
      version: 1,
    },
  ]);

  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newRecipientName, setNewRecipientName] = useState('Rahim Ahmed');
  const [newRecipientPhone, setNewRecipientPhone] = useState('+8801711223344');
  const [newDivision, setNewDivision] = useState('DHAKA');
  const [newDistrict, setNewDistrict] = useState('Dhaka');
  const [newUpazila, setNewUpazila] = useState('Dhanmondi');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('1209');
  const [newIsDefault, setNewIsDefault] = useState(false);

  // Preference states
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [smsMarketing, setSmsMarketing] = useState(false);
  const [orderStatusUpdates, setOrderStatusUpdates] = useState(true);
  const [promotionalPush, setPromotionalPush] = useState(false);

  // Consent states
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [privacyAccepted, setPrivacyAccepted] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Security form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Organization state
  const [isB2BRegistered, setIsB2BRegistered] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [businessType, setBusinessType] = useState<'CORPORATION' | 'LLC' | 'PARTNERSHIP' | 'SOLE_PROPRIETORSHIP'>('LLC');

  const isBn = locale === 'bn-BD';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSetDefaultAddress = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
    showToast(isBn ? 'ডিফল্ট ডেলিভারি ঠিকানা সেট করা হয়েছে।' : 'Default delivery address updated.');
  };

  const handleDeleteAddress = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast(isBn ? 'ঠিকানা অপসারিত হয়েছে।' : 'Delivery address removed.');
  };

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLine.trim()) return;

    const newAddr = {
      id: `addr_${Date.now()}`,
      label: newLabel,
      recipientName: newRecipientName,
      recipientPhone: newRecipientPhone,
      divisionCode: newDivision,
      district: newDistrict,
      upazila: newUpazila,
      addressLine: newAddressLine,
      postalCode: newPostalCode,
      isDefault: newIsDefault,
      version: 1,
    };

    if (newIsDefault) {
      setAddresses((prev) => [newAddr, ...prev.map((a) => ({ ...a, isDefault: false }))]);
    } else {
      setAddresses((prev) => [...prev, newAddr]);
    }

    setShowAddAddressModal(false);
    setNewAddressLine('');
    showToast(isBn ? 'নতুন ডেলিভারি ঠিকানা যুক্ত করা হয়েছে।' : 'New delivery address added successfully.');
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileVersion((prev) => prev + 1);
    showToast(isBn ? 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে।' : 'Customer profile updated successfully.');
  };

  const handlePreferencesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(isBn ? 'যোগাযোগের পছন্দসমূহ সংরক্ষিত হয়েছে।' : 'Communication preferences saved successfully.');
  };

  const handleConsentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(isBn ? 'সম্মতি রেকর্ড আপডেট করা হয়েছে।' : 'Privacy consent records updated with audit log.');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(isBn ? 'পাসওয়ার্ড মিলছে না!' : 'Passwords do not match!');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast(isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে।' : 'Password changed successfully. Active sessions invalidated.');
  };

  const handleB2BSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsB2BRegistered(true);
    showToast(isBn ? 'বিজনেস বায়ার আবেদন জমা দেওয়া হয়েছে।' : 'Business Buyer application submitted for administrative review.');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#18181B] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold border border-slate-700 animate-fade-in">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="sm" href="/" />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-xs uppercase tracking-widest text-[#FF6A00] font-black">
                {isBn ? 'গ্রাহক অ্যাকাউন্ট' : 'Customer Account'}
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                {isBn ? 'প্রোফাইল ও নিরাপত্তা ব্যবস্থাপনা' : 'Profile & Security Center'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setLocale(isBn ? 'en-BD' : 'bn-BD')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all"
            >
              {isBn ? 'English' : 'বাংলা'}
            </button>
            <Link
              href="/wallet"
              className="px-3.5 py-1.5 rounded-lg bg-[#FF6A00] text-white hover:bg-[#E55F00] text-xs font-bold transition-all shadow-xs"
            >
              {isBn ? 'ওয়ালেট' : 'My Wallets'}
            </Link>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-xs"
            >
              {isBn ? 'হোমপেজ' : 'Storefront'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Account Workspace */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Account Header Hero */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-none">
                Active Customer
              </Badge>
              {isB2BRegistered && (
                <Badge className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-none">
                  Verified B2B Buyer
                </Badge>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{name}</h2>
            <div className="text-xs text-slate-300 font-mono">
              {email} • {phone}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-center border border-white/10">
              <div className="text-2xl font-black text-amber-400">450</div>
              <div className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">
                Product Points
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl text-center border border-white/10">
              <div className="text-2xl font-black text-emerald-400">৳12,500.00</div>
              <div className="text-[10px] text-slate-300 uppercase font-bold tracking-wider">
                Main Wallet
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold overflow-x-auto">
          {[
            { key: 'profile', label: isBn ? 'প্রোফাইল' : 'Profile Settings' },
            { key: 'addresses', label: isBn ? 'ঠিকানা খাতা' : 'Address Book' },
            { key: 'preferences', label: isBn ? 'বিজ্ঞপ্তি পছন্দ' : 'Notification Preferences' },
            { key: 'consent', label: isBn ? 'সম্মতি ও গোপনীয়তা' : 'Consent & Privacy' },
            { key: 'security', label: isBn ? 'অ্যাকাউন্ট নিরাপত্তা' : 'Account Security' },
            { key: 'organization', label: isBn ? 'বিজনেস বায়ার (B2B)' : 'Business Buyer (B2B)' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-[#FF6A00] text-[#FF6A00]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Profile Settings */}
        {activeTab === 'profile' && (
          <Card className="border border-slate-200 bg-white p-6 max-w-2xl space-y-6">
            <h3 className="text-sm font-black text-slate-900">
              {isBn ? 'ব্যক্তিগত তথ্য ���পডেট করুন' : 'Personal Information'}
            </h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn ? 'পূর্ণ নাম' : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-xs font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isBn ? 'মোবাইল নম্বর' : 'Mobile Phone'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={phone}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-xs font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isBn ? 'পছন্দের ভাষা' : 'Preferred Language'}
                </label>
                <select
                  value={preferredLang}
                  onChange={(e) => setPreferredLang(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                >
                  <option value="en-BD">English (Bangladesh)</option>
                  <option value="bn-BD">বাংলা (বাংলাদেশ)</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit" className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs">
                  {isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tab 2: Address Book */}
        {activeTab === 'addresses' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isBn ? 'সংরক্ষিত ডেলিভারি ঠিকানাসমূহ' : 'Saved Delivery Addresses'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBn
                    ? 'চেকআউট ও দ্রুত অর্ডারের জন্য আপনার বাংলাদেশ ডেলিভারি ঠিকানা পরিচালনা করুন।'
                    : 'Manage your verified Bangladesh delivery addresses for fast checkout.'}
                </p>
              </div>

              <Button
                onClick={() => setShowAddAddressModal(true)}
                className="bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold shadow-xs"
              >
                + {isBn ? 'নতুন ঠিকানা যোগ করুন' : 'Add New Address'}
              </Button>
            </div>

            {/* Modal for adding address */}
            {showAddAddressModal && (
              <Card className="border border-[#FF6A00]/40 bg-orange-50/20 p-6 space-y-4">
                <h4 className="text-sm font-black text-slate-900">
                  {isBn ? 'নতুন বাংলাদেশ ডেলিভারি ঠিকানা যোগ করুন' : 'Add New Bangladesh Delivery Address'}
                </h4>
                <form onSubmit={handleAddAddressSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Address Label</label>
                      <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder="Home, Office, etc."
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Name</label>
                      <input
                        type="text"
                        value={newRecipientName}
                        onChange={(e) => setNewRecipientName(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Recipient Phone (+880)</label>
                      <input
                        type="text"
                        value={newRecipientPhone}
                        onChange={(e) => setNewRecipientPhone(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Division</label>
                      <select
                        value={newDivision}
                        onChange={(e) => setNewDivision(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="DHAKA">Dhaka (ঢাকা)</option>
                        <option value="CHITTAGONG">Chittagong (চট্টগ্রাম)</option>
                        <option value="RAJSHAHI">Rajshahi (রাজশাহী)</option>
                        <option value="KHULNA">Khulna (খুলনা)</option>
                        <option value="BARISAL">Barisal (বরিশাল)</option>
                        <option value="SYLHET">Sylhet (সিলেট)</option>
                        <option value="RANGPUR">Rangpur (রংপুর)</option>
                        <option value="MYMENSINGH">Mymensingh (ময়মনসিংহ)</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">District</label>
                      <input
                        type="text"
                        value={newDistrict}
                        onChange={(e) => setNewDistrict(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Upazila / Thana</label>
                      <input
                        type="text"
                        value={newUpazila}
                        onChange={(e) => setNewUpazila(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Postal Code (4-digits)</label>
                      <input
                        type="text"
                        value={newPostalCode}
                        onChange={(e) => setNewPostalCode(e.target.value)}
                        maxLength={4}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Street Address Line</label>
                    <input
                      type="text"
                      value={newAddressLine}
                      onChange={(e) => setNewAddressLine(e.target.value)}
                      placeholder="House / Holding, Road number, Sector / Area"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      required
                    />
                  </div>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                      className="rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Set as default delivery address
                    </span>
                  </label>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddAddressModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-[#FF6A00] text-white font-bold">
                      Save Address
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Address Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <Card
                  key={addr.id}
                  className={`p-5 bg-white border transition-shadow space-y-3 ${
                    addr.isDefault ? 'border-[#FF6A00] shadow-sm' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-xs text-slate-900">{addr.label}</span>
                      {addr.isDefault && (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          ✓ Default Address
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-[11px] font-bold text-[#FF6A00] hover:underline px-2 py-1"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-[11px] font-bold text-red-500 hover:text-red-700 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600">
                    <div className="font-bold text-slate-800">
                      {addr.recipientName} • <span className="font-mono">{addr.recipientPhone}</span>
                    </div>
                    <div>{addr.addressLine}</div>
                    <div>
                      {addr.upazila ? `${addr.upazila}, ` : ''}{addr.district} - {addr.postalCode}, {addr.divisionCode}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Communication Preferences */}
        {activeTab === 'preferences' && (
          <Card className="border border-slate-200 bg-white p-6 max-w-2xl space-y-6">
            <h3 className="text-sm font-black text-slate-900">
              {isBn ? 'বিজ্ঞপ্তি ও বিপণন পছন্দসমূহ' : 'Notification & Marketing Preferences'}
            </h3>
            <form onSubmit={handlePreferencesSubmit} className="space-y-4 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">Email Marketing & Deals</div>
                  <div className="text-[11px] text-slate-500">Receive weekly deals, discounts, and exclusive offers via email.</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailMarketing}
                  onChange={(e) => setEmailMarketing(e.target.checked)}
                  className="rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">SMS Marketing Broadcasts</div>
                  <div className="text-[11px] text-slate-500">Receive flash sales notifications on your verified mobile phone.</div>
                </div>
                <input
                  type="checkbox"
                  checked={smsMarketing}
                  onChange={(e) => setSmsMarketing(e.target.checked)}
                  className="rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">Order & Delivery Status Alerts</div>
                  <div className="text-[11px] text-slate-500">Real-time updates when orders are confirmed, dispatched, and delivered.</div>
                </div>
                <input
                  type="checkbox"
                  checked={orderStatusUpdates}
                  onChange={(e) => setOrderStatusUpdates(e.target.checked)}
                  className="rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-800">Promotional Push Notifications</div>
                  <div className="text-[11px] text-slate-500">Web and app push notifications for cart reminders and price drops.</div>
                </div>
                <input
                  type="checkbox"
                  checked={promotionalPush}
                  onChange={(e) => setPromotionalPush(e.target.checked)}
                  className="rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                />
              </label>

              <div className="pt-2">
                <Button type="submit" className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs">
                  {isBn ? 'পছন্দসমূহ সংরক্ষণ করুন' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tab 3: Consent & Privacy */}
        {activeTab === 'consent' && (
          <Card className="border border-slate-200 bg-white p-6 max-w-2xl space-y-6">
            <h3 className="text-sm font-black text-slate-900">
              {isBn ? 'সম্মতি ব্যবস্থাপনা ও অডিট ট্রেইল' : 'Regulatory Consent Management'}
            </h3>
            <form onSubmit={handleConsentSubmit} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Terms of Service Agreement (Version v1.2)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Required for wallet transactions, escrow safety, and platform purchases.
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Privacy Policy & Personal Data Protection (Version v1.2)</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Confirms understanding of address sharing with verified courier delivery partners.
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 rounded text-[#FF6A00] focus:ring-[#FF6A00] w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Targeted Promotional Profiling Consent</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Optional consent for personalized product recommendations.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs">
                  {isBn ? 'সম্মতি আপডেট করুন' : 'Update Consent Records'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Tab 4: Account Security */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-slate-200 bg-white p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900">
                {isBn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
              </h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">New Password (Min. 8 characters)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                    Update Password & Invalidate Sessions
                  </Button>
                </div>
              </form>
            </Card>

            <Card className="border border-slate-200 bg-white p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900">
                {isBn ? 'নিরাপত্তা স্ট্যাটাস ও সেশন' : 'Security Overview'}
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Email Verification</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                    Verified
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Mobile Phone Verification</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                    Verified (+880)
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Active Logged-in Devices</span>
                  <span className="font-bold text-slate-800 font-mono">1 active session</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600">Last Authentication Time</span>
                  <span className="font-bold text-slate-800 font-mono">Today, 10:14 AM</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 5: Business Buyer (B2B) */}
        {activeTab === 'organization' && (
          <Card className="border border-slate-200 bg-white p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isBn ? 'বিজনেস বায়ার অর্গানাইজেশন (B2B)' : 'Business Buyer Organization'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Approved business organizations enjoy wholesale bulk pricing, corporate GST/VAT invoices, and custom credit terms.
              </p>
            </div>

            {isB2BRegistered ? (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-blue-900">{companyName || 'Apex Retail Holdings Ltd.'}</span>
                  <Badge className="bg-blue-600 text-white text-[10px] font-bold">Approved Buyer</Badge>
                </div>
                <div className="text-slate-600 space-y-1">
                  <div>Trade License: {tradeLicense || 'TRAD-2024-DHK-9988'}</div>
                  <div>Business Type: {businessType}</div>
                  <div className="pt-2 font-bold text-slate-800">
                    Private Credit Limit: ৳250,000.00 (Protected Invariant)
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleB2BSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Company / Organization Legal Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corporation Bangladesh Ltd."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Business Entity Type</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value as any)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="LLC">Private Limited Company (LLC)</option>
                      <option value="CORPORATION">Public Corporation</option>
                      <option value="PARTNERSHIP">Partnership Firm</option>
                      <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trade License Number</label>
                    <input
                      type="text"
                      value={tradeLicense}
                      onChange={(e) => setTradeLicense(e.target.value)}
                      placeholder="e.g. TRAD/DCC/2026/0129"
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs">
                    Apply for Business Buyer Status
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 font-medium">
          AlifWorld Customer Experience • Protected Identity, Personal Data Minimization & B2B Governance
        </div>
      </footer>
    </div>
  );
}
