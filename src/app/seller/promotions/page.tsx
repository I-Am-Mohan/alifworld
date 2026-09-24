'use client';

import React, { useEffect, useState } from 'react';
import { Tag, TrendingUp, DollarSign, ShieldAlert, Award } from 'lucide-react';

interface AttributionSummary {
  sellerId: string | null;
  totalCount: number;
  totalDiscountPoisha: string;
  totalSellerSharePoisha: string;
  totalPlatformSharePoisha: string;
  fundingBreakdown: Array<{
    fundingType: string;
    count: number;
    discountAmountPoisha: string;
    sellerSharePoisha: string;
    platformSharePoisha: string;
  }>;
}

export default function SellerPromotionsPage() {
  const [summary, setSummary] = useState<AttributionSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/seller/promotions/attributions/summary');
        const json = await res.json();
        if (json.success) {
          setSummary(json.data);
        } else {
          setError(json.error?.message || 'Failed to load promotion attributions');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const formatBDT = (poishaStr: string) => {
    const poisha = BigInt(poishaStr || '0');
    const taka = Number(poisha) / 100;
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(taka);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-600" />
            Promotion & Discount Attribution
          </h1>
          <p className="text-sm text-slate-500">
            Track seller-funded vs platform-funded discounts and impact on net seller payout.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading promotion attribution summary...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-md border border-rose-200">{error}</div>
      ) : summary ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border shadow-sm space-y-1">
              <div className="text-xs text-slate-500 flex items-center gap-1 font-medium uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Total Discount Applied
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatBDT(summary.totalDiscountPoisha)}
              </div>
              <div className="text-xs text-slate-400">{summary.totalCount} redemptions</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border shadow-sm space-y-1">
              <div className="text-xs text-slate-500 flex items-center gap-1 font-medium uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Seller-Funded Portion
              </div>
              <div className="text-2xl font-extrabold text-amber-600">
                {formatBDT(summary.totalSellerSharePoisha)}
              </div>
              <div className="text-xs text-slate-400">Deducted from gross payout</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border shadow-sm space-y-1">
              <div className="text-xs text-slate-500 flex items-center gap-1 font-medium uppercase tracking-wider">
                <Award className="w-4 h-4 text-blue-600" />
                Platform-Funded Portion
              </div>
              <div className="text-2xl font-extrabold text-blue-600">
                {formatBDT(summary.totalPlatformSharePoisha)}
              </div>
              <div className="text-xs text-slate-400">Absorbed by platform (0 seller loss)</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Funding Type Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="p-3">Funding Type</th>
                    <th className="p-3">Redemptions</th>
                    <th className="p-3">Total Discount</th>
                    <th className="p-3">Seller Share</th>
                    <th className="p-3">Platform Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {summary.fundingBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        No promotion attributions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    summary.fundingBreakdown.map((row) => (
                      <tr key={row.fundingType} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{row.fundingType}</td>
                        <td className="p-3">{row.count}</td>
                        <td className="p-3 font-semibold">{formatBDT(row.discountAmountPoisha)}</td>
                        <td className="p-3 text-amber-600 font-medium">{formatBDT(row.sellerSharePoisha)}</td>
                        <td className="p-3 text-blue-600 font-medium">{formatBDT(row.platformSharePoisha)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
