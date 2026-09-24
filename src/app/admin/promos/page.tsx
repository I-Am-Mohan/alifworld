'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, ShieldCheck, DollarSign } from 'lucide-react';

interface PromotionItem {
  id: string;
  code: string;
  title: string;
  promotionType: string;
  fundingType: string;
  sellerSharePercent: number;
  platformSharePercent: number;
  discountValue: number;
  minOrderSubtotalPoisha: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
}

export default function AdminPromosPage() {
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [promotionType, setPromotionType] = useState('PERCENTAGE');
  const [fundingType, setFundingType] = useState('PLATFORM_FUNDED');
  const [sellerSharePercent, setSellerSharePercent] = useState(0);
  const [platformSharePercent, setPlatformSharePercent] = useState(100);
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrderSubtotalBDT, setMinOrderSubtotalBDT] = useState(0);

  const loadPromos = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/promotions');
      const json = await res.json();
      if (json.success) {
        setPromotions(json.data);
      } else {
        setError(json.error?.message || 'Failed to fetch promotions');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading promotions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await fetch('/api/v1/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          title,
          promotionType,
          fundingType,
          sellerSharePercent: Number(sellerSharePercent),
          platformSharePercent: Number(platformSharePercent),
          discountValue: Number(discountValue),
          minOrderSubtotalPoisha: BigInt(Math.round(minOrderSubtotalBDT * 100)).toString(),
          startsAt: new Date().toISOString(),
          status: 'ACTIVE',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setCode('');
        setTitle('');
        loadPromos();
      } else {
        setError(json.error?.message || 'Failed to create promotion');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating promotion');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-600" />
            Promotions & Funding Attribution
          </h1>
          <p className="text-sm text-slate-500">
            Configure platform, seller, and co-funded voucher campaigns with authoritative money splits.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
        >
          <Plus className="w-4 h-4" />
          New Promotion
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-md border border-rose-200">{error}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading promotions...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Type</th>
                <th className="p-3">Funding Model</th>
                <th className="p-3">Split (Seller / Platform)</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No promotions configured yet. Click &apos;New Promotion&apos; to add one.
                  </td>
                </tr>
              ) : (
                promotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-mono font-bold text-indigo-600">{promo.code}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{promo.title}</td>
                    <td className="p-3">{promo.promotionType}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${
                          promo.fundingType === 'PLATFORM_FUNDED'
                            ? 'bg-blue-100 text-blue-700'
                            : promo.fundingType === 'SELLER_FUNDED'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {promo.fundingType}
                      </span>
                    </td>
                    <td className="p-3 font-semibold">
                      {Number(promo.sellerSharePercent)}% / {Number(promo.platformSharePercent)}%
                    </td>
                    <td className="p-3 font-medium">
                      {promo.promotionType === 'PERCENTAGE' ? `${promo.discountValue}%` : `৳${promo.discountValue}`}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-800">
                        {promo.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl border">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Promotion & Funding Split</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="E.g. EID2026"
                  className="w-full border rounded p-2 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Eid Special 10% Off"
                  className="w-full border rounded p-2 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Promotion Type</label>
                  <select
                    value={promotionType}
                    onChange={(e) => setPromotionType(e.target.value)}
                    className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                  >
                    <option value="PERCENTAGE">PERCENTAGE</option>
                    <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
                    <option value="FREE_SHIPPING">FREE_SHIPPING</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <label className="block font-semibold text-slate-900 dark:text-white">Funding Source & Attribution</label>
                <select
                  value={fundingType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFundingType(val);
                    if (val === 'PLATFORM_FUNDED') {
                      setSellerSharePercent(0);
                      setPlatformSharePercent(100);
                    } else if (val === 'SELLER_FUNDED') {
                      setSellerSharePercent(100);
                      setPlatformSharePercent(0);
                    } else {
                      setSellerSharePercent(50);
                      setPlatformSharePercent(50);
                    }
                  }}
                  className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                >
                  <option value="PLATFORM_FUNDED">PLATFORM_FUNDED (100% Platform)</option>
                  <option value="SELLER_FUNDED">SELLER_FUNDED (100% Seller)</option>
                  <option value="CO_FUNDED">CO_FUNDED (Shared Percentage Split)</option>
                </select>

                {fundingType === 'CO_FUNDED' && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium">Seller Share (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={sellerSharePercent}
                        onChange={(e) => {
                          const s = Number(e.target.value);
                          setSellerSharePercent(s);
                          setPlatformSharePercent(100 - s);
                        }}
                        className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">Platform Share (%)</label>
                      <input
                        type="number"
                        readOnly
                        value={platformSharePercent}
                        className="w-full border rounded p-2 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                >
                  Save Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
