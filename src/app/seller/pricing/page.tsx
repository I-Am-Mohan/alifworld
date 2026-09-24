'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Layers, Plus, Tag, ShieldAlert } from 'lucide-react';

interface PriceListItem {
  id: string;
  code: string;
  name: string;
  channel: string;
  buyerSegment: string | null;
  priority: number;
  status: string;
  _count?: { rules: number };
}

export default function SellerPricingPage() {
  const [priceLists, setPriceLists] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('RETAIL');
  const [buyerSegment, setBuyerSegment] = useState('');
  const [priority, setPriority] = useState(10);

  useEffect(() => {
    let isMounted = true;
    async function fetchLists() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/seller/pricing/price-lists');
        const json = await res.json();
        if (isMounted) {
          if (json.success) {
            setPriceLists(json.data);
          } else {
            setError(json.error?.message || 'Failed to load price lists');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error loading price lists');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchLists();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await fetch('/api/v1/seller/pricing/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          channel,
          buyerSegment: buyerSegment || null,
          priority: Number(priority),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setCode('');
        setName('');
        const refreshRes = await fetch('/api/v1/seller/pricing/price-lists');
        const refreshJson = await refreshRes.json();
        if (refreshJson.success) {
          setPriceLists(refreshJson.data);
        }
      } else {
        setError(json.error?.message || 'Failed to create price list');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating price list');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Channel & Tier Pricing
          </h1>
          <p className="text-sm text-slate-500">
            Manage compare-at MSRP, cost prices, MAP floor protection, B2B wholesale tiers, and campaign price lists.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
        >
          <Plus className="w-4 h-4" />
          Create Price List
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-md border border-rose-200">{error}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading channel price lists...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Buyer Segment</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Rules Count</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {priceLists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No custom channel price lists found. Click &apos;Create Price List&apos; to add B2B or campaign tiers.
                  </td>
                </tr>
              ) : (
                priceLists.map((pl) => (
                  <tr key={pl.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-mono font-bold text-emerald-600">{pl.code}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{pl.name}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {pl.channel}
                      </span>
                    </td>
                    <td className="p-3">{pl.buyerSegment || 'All Segments'}</td>
                    <td className="p-3 font-semibold">{pl.priority}</td>
                    <td className="p-3">{pl._count?.rules || 0}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-800">
                        {pl.status}
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Price List</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="E.g. B2B_GOLD_2026"
                  className="w-full border rounded p-2 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Price List Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Wholesale Gold Tier"
                  className="w-full border rounded p-2 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                  >
                    <option value="RETAIL">RETAIL</option>
                    <option value="B2B">B2B</option>
                    <option value="CAMPAIGN">CAMPAIGN</option>
                    <option value="NEGOTIATED">NEGOTIATED</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Priority (Higher Wins)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Buyer Segment (Optional)</label>
                <input
                  type="text"
                  value={buyerSegment}
                  onChange={(e) => setBuyerSegment(e.target.value)}
                  placeholder="E.g. WHOLESALE_GOLD or CORP_CLIENT_A"
                  className="w-full border rounded p-2 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700"
                />
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                >
                  Save Price List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
