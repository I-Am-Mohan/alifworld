'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RfqView {
  id: string;
  rfqNumber: string;
  title: string;
  purchaseOrderRef: string | null;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'QUOTED' | 'ACCEPTED' | 'CANCELLED';
  expiresAt: string;
  itemsCount: number;
  totalTargetBdt: string;
  sellerName?: string;
}

interface QuoteView {
  id: string;
  quoteNumber: string;
  rfqNumber: string;
  sellerName: string;
  currentVersion: number;
  status: 'PENDING_BUYER_REVIEW' | 'PENDING_INTERNAL_APPROVAL' | 'ACCEPTED' | 'CONVERTED';
  validUntil: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  pointsAwarded: number;
  ruleVersion: string;
  paymentTerms: string;
  items: Array<{
    title: string;
    quantity: number;
    unitPriceBdt: string;
    lineTotalBdt: string;
    tier?: string;
  }>;
}

export default function B2BCommercePortalPage() {
  const [locale, setLocale] = useState<'en-BD' | 'bn-BD'>('en-BD');
  const isBn = locale === 'bn-BD';
  const [activeTab, setActiveTab] = useState<'rfqs' | 'quotes' | 'organization'>('rfqs');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sample active B2B Organization state
  const [organization, setOrganization] = useState({
    companyName: 'Rahman Textiles & Garments Trading Ltd.',
    businessType: 'Private Limited Company (LLC)',
    tradeLicenseNumber: 'TRAD/DCC/2026/08941',
    binNumber: '001234567-0101',
    status: 'APPROVED',
    creditStatus: 'DISABLED', // Invariant: Credit terms remain disabled until explicitly approved
    creditLimitPoisha: 0,
    spendingLimitPoisha: 10000000, // ৳100,000 threshold
    userRole: 'PURCHASER',
    rewardsRuleVersion: 'b2b-rewards-v1.0',
    earnsProductPoints: false,
  });

  // Sample RFQs
  const [rfqs, setRfqs] = useState<RfqView[]>([
    {
      id: 'rfq_1',
      rfqNumber: 'RFQ-202610-0012',
      title: 'Bulk Premium Cotton Fabric - 5,000 Yards',
      purchaseOrderRef: 'PO-2026-OCT-88',
      status: 'QUOTED',
      expiresAt: '2026-10-30',
      itemsCount: 1,
      totalTargetBdt: '৳450,000.00',
      sellerName: 'Bengal Weaving Mills Ltd.',
    },
    {
      id: 'rfq_2',
      rfqNumber: 'RFQ-202610-0019',
      title: 'Industrial Sewing Needles & Accessories (MOQ: 500)',
      purchaseOrderRef: 'PO-2026-OCT-95',
      status: 'SUBMITTED',
      expiresAt: '2026-11-15',
      itemsCount: 3,
      totalTargetBdt: '৳75,000.00',
    },
  ]);

  // Sample Quotes
  const [quotes, setQuotes] = useState<QuoteView[]>([
    {
      id: 'quo_1',
      quoteNumber: 'QUO-202610-0045',
      rfqNumber: 'RFQ-202610-0012',
      sellerName: 'Bengal Weaving Mills Ltd.',
      currentVersion: 1,
      status: 'PENDING_BUYER_REVIEW',
      validUntil: '2026-10-28',
      totalPoisha: 44000000, // ৳440,000.00
      totalBdtFormatted: '৳440,000.00',
      pointsAwarded: 0, // B2B rule: 0 points by default
      ruleVersion: 'b2b-rewards-v1.0',
      paymentTerms: 'IMMEDIATE',
      items: [
        {
          title: 'Premium Combed Cotton 60s Fabric',
          quantity: 5000,
          unitPriceBdt: '৳88.00 / yd',
          lineTotalBdt: '৳440,000.00',
          tier: 'Tier 3 (5,000+ yards wholesale discount)',
        },
      ],
    },
  ]);

  // New RFQ Modal state
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [newRfqTitle, setNewRfqTitle] = useState('');
  const [newRfqPo, setNewRfqPo] = useState('');
  const [newRfqQty, setNewRfqQty] = useState(100);
  const [newRfqTargetPrice, setNewRfqTargetPrice] = useState(500);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateRfq = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRfqQty < 50) {
      showToast(
        isBn ? 'ন্যূনতম অর্ডারের পরিমাণ (MOQ) ৫০ টি।' : 'Minimum Order Quantity (MOQ) is 50 units.'
      );
      return;
    }

    const newRfq: RfqView = {
      id: `rfq_${Date.now()}`,
      rfqNumber: `RFQ-202610-${Math.floor(1000 + Math.random() * 9000)}`,
      title: newRfqTitle,
      purchaseOrderRef: newRfqPo || null,
      status: 'SUBMITTED',
      expiresAt: '2026-11-20',
      itemsCount: 1,
      totalTargetBdt: `৳${(newRfqQty * newRfqTargetPrice).toLocaleString()}.00`,
    };

    setRfqs([newRfq, ...rfqs]);
    setShowRfqModal(false);
    setNewRfqTitle('');
    setNewRfqPo('');
    showToast(isBn ? 'আরএফকিউ সফলভাবে জমা দেওয়া হয়েছে!' : 'RFQ submitted successfully!');
  };

  const handleAcceptQuote = (quoteId: string) => {
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id === quoteId) {
          return { ...q, status: 'ACCEPTED' };
        }
        return q;
      })
    );
    showToast(
      isBn
        ? 'কোটেশন সফলভাবে গৃহীত হয়েছে!'
        : 'Quote accepted successfully! Ready for cart conversion.'
    );
  };

  const handleConvertToCart = (quoteId: string) => {
    setQuotes((prev) =>
      prev.map((q) => {
        if (q.id === quoteId) {
          return { ...q, status: 'CONVERTED' };
        }
        return q;
      })
    );
    showToast(
      isBn
        ? 'কোটেশন কার্টে রূপান্তর করা হয়েছে!'
        : 'Quote items added to Cart with locked negotiated pricing!'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <AlifLogo className="h-8 w-auto text-[#FF6A00]" />
              <span className="text-xs uppercase tracking-wider font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                B2B Wholesale
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab('rfqs')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'rfqs'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50'
                }`}
              >
                {isBn ? 'আরএফকিউ (RFQ)' : 'Requests for Quote (RFQs)'}
              </button>
              <button
                onClick={() => setActiveTab('quotes')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'quotes'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50'
                }`}
              >
                {isBn ? 'দরপত্র / কোটেশন' : 'Quotes & Negotiations'}
              </button>
              <button
                onClick={() => setActiveTab('organization')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'organization'
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'hover:bg-slate-50'
                }`}
              >
                {isBn ? 'প্রতিষ্ঠান ও ক্রেডিট প্রোফাইল' : 'Organization & Credit'}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocale(locale === 'en-BD' ? 'bn-BD' : 'en-BD')}
              className="text-xs font-bold px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {locale === 'en-BD' ? 'বাংলা' : 'English'}
            </button>
            <Button
              onClick={() => setShowRfqModal(true)}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs"
            >
              + {isBn ? 'নতুন আরএফকিউ তৈরি করুন' : 'Submit New RFQ'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Organization Banner */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                {organization.companyName}
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                {organization.status}
              </Badge>
              <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold">
                Role: {organization.userRole}
              </Badge>
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap gap-4">
              <span>
                Trade License:{' '}
                <strong className="text-slate-700">{organization.tradeLicenseNumber}</strong>
              </span>
              <span>
                BIN: <strong className="text-slate-700">{organization.binNumber}</strong>
              </span>
              <span>
                B2B Rewards:{' '}
                <strong className="text-slate-700">
                  {organization.rewardsRuleVersion} (
                  {organization.earnsProductPoints ? 'Earns Points' : '0 Points Rule'})
                </strong>
              </span>
            </div>
          </div>

          {/* Credit Status Guard (Invariant: Disabled until explicitly approved by Admin) */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-right text-xs">
              <div className="text-slate-400 font-semibold">
                {isBn ? 'ক্রেডিট সুবিধা' : 'Credit Terms'}
              </div>
              <div className="font-black text-slate-800">
                {organization.creditStatus === 'APPROVED'
                  ? '৳' + (organization.creditLimitPoisha / 100).toLocaleString()
                  : isBn
                    ? 'নিষ্ক্রিয় (তাত্ক্ষণিক পরিশোধ)'
                    : 'Disabled (Immediate Payment)'}
              </div>
            </div>
            <Badge
              className={`text-[10px] font-bold ${
                organization.creditStatus === 'APPROVED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              {organization.creditStatus}
            </Badge>
          </div>
        </div>

        {/* Tab 1: RFQ Workspace */}
        {activeTab === 'rfqs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {isBn ? 'আপ���ার প্রতিষ্ঠানের আরএফকিউ সমূহ' : 'Organization Requests for Quote'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isBn
                    ? 'পাইকারি মূল্যে পণ্য ক্রয়ের জন্য সরাসরি সরবরাহকারীদের কাছে আরএফকিউ পাঠান।'
                    : 'Submit bulk requests with Minimum Order Quantity (MOQ) and target pricing.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {rfqs.map((rfq) => (
                <Card
                  key={rfq.id}
                  className="border border-slate-200 bg-white hover:border-slate-300 transition-all p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#FF6A00]">
                          {rfq.rfqNumber}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            rfq.status === 'QUOTED'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {rfq.status}
                        </Badge>
                        {rfq.purchaseOrderRef && (
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono font-medium">
                            PO: {rfq.purchaseOrderRef}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">{rfq.title}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-4">
                        <span>
                          Items: <strong>{rfq.itemsCount}</strong>
                        </span>
                        <span>
                          Target: <strong>{rfq.totalTargetBdt}</strong>
                        </span>
                        <span>
                          Expires: <strong>{rfq.expiresAt}</strong>
                        </span>
                        {rfq.sellerName && (
                          <span>
                            Target Seller:{' '}
                            <strong className="text-blue-800">{rfq.sellerName}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rfq.status === 'QUOTED' && (
                        <Button
                          onClick={() => setActiveTab('quotes')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                        >
                          {isBn ? 'কোটেশন দেখুন' : 'View Quote Response'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Quotes & Negotiations */}
        {activeTab === 'quotes' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {isBn
                  ? 'দরপত্র ও সমঝোতা (Quotes & Negotiations)'
                  : 'Active Quotes & Negotiated Offers'}
              </h2>
              <p className="text-xs text-slate-500">
                {isBn
                  ? 'সরবরাহকারীদের পাঠানো দরপত্র পর্যালোচনা করুন, সমঝোতা করুন অথবা কার্টে রূপান্তর করুন।'
                  : 'Review supplier offers, inspect quantity tier discounts, and convert accepted quotes to cart.'}
              </p>
            </div>

            <div className="space-y-4">
              {quotes.map((quote) => (
                <Card key={quote.id} className="border border-slate-200 bg-white p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {quote.quoteNumber}
                        </span>
                        <span className="text-xs text-slate-400">• Ref: {quote.rfqNumber}</span>
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] font-bold">
                          Version {quote.currentVersion}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-bold ${
                            quote.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : quote.status === 'CONVERTED'
                                ? 'bg-slate-100 text-slate-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600">
                        Supplier: <strong className="text-slate-900">{quote.sellerName}</strong> •
                        Payment Terms:{' '}
                        <strong className="text-slate-900">{quote.paymentTerms}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500">
                        {isBn ? 'মোট দরপত্র মূল্য' : 'Total Quote Value'}
                      </div>
                      <div className="text-lg font-black text-slate-900">
                        {quote.totalBdtFormatted}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Valid until: {quote.validUntil}
                      </div>
                    </div>
                  </div>

                  {/* Line Items & Quantity Break Tiers */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700">
                      {isBn ? 'পণ্যের বিবরণ ও মূল্য' : 'Quoted Line Items'}
                    </div>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                      {quote.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{item.title}</span>
                            <div className="text-[11px] text-emerald-700 font-medium">
                              {item.tier}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500 font-mono">
                              {item.quantity.toLocaleString()} units @ {item.unitPriceBdt}
                            </span>
                            <div className="font-bold text-slate-900">{item.lineTotalBdt}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    {quote.status === 'PENDING_BUYER_REVIEW' && (
                      <Button
                        onClick={() => handleAcceptQuote(quote.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        {isBn ? 'দরপত্র গ্রহণ করুন' : 'Accept Quote'}
                      </Button>
                    )}

                    {quote.status === 'ACCEPTED' && (
                      <Button
                        onClick={() => handleConvertToCart(quote.id)}
                        className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs"
                      >
                        {isBn ? 'কার্টে যোগ করে অর্ডার করুন' : 'Convert to Cart & Checkout'}
                      </Button>
                    )}

                    {quote.status === 'CONVERTED' && (
                      <Link
                        href="/cart"
                        className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-colors"
                      >
                        {isBn ? 'কার্ট দেখুন' : 'Go to Cart'}
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Organization Details */}
        {activeTab === 'organization' && (
          <Card className="border border-slate-200 bg-white p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isBn
                  ? 'বিজনেস বায়ার গভর্ন্যান্স ও ক্রেডিট নীতি'
                  : 'Business Buyer Governance & Credit Policy'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Corporate compliance, spending authorization thresholds, and Admin credit terms.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Legal Company Name</span>
                <span className="font-bold text-slate-800">{organization.companyName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Business Entity Type</span>
                <span className="font-bold text-slate-800">{organization.businessType}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Trade License</span>
                <span className="font-mono font-bold text-slate-800">
                  {organization.tradeLicenseNumber}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Credit Facility Status</span>
                <span className="font-bold text-amber-700">
                  {organization.creditStatus} (Requires Admin Approval)
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Internal Spending Authorization Limit</span>
                <span className="font-bold text-slate-800">৳100,000.00 / order</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">B2B Loyalty Points Policy</span>
                <span className="font-bold text-slate-800">
                  Rule: {organization.rewardsRuleVersion} (Decoupled from retail)
                </span>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* New RFQ Modal */}
      {showRfqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <Card className="max-w-lg w-full bg-white p-6 space-y-4 rounded-2xl shadow-2xl">
            <CardHeader className="p-0">
              <CardTitle className="text-sm font-extrabold text-slate-900">
                {isBn ? 'নতুন আরএফকিউ সাবমিট করুন' : 'Submit Request for Quote (RFQ)'}
              </CardTitle>
              <p className="text-xs text-slate-500">
                Specify quantities and PO reference. Minimum Order Quantity (MOQ) enforced.
              </p>
            </CardHeader>

            <form onSubmit={handleCreateRfq} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Item Title / Requirement
                </label>
                <input
                  type="text"
                  value={newRfqTitle}
                  onChange={(e) => setNewRfqTitle(e.target.value)}
                  placeholder="e.g. Export Quality Knit Cotton Yarn - 1,000 Spools"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity (MOQ: 50)</label>
                  <input
                    type="number"
                    min="50"
                    value={newRfqQty}
                    onChange={(e) => setNewRfqQty(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Target Price (BDT / unit)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newRfqTargetPrice}
                    onChange={(e) => setNewRfqTargetPrice(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Purchase Order Reference (Optional)
                </label>
                <input
                  type="text"
                  value={newRfqPo}
                  onChange={(e) => setNewRfqPo(e.target.value)}
                  placeholder="e.g. PO-2026-NOV-001"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRfqModal(false)}
                  className="text-xs"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs"
                >
                  {isBn ? 'জমা দিন' : 'Submit RFQ'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500 font-medium">
        AlifWorld B2B Commerce • Wholesale Pricing, MOQ Governance & Protected Invariants
      </footer>
    </div>
  );
}
