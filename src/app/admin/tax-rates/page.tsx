'use client';

import React, { useState, useEffect } from 'react';
import { Percent, Plus, ShieldCheck, FileText } from 'lucide-react';

interface TaxRuleItem {
  id: string;
  jurisdiction: string;
  name: string;
  taxType: string;
  ratePercent: number;
  priceIncludesTax: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
}

export default function TaxRatesAdminPage() {
  const [taxRules, setTaxRules] = useState<TaxRuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('BD');
  const [taxType, setTaxType] = useState('VAT');
  const [ratePercent, setRatePercent] = useState(15.0);
  const [priceIncludesTax, setPriceIncludesTax] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchRules() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/admin/tax-rules');
        const json = await res.json();
        if (isMounted) {
          if (json.success) {
            setTaxRules(json.data);
          } else {
            setError(json.error?.message || 'Failed to fetch tax rules');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error loading tax rules');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchRules();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await fetch('/api/v1/admin/tax-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          jurisdiction,
          taxType,
          ratePercent: Number(ratePercent),
          priceIncludesTax,
          effectiveFrom: new Date().toISOString(),
          status: 'ACTIVE',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setName('');
        const refreshRes = await fetch('/api/v1/admin/tax-rules');
        const refreshJson = await refreshRes.json();
        if (refreshJson.success) {
          setTaxRules(refreshJson.data);
        }
      } else {
        setError(json.error?.message || 'Failed to create tax rule');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating tax rule');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="w-6 h-6 text-emerald-600" />
            Tax & NBR VAT Rule Architecture
          </h1>
          <p className="text-sm text-slate-500">
            Configure jurisdiction VAT rules, NBR Mushak-6.3 rates (15% Standard, 5% Concession, 0% Exempt), and inclusive/exclusive pricing modes.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
        >
          <Plus className="w-4 h-4" />
          Add Tax Rule
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-md border border-rose-200">{error}</div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading tax rules...</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-3">Jurisdiction</th>
                <th className="p-3">Rule Name</th>
                <th className="p-3">Tax Type</th>
                <th className="p-3">Rate (%)</th>
                <th className="p-3">Pricing Mode</th>
                <th className="p-3">Effective Date</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {taxRules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No tax rules defined yet. Click &apos;Add Tax Rule&apos; to configure NBR VAT rules.
                  </td>
                </tr>
              ) : (
                taxRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-mono font-bold text-emerald-600">{rule.jurisdiction}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{rule.name}</td>
                    <td className="p-3">{rule.taxType}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{rule.ratePercent}%</td>
                    <td className="p-3 font-medium">
                      {rule.priceIncludesTax ? (
                        <span className="text-blue-600">Inclusive</span>
                      ) : (
                        <span className="text-amber-600">Exclusive</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(rule.effectiveFrom).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-100 text-emerald-800">
                        {rule.status}
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Jurisdiction Tax Rule</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="NBR Bangladesh Standard VAT (15%)"
                  className="w-full border rounded p-2 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    required
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="BD"
                    className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Tax Type</label>
                  <input
                    type="text"
                    required
                    value={taxType}
                    onChange={(e) => setTaxType(e.target.value)}
                    placeholder="VAT"
                    className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Rate Percent (%)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={ratePercent}
                    onChange={(e) => setRatePercent(Number(e.target.value))}
                    className="w-full border rounded p-2 bg-slate-50 dark:bg-slate-700"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={priceIncludesTax}
                      onChange={(e) => setPriceIncludesTax(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    Price Includes Tax (Inclusive)
                  </label>
                </div>
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
                  Save Tax Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
