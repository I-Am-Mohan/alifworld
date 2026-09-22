'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Filter,
  ArrowRight,
  Send,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

interface SellerGroupView {
  id: string;
  orderNumber: string;
  groupNumber: string;
  status: 'PENDING' | 'ACCEPTED' | 'PACKING' | 'READY_FOR_PICKUP' | 'HANDED_OVER_TO_COURIER' | 'IN_TRANSIT' | 'DELIVERED';
  createdAt: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  division: string;
  subtotalPoisha: bigint;
  shippingFeePoisha: bigint;
  taxPoisha: bigint;
  totalPoisha: bigint;
  commissionPoisha: bigint;
  payoutPoisha: bigint;
  courierProvider: string;
  trackingNumber: string;
  items: Array<{
    title: string;
    variant: string;
    sku: string;
    qty: number;
    unitPricePoisha: bigint;
    productPoints: number;
  }>;
}

export default function SellerOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [selectedGroup, setSelectedGroup] = useState<SellerGroupView | null>(null);

  const [groups, setGroups] = useState<SellerGroupView[]>([
    {
      id: 'sfg_demo_01',
      orderNumber: 'ORD-20260922-0001',
      groupNumber: 'ORD-20260922-0001-SFG01',
      status: 'HANDED_OVER_TO_COURIER',
      createdAt: '2026-09-22T10:30:00.000Z',
      recipientName: 'Tanvir Ahmed',
      recipientPhone: '+8801700112233',
      deliveryAddress: 'House 42, Road 11, Block D, Gulshan-2, Dhaka',
      division: 'DHAKA',
      subtotalPoisha: BigInt(2199000), // ৳21,990.00
      shippingFeePoisha: BigInt(6000),  // ৳60.00
      taxPoisha: BigInt(329850),        // ৳3,298.50
      totalPoisha: BigInt(2534850),      // ৳25,348.50
      commissionPoisha: BigInt(109950), // 5% = ৳1,099.50
      payoutPoisha: BigInt(2424900),     // ৳24,249.00
      courierProvider: 'PATHAO',
      trackingNumber: 'PTH-DHK-882910',
      items: [
        {
          title: 'Nexus Pro Smartphone 5G',
          variant: 'Midnight Black / 128GB',
          sku: 'PHN-NEXUS-BLK',
          qty: 1,
          unitPricePoisha: BigInt(2199000),
          productPoints: 450,
        },
      ],
    },
    {
      id: 'sfg_demo_02',
      orderNumber: 'ORD-20260922-0004',
      groupNumber: 'ORD-20260922-0004-SFG01',
      status: 'PENDING',
      createdAt: '2026-09-22T14:15:00.000Z',
      recipientName: 'Sadia Rahman',
      recipientPhone: '+8801811998877',
      deliveryAddress: 'Flat 4B, Road 7, Dhanmondi, Dhaka',
      division: 'DHAKA',
      subtotalPoisha: BigInt(598000), // 2x Earbuds = ৳5,980.00
      shippingFeePoisha: BigInt(6000),
      taxPoisha: BigInt(89700),
      totalPoisha: BigInt(693700),
      commissionPoisha: BigInt(29900), // 5% = ৳299.00
      payoutPoisha: BigInt(663800),    // ৳6,638.00
      courierProvider: 'STEADFAST',
      trackingNumber: '',
      items: [
        {
          title: 'AuraPods Pro Wireless ANC',
          variant: 'Titanium White',
          sku: 'AUD-AURAPOD-WHT',
          qty: 2,
          unitPricePoisha: BigInt(299000),
          productPoints: 60,
        },
      ],
    },
  ]);

  const formatBdt = (poisha: bigint) => {
    const taka = Number(poisha) / 100;
    return `৳${taka.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const advanceStatus = (groupId: string, nextStatus: SellerGroupView['status']) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, status: nextStatus } : g))
    );
  };

  const filteredGroups = groups.filter((g) => {
    if (activeFilter === 'ALL') return true;
    return g.status === activeFilter;
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      {/* Top Seller Nav */}
      <header className="sticky top-0 z-30 bg-[#1E293B] border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlifLogo size="md" inverted />
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                Seller Center • Dhaka Tech Ltd.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="/seller"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/seller/inventory"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Inventory
            </Link>
            <span className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">
              Fulfillment Orders
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-400" />
              Seller Fulfillment Center
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Strict multi-tenant isolation: You see and process only your own store’s fulfillment items.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-2 text-right">
              <span className="text-[11px] text-slate-400 block">Pending Fulfillment</span>
              <span className="text-lg font-bold text-amber-400">
                {groups.filter((g) => g.status === 'PENDING').length}
              </span>
            </div>
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-2 text-right">
              <span className="text-[11px] text-slate-400 block">Handed Over to Courier</span>
              <span className="text-lg font-bold text-emerald-400">
                {groups.filter((g) => g.status === 'HANDED_OVER_TO_COURIER').length}
              </span>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-800">
          {[
            { label: 'All Orders', value: 'ALL' },
            { label: 'Pending Acceptance', value: 'PENDING' },
            { label: 'Accepted', value: 'ACCEPTED' },
            { label: 'Packing', value: 'PACKING' },
            { label: 'Ready for Pickup', value: 'READY_FOR_PICKUP' },
            { label: 'Handed to Courier', value: 'HANDED_OVER_TO_COURIER' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === tab.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#1E293B] text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 shadow-md space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">
                      {group.groupNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      (Parent: {group.orderNumber})
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        group.status === 'PENDING'
                          ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                          : group.status === 'HANDED_OVER_TO_COURIER'
                          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                          : 'bg-blue-950/70 text-blue-300 border-blue-800'
                      }`}
                    >
                      {group.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Customer: {group.recipientName} • {group.recipientPhone} • {group.division}
                  </p>
                </div>

                {/* State Machine Transition Actions */}
                <div className="flex items-center gap-2">
                  {group.status === 'PENDING' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'ACCEPTED')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Accept Order
                    </button>
                  )}
                  {group.status === 'ACCEPTED' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'PACKING')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <Package className="w-4 h-4" /> Start Packing
                    </button>
                  )}
                  {group.status === 'PACKING' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'READY_FOR_PICKUP')}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" /> Mark Ready for Courier
                    </button>
                  )}
                  {group.status === 'READY_FOR_PICKUP' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'HANDED_OVER_TO_COURIER')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" /> Hand Over to {group.courierProvider}
                    </button>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800"
                  >
                    <div>
                      <span className="font-semibold text-white">{item.title}</span>
                      <span className="text-slate-400 ml-2">({item.variant})</span>
                      <span className="text-slate-500 block text-[11px] font-mono">
                        SKU: {item.sku} • Qty: {item.qty}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-emerald-400">
                        {formatBdt(item.unitPricePoisha * BigInt(item.qty))}
                      </span>
                      <span className="text-[11px] text-amber-400/90 block">
                        +{item.productPoints * item.qty} PP snapshot
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Settlement Breakdown */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Subtotal</span>
                    <span className="font-bold text-white">{formatBdt(group.subtotalPoisha)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Courier Fee</span>
                    <span className="font-bold text-white">{formatBdt(group.shippingFeePoisha)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Platform Comm. (5%)</span>
                    <span className="font-bold text-red-400">-{formatBdt(group.commissionPoisha)}</span>
                  </div>
                  <div className="border-l border-slate-700 pl-4">
                    <span className="text-slate-400 block text-[11px]">Net Merchant Payout</span>
                    <span className="text-base font-black text-emerald-400">
                      {formatBdt(group.payoutPoisha)}
                    </span>
                  </div>
                </div>

                {group.trackingNumber && (
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">
                      Courier Consignment ({group.courierProvider})
                    </span>
                    <span className="font-mono text-emerald-300 font-bold">
                      #{group.trackingNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
