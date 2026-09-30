'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { useI18n } from '@/i18n/context';
import { formatLocalizedCurrency } from '@/shared/utils/localization';
import { csrfFetch } from '@/shared/security/csrf-client';
import { useAuthModal } from '@/components/auth/auth-context';
import type { SellerFulfillmentOrderDTO } from '@/features/orders/types/order.types';
import {
  FULFILLMENT_GROUP_STATUS_LABELS,
  type FulfillmentGroupStatus,
} from '@/features/orders/state-machines/order-state-machine';
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SellerGroupView {
  id: string;
  orderNumber: string;
  groupNumber: string;
  status: FulfillmentGroupStatus;
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
  const { locale } = useI18n();
  const { user } = useAuthModal();
  const text = (en: string, bn: string) => (locale.startsWith('bn') ? bn : en);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [groups, setGroups] = useState<SellerGroupView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const requestKeys = useRef(new Map<string, string>());
  const canManage =
    !!user &&
    (user.roles.includes('SUPER_ADMIN') ||
      user.permissions?.some((permission) =>
        ['orders:manage', 'seller:orders:manage'].includes(permission)
      ));

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (activeFilter !== 'ALL') params.set('status', activeFilter);
        const response = await fetch(`/api/v1/seller/orders?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const body = await response.json();
        if (!response.ok || !body.success)
          throw new Error(
            response.status === 403
              ? 'FORBIDDEN'
              : response.status === 401
                ? 'UNAUTHENTICATED'
                : 'LOAD_FAILED'
          );
        const records: SellerFulfillmentOrderDTO[] = body.data;
        setGroups(
          records.map((record) => ({
            id: record.id,
            orderNumber: record.orderNumber,
            groupNumber: record.groupNumber,
            status: record.status as FulfillmentGroupStatus,
            createdAt: record.createdAt,
            recipientName: record.deliveryContact.recipientName,
            recipientPhone: record.deliveryContact.recipientPhoneMasked,
            deliveryAddress: record.deliveryContact.address,
            division: record.deliveryContact.division,
            subtotalPoisha: BigInt(record.financialBreakdown.subtotalPoisha),
            shippingFeePoisha: BigInt(record.financialBreakdown.shippingFeePoisha),
            taxPoisha: BigInt(record.financialBreakdown.taxPoisha),
            totalPoisha: BigInt(record.financialBreakdown.totalPoisha),
            commissionPoisha: BigInt(record.financialBreakdown.sellerCommissionPoisha),
            payoutPoisha: BigInt(record.financialBreakdown.sellerPayoutPoisha),
            courierProvider: record.logistics.courierProvider || '',
            trackingNumber: record.logistics.trackingNumber || '',
            items: record.items.map((item) => ({
              title: item.productTitle,
              variant: item.variantTitle,
              sku: item.sku,
              qty: item.quantity,
              unitPricePoisha: BigInt(item.unitPricePoisha),
              productPoints: item.productPointSnapshot,
            })),
          }))
        );
        setTotal(body.meta.total);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'LOAD_FAILED');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [page, activeFilter, refresh]);

  const formatBdt = (poisha: bigint) => formatLocalizedCurrency(poisha, locale);

  const advanceStatus = async (groupId: string, nextStatus: SellerGroupView['status']) => {
    if (saving || !canManage) return;
    const action = `${groupId}:${nextStatus}`;
    const key = requestKeys.current.get(action) || crypto.randomUUID();
    requestKeys.current.set(action, key);
    setSaving(groupId);
    setError(null);
    setNotice(null);
    try {
      const response = await csrfFetch(`/api/v1/seller/orders/${groupId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ nextStatus }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(
          response.status === 403
            ? 'FORBIDDEN'
            : response.status === 409
              ? 'CONFLICT'
              : 'UPDATE_FAILED'
        );
      requestKeys.current.delete(action);
      setNotice(nextStatus);
      setLoading(true);
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'UPDATE_FAILED');
    } finally {
      setSaving(null);
    }
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
                {text('Seller Center', 'বিক্রেতা কেন্দ্র')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/seller" className="text-slate-300 hover:text-white transition-colors">
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
              {text('Fulfillment Orders', 'ফুলফিলমেন্ট অর্ডার')}
            </h1>
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
              onClick={() => {
                setActiveFilter(tab.value);
                setPage(1);
                setLoading(true);
                setError(null);
              }}
              aria-pressed={activeFilter === tab.value}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeFilter === tab.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#1E293B] text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {tab.value === 'ALL'
                ? text('All Orders', 'সব অর্ডার')
                : FULFILLMENT_GROUP_STATUS_LABELS[tab.value as FulfillmentGroupStatus][
                    locale.startsWith('bn') ? 'bn' : 'en'
                  ]}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="text-sm">
            {loading
              ? text('Loading orders...', 'অর্ডার লোড হচ্ছে...')
              : `${total} ${text('orders', 'অর্ডার')}`}
          </p>
          <button
            type="button"
            title={text('Refresh', 'রিফ্রেশ')}
            aria-label={text('Refresh orders', 'অর্ডার রিফ্রেশ')}
            disabled={loading || !!saving}
            onClick={() => {
              setLoading(true);
              setError(null);
              setRefresh((value) => value + 1);
            }}
            className="p-2 border border-slate-600 rounded-lg disabled:opacity-50 focus-visible:outline focus-visible:outline-2"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error === 'FORBIDDEN'
              ? text('You do not have permission for this action.', 'এই কাজের অনুমতি নেই।')
              : error === 'UNAUTHENTICATED'
                ? text('Sign in to view your orders.', 'অর্ডার দেখতে সাইন ইন করুন।')
                : error === 'CONFLICT'
                  ? text(
                      'The order changed. Refresh before retrying.',
                      'অর্ডার পরিবর্তিত হয়েছে। আবার চেষ্টা করার আগে রিফ্রেশ করুন।'
                    )
                  : text(
                      'Request failed. Please retry.',
                      'অনুরোধ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
                    )}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm text-emerald-300">
            {
              FULFILLMENT_GROUP_STATUS_LABELS[notice as FulfillmentGroupStatus][
                locale.startsWith('bn') ? 'bn' : 'en'
              ]
            }
          </p>
        )}
        {!loading && !error && groups.length === 0 && (
          <p className="py-8 text-slate-400">
            {text('No orders found.', 'কোনো অর্ডার পাওয়া যায়নি।')}
          </p>
        )}
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 shadow-md space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
                <div>
                  <div className="flex flex-wrap items-center gap-3 break-all">
                    <span className="font-mono text-sm font-bold text-white">
                      {group.groupNumber}
                    </span>
                    <span className="text-xs text-slate-400">(Parent: {group.orderNumber})</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        group.status === 'PENDING'
                          ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                          : group.status === 'HANDED_OVER_TO_COURIER'
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                            : 'bg-blue-950/70 text-blue-300 border-blue-800'
                      }`}
                    >
                      {
                        FULFILLMENT_GROUP_STATUS_LABELS[group.status][
                          locale.startsWith('bn') ? 'bn' : 'en'
                        ]
                      }
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Customer: {group.recipientName} • {group.recipientPhone} • {group.division}
                  </p>
                </div>

                {/* State Machine Transition Actions */}
                <fieldset
                  disabled={!!saving || !canManage || loading}
                  className="flex flex-wrap items-center gap-2 disabled:opacity-50"
                >
                  {group.status === 'PENDING' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'ACCEPTED')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />{' '}
                      {text('Accept Order', 'অর্ডার গ্রহণ করুন')}
                    </button>
                  )}
                  {group.status === 'ACCEPTED' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'PACKING')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <Package className="w-4 h-4" /> {text('Start Packing', 'প্যাকিং শুরু করুন')}
                    </button>
                  )}
                  {group.status === 'PACKING' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'READY_FOR_PICKUP')}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" />{' '}
                      {text('Ready for Pickup', 'পিকআপের জন্য প্রস্তুত')}
                    </button>
                  )}
                  {group.status === 'READY_FOR_PICKUP' && (
                    <button
                      onClick={() => advanceStatus(group.id, 'HANDED_OVER_TO_COURIER')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />{' '}
                      {text('Confirm Handover', 'হস্তান্তর নিশ্চিত করুন')}
                    </button>
                  )}
                </fieldset>
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
                    <span className="font-bold text-white">
                      {formatBdt(group.shippingFeePoisha)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {text('Platform Commission', 'প্ল্যাটফর্ম কমিশন')}
                    </span>
                    <span className="font-bold text-red-400">
                      -{formatBdt(group.commissionPoisha)}
                    </span>
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
        <nav
          aria-label={text('Order pages', 'অর্ডার পৃষ্ঠা')}
          className="flex justify-end items-center gap-4"
        >
          <button
            title={text('Previous page', 'আগের পৃষ্ঠা')}
            aria-label={text('Previous page', 'আগের পৃষ্ঠা')}
            disabled={page === 1 || loading || !!saving}
            onClick={() => {
              setPage((value) => value - 1);
              setLoading(true);
              setError(null);
            }}
            className="p-2 border border-slate-600 rounded-lg disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>{page}</span>
          <button
            title={text('Next page', 'পরের পৃষ্ঠা')}
            aria-label={text('Next page', 'পরের পৃষ্ঠা')}
            disabled={page * 20 >= total || loading || !!saving}
            onClick={() => {
              setPage((value) => value + 1);
              setLoading(true);
              setError(null);
            }}
            className="p-2 border border-slate-600 rounded-lg disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      </main>
    </div>
  );
}
