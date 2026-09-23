'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Filter,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { formatLocalizedCurrency, formatLocalizedDateTime } from '@/shared/utils/localization';

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
  const { locale } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // No demo data - empty orders registry
  const [orders] = useState<AdminOrderView[]>([]);

  const formatBdt = (poisha: bigint) => formatLocalizedCurrency(poisha, locale);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm);
    const matchesDivision = divisionFilter === 'ALL' || o.division === divisionFilter;
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesDivision && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Overview</span>
            <span>&gt;</span>
            <span className="text-amber-600 font-bold">Orders</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Orders Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central multi-vendor order partition oversight across all 8 Bangladesh administrative divisions.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors w-fit shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Dashboard Overview</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order #, Customer, Phone..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Division:</span>
          </div>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="ALL">All Divisions</option>
            <option value="DHAKA">Dhaka</option>
            <option value="CHITTAGONG">Chittagong</option>
            <option value="RAJSHAHI">Rajshahi</option>
            <option value="KHULNA">Khulna</option>
            <option value="BARISAL">Barisal</option>
            <option value="SYLHET">Sylhet</option>
            <option value="RANGPUR">Rangpur</option>
            <option value="MYMENSINGH">Mymensingh</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table or Empty State */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredOrders.length === 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4 shadow-xs">
              <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-black text-slate-900">No data available</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm leading-relaxed">
              No orders have been recorded in the platform yet. As customers check out on storefronts, order entries will display here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Order / Reference</th>
                  <th className="py-3.5 px-4 font-bold">Customer</th>
                  <th className="py-3.5 px-4 font-bold">Division</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Total Amount</th>
                  <th className="py-3.5 px-4 font-bold">Product Points</th>
                  <th className="py-3.5 px-4 font-bold">Fulfillment Groups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      <Link
                        href={`/orders/${order.orderNumber}`}
                        className="text-amber-600 hover:underline flex items-center gap-1"
                      >
                        {order.orderNumber}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        {new Date(order.createdAt).toLocaleString('en-BD')}
                      </span>
                    </td>
formatLocalizedDateTime(new Date(order.createdAt), locale
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-900 block">{order.customerName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{order.customerPhone}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-semibold text-[11px]">
                        {order.division}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                        {order.status}
                      </span>
                      <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">
                        ● {order.paymentStatus}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {formatBdt(order.totalPoisha)}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md text-[10px] border border-purple-200">
                        <Sparkles className="w-3 h-3 text-purple-500" />
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
                            className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-[11px]"
                          >
                            <div className="flex items-center justify-between font-semibold text-slate-800">
                              <span>{grp.sellerName}</span>
                              <span className="text-emerald-600 font-bold">{grp.courierProvider}</span>
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
        )}
      </div>
    </div>
  );
}
