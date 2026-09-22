'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Coins,
  Sparkles,
  Search,
  Filter,
  Eye,
  Store,
} from 'lucide-react';

interface AdminOrderView {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  division: string;
  status: string;
  paymentStatus: string;
  subtotalPoisha: bigint;
  shippingFeePoisha: bigint;
  taxPoisha: bigint;
  totalPoisha: bigint;
  totalProductPoints: number;
  pointsReleased: boolean;
  createdAt: string;
  groups: Array<{
    groupNumber: string;
    sellerName: string;
    status: string;
    courierProvider: string;
    trackingNumber: string;
    commissionPoisha: bigint;
    payoutPoisha: bigint;
  }>;
}

export default function AdminOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');

  const [orders] = useState<AdminOrderView[]>([
    {
      id: 'ord_demo_01',
      orderNumber: 'ORD-20260922-0001',
      customerName: 'Tanvir Ahmed',
      customerPhone: '+8801700112233',
      division: 'DHAKA',
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      subtotalPoisha: BigInt(2199000), // ৳21,990.00
      shippingFeePoisha: BigInt(6000),
      taxPoisha: BigInt(329850),
      totalPoisha: BigInt(2534850),
      totalProductPoints: 450,
      pointsReleased: false,
      createdAt: '2026-09-22T10:30:00.000Z',
      groups: [
        {
          groupNumber: 'ORD-20260922-0001-SFG01',
          sellerName: 'Dhaka Tech Ltd.',
          status: 'HANDED_OVER_TO_COURIER',
          courierProvider: 'PATHAO',
          trackingNumber: 'PTH-DHK-882910',
          commissionPoisha: BigInt(109950),
          payoutPoisha: BigInt(2424900),
        },
      ],
    },
    {
      id: 'ord_demo_02',
      orderNumber: 'ORD-20260922-0002',
      customerName: 'Kazi Mahbub',
      customerPhone: '+8801911445566',
      division: 'CHITTAGONG',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      subtotalPoisha: BigInt(4500000), // ৳45,000.00
      shippingFeePoisha: BigInt(12000),
      taxPoisha: BigInt(675000),
      totalPoisha: BigInt(5187000),
      totalProductPoints: 800,
      pointsReleased: true,
      createdAt: '2026-09-21T09:15:00.000Z',
      groups: [
        {
          groupNumber: 'ORD-20260921-0002-SFG01',
          sellerName: 'Chittagong Electronics Hub',
          status: 'DELIVERED',
          courierProvider: 'STEADFAST',
          trackingNumber: 'STF-CTG-10293',
          commissionPoisha: BigInt(225000),
          payoutPoisha: BigInt(4962000),
        },
      ],
    },
  ]);

  const formatBdt = (poisha: bigint) => {
    const taka = Number(poisha) / 100;
    return `৳${taka.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm);
    const matchesDivision = divisionFilter === 'ALL' || o.division === divisionFilter;
    return matchesSearch && matchesDivision;
  });

  const totalPlatformVolumePoisha = orders.reduce((acc, o) => acc + o.totalPoisha, BigInt(0));
  const totalCommissionPoisha = orders.reduce(
    (acc, o) => acc + o.groups.reduce((gAcc, g) => gAcc + g.commissionPoisha, BigInt(0)),
    BigInt(0)
  );
  const totalPointsSnapshotted = orders.reduce((acc, o) => acc + o.totalProductPoints, 0);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      {/* Top Admin Nav */}
      <header className="sticky top-0 z-30 bg-[#1E293B] border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlifLogo size="md" inverted />
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2.5 py-0.5 rounded-full">
                Platform Admin Backoffice
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/admin" className="text-slate-300 hover:text-white transition-colors">
              Overview
            </Link>
            <Link
              href="/admin/warehouses"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Warehouses
            </Link>
            <span className="text-amber-400 font-bold border-b-2 border-amber-400 pb-1">
              Orders & Logistics
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title & Platform Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Coins className="w-6 h-6 text-amber-400" />
              Central Orders & Logistics Ledger
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Multi-vendor order partition oversight across all 8 Bangladesh administrative divisions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-2 text-right">
              <span className="text-[11px] text-slate-400 block">Total Gross GMV</span>
              <span className="text-base font-black text-emerald-400">
                {formatBdt(totalPlatformVolumePoisha)}
              </span>
            </div>
            <div className="bg-[#1E293B] border border-slate-700 rounded-xl px-4 py-2 text-right">
              <span className="text-[11px] text-slate-400 block">Platform Commission</span>
              <span className="text-base font-black text-amber-400">
                {formatBdt(totalCommissionPoisha)}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Order #, Customer, Phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Division:
            </span>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All 8 Divisions</option>
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
        </div>

        {/* Orders Table */}
        <div className="bg-[#1E293B] border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Order / Reference</th>
                  <th className="py-3.5 px-4 font-semibold">Customer</th>
                  <th className="py-3.5 px-4 font-semibold">Division</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Total Amount (Poisha)</th>
                  <th className="py-3.5 px-4 font-semibold">Product Points</th>
                  <th className="py-3.5 px-4 font-semibold">Fulfillment Groups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-white">
                      <Link
                        href={`/orders/${order.orderNumber}`}
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        {order.orderNumber}
                      </Link>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        {new Date(order.createdAt).toLocaleString('en-BD')}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-semibold text-white block">{order.customerName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{order.customerPhone}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-semibold">
                        {order.division}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-950 text-blue-300 border border-blue-800">
                        {order.status}
                      </span>
                      <span className="text-[10px] text-emerald-400 block mt-1">
                        ● {order.paymentStatus}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-emerald-400">
                      {formatBdt(order.totalPoisha)}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                        <Sparkles className="w-3 h-3" />
                        {order.totalProductPoints} PP
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {order.pointsReleased ? 'Released' : 'Pending Return Window'}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {order.groups.map((grp, gIdx) => (
                          <div
                            key={gIdx}
                            className="bg-slate-900/80 p-2 rounded border border-slate-800 text-[11px]"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-200">
                              <span>{grp.sellerName}</span>
                              <span className="text-emerald-400">{grp.courierProvider}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                              <span>Track: {grp.trackingNumber}</span>
                              <span>Comm: {formatBdt(grp.commissionPoisha)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
