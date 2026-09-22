'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function AdminSellersPage() {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const [sellers, setSellers] = useState([
    {
      id: 'sel_dhaka_tech_01',
      name: 'Dhaka Tech Electronics',
      slug: 'dhaka-tech',
      ownerName: 'Rahim Chowdhury',
      ownerEmail: 'rahim@dhakatech.com',
      ownerPhone: '+8801711223344',
      binNumber: '0012345678901',
      tinNumber: '123456789012',
      status: 'VERIFIED',
      kycDocsCount: '4/4 Verified',
      registeredAt: '2026-09-01',
    },
    {
      id: 'sel_chittagong_crafts_02',
      name: 'Chittagong Artisans & Crafts',
      slug: 'chittagong-artisans',
      ownerName: 'Nasrin Sultana',
      ownerEmail: 'nasrin.crafts@example.com',
      ownerPhone: '+8801823456789',
      binNumber: '0098765432101',
      tinNumber: '987654321098',
      status: 'PENDING',
      kycDocsCount: '2/4 Submitted',
      registeredAt: '2026-09-20',
    },
    {
      id: 'sel_sylhet_tea_co_03',
      name: 'Sylhet Valley Organic Tea',
      slug: 'sylhet-valley-tea',
      ownerName: 'Tanvir Hossain',
      ownerEmail: 'tanvir.tea@example.com',
      ownerPhone: '+8801912345678',
      binNumber: '0044556677889',
      tinNumber: '445566778899',
      status: 'VERIFIED',
      kycDocsCount: '4/4 Verified',
      registeredAt: '2026-09-18',
    },
  ]);

  const filteredSellers = sellers.filter((s) => {
    if (activeFilter === 'ALL') return true;
    return s.status === activeFilter;
  });

  const handleApprove = (sellerId: string) => {
    setSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, status: 'VERIFIED', kycDocsCount: '4/4 Verified' } : s))
    );
    setReviewMessage(`Seller '${sellerId}' approved. Storefront publishing enabled.`);
    setTimeout(() => setReviewMessage(null), 3500);
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
                Platform Operations
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                Merchant Verification &amp; KYC Audit
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/categories"
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
            >
              Taxonomy &amp; Brands
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              ← Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {reviewMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <span>✓</span>
            <span>{reviewMessage}</span>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 bg-white border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Registered Merchants
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{sellers.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Multi-vendor storefront accounts</p>
          </Card>

          <Card className="p-5 bg-white border-slate-200">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Verified &amp; Active
            </span>
            <p className="text-3xl font-black text-emerald-600 mt-1">
              {sellers.filter((s) => s.status === 'VERIFIED').length}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Trade license &amp; NBR BIN approved</p>
          </Card>

          <Card className="p-5 bg-white border-slate-200">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Pending KYC Reviews
            </span>
            <p className="text-3xl font-black text-amber-600 mt-1">
              {sellers.filter((s) => s.status === 'PENDING').length}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Requires compliance inspection</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex border-b border-slate-200 space-x-2">
          {(['ALL', 'VERIFIED', 'PENDING'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
                activeFilter === filter
                  ? 'border-[#FF6A00] text-[#FF6A00]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {filter === 'ALL' ? 'All Merchants' : filter === 'VERIFIED' ? 'Verified Stores' : 'Pending Review'}
            </button>
          ))}
        </div>

        {/* Merchants Table */}
        <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Merchant Store &amp; Handle</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">Owner &amp; Contacts</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">NBR BIN / TIN</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase">KYC Dossier</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-center">Status</TableHead>
                  <TableHead className="text-[11px] text-slate-600 uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.map((s) => (
                  <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-[#0284C7] font-mono mt-0.5">{s.slug}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800">{s.ownerName}</div>
                      <div className="text-[11px] text-slate-500">{s.ownerEmail}</div>
                      <div className="text-[10px] font-mono text-slate-400">{s.ownerPhone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono font-bold text-slate-800">{s.binNumber}</div>
                      <div className="text-[10px] font-mono text-slate-400">TIN: {s.tinNumber}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {s.kycDocsCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.status === 'VERIFIED' ? 'success' : 'warning'} size="sm">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === 'PENDING' ? (
                        <button
                          onClick={() => handleApprove(s.id)}
                          className="px-3 py-1 bg-[#FF6A00] hover:bg-[#E55F00] text-white text-xs font-bold rounded shadow-sm"
                        >
                          Approve Dossier
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold">✓ Approved</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}
