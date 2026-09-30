'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { CustomerParentOrderDTO } from '@/features/orders/types/order.types';
import { csrfFetch } from '@/shared/security/csrf-client';
import { AlifLogo } from '@/components/brand/logo';
import { useI18n } from '@/i18n/context';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedTime,
} from '@/shared/utils/localization';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ArrowLeft,
  Store,
  Phone,
  Calendar,
  ShieldAlert,
  FileText,
  RefreshCw,
} from 'lucide-react';

export default function OrderTrackingPage() {
  const { locale } = useI18n();
  const params = useParams();
  const orderNumber = (params?.orderNumber as string) || '';
  const text = (en: string, bn: string) => (locale.startsWith('bn') ? bn : en);

  const [liveOrder, setLiveOrder] = React.useState<CustomerParentOrderDTO | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refresh, setRefresh] = React.useState(0);
  const cancellation = React.useRef<{ key: string; reason: string } | null>(null);
  const [isCancelling, setIsCancelling] = React.useState<boolean>(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchLiveOrder() {
      try {
        const res = await fetch(`/api/v1/customer/orders/${encodeURIComponent(orderNumber)}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(String(res.status));
        if (isMounted) setLiveOrder(json.data);
      } catch {
        if (isMounted) setLoadError('LOAD_FAILED');
      }
    }
    void fetchLiveOrder();
    return () => {
      isMounted = false;
    };
  }, [orderNumber, refresh]);

  const handleCancelOrder = async () => {
    const reason = prompt(
      text('Reason for cancellation (3-500 characters):', 'বাতিলের কারণ (৩-৫০০ অক্ষর):'),
      cancellation.current?.reason || ''
    );
    if (!reason || !reason.trim()) return;
    if (reason.trim().length < 3 || reason.trim().length > 500) {
      setCancelError(
        text('Enter a reason between 3 and 500 characters.', '৩ থেকে ৫০০ অক্ষরের কারণ লিখুন।')
      );
      return;
    }
    if (cancellation.current?.reason !== reason.trim())
      cancellation.current = { reason: reason.trim(), key: crypto.randomUUID() };

    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await csrfFetch(
        `/api/v1/customer/orders/${encodeURIComponent(orderNumber)}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': cancellation.current!.key,
          },
          body: JSON.stringify({ reason: reason.trim() }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          text(
            'Cancellation failed. Refresh or retry.',
            'বাতিল করা যায়নি। রিফ্রেশ করুন বা আবার চেষ্টা করুন।'
          )
        );
      }
      setLiveOrder(json.data);
      cancellation.current = null;
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : text('Cancellation failed.', 'বাতিল করা যায়নি।')
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (!liveOrder)
    return (
      <main className="mx-auto max-w-5xl p-6 space-y-4">
        <AlifLogo size="md" />
        <h1 className="text-xl font-bold break-all">
          {text('Order', 'অর্ডার')} {orderNumber}
        </h1>
        <p role={loadError ? 'alert' : 'status'}>
          {loadError
            ? text(
                'Unable to load this order. Sign in and retry.',
                'অর্ডার লোড করা যায়নি। সাইন ইন করে আবার চেষ্টা করুন।'
              )
            : text('Loading order...', 'অর্ডার লোড হচ্ছে...')}
        </p>
        {loadError && (
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setRefresh((value) => value + 1);
            }}
            className="inline-flex gap-2 items-center border p-2 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
            {text('Retry', 'আবার চেষ্টা করুন')}
          </button>
        )}
        <Link href="/">{text('Return to Store', 'স্টোরে ফিরে যান')}</Link>
      </main>
    );
  const order = {
    ...liveOrder,
    ...liveOrder.financialSummary,
    fulfillmentGroups: liveOrder.packages,
  };

  const formatBdt = (poisha: number) => formatLocalizedCurrency(BigInt(poisha), locale);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <AlifLogo size="md" />
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 bg-green-50 text-[#1B5E20] border border-green-200 rounded-full">
              Real-Time Shipment Tracking
            </span>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-[#1B5E20] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Store
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Order Header Summary Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div>
              <div className="flex flex-wrap items-center gap-3 break-all">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                  Order #{order.orderNumber}
                </h1>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
                  {locale.startsWith('bn') ? order.statusLabelBn : order.statusLabelEn}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatLocalizedDate(new Date(order.createdAt), locale)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />{' '}
                  {locale.startsWith('bn')
                    ? order.paymentStatusLabelBn
                    : order.paymentStatusLabelEn}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-gray-500 block">Total Paid (Exact Poisha)</span>
              <span className="text-2xl font-black text-[#1B5E20]">
                {formatBdt(order.totalPoisha)}
              </span>
            </div>
          </div>
          {/* Points Banner */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase">
                  Independent Loyalty Points
                </h4>
                <p className="text-sm font-semibold text-amber-800">
                  {order.totalProductPoints} Product Points (PP) Snapshotted
                </p>
              </div>
            </div>
            <span className="text-xs bg-white/80 text-amber-900 font-medium px-3 py-1 rounded-full border border-amber-200">
              {text('Product Points snapshot', 'প্রোডাক্ট পয়েন্ট স্ন্যাপশট')}
            </span>
          </div>
          {/* Customer Self-Service Actions */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {order.selfServiceActions.canDownloadInvoice && (
                <Link
                  href={`/api/v1/checkout/tax-breakdown/${encodeURIComponent(order.id)}`}
                  target="_blank"
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-gray-500" />
                  NBR Mushak-6.3 Invoice
                </Link>
              )}
            </div>

            {(order.selfServiceActions?.canCancel ?? order.status === 'PENDING_PAYMENT') && (
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 transition-colors disabled:opacity-50"
              >
                {isCancelling
                  ? text('Cancelling...', 'বাতিল হচ্ছে...')
                  : text('Cancel Order', 'অর্ডার বাতিল করুন')}
              </button>
            )}
          </div>
          {cancelError && (
            <div
              role="alert"
              className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200"
            >
              {cancelError}
            </div>
          )}{' '}
        </div>

        {/* Multi-Vendor Seller Fulfillment Groups */}
        {order.fulfillmentGroups.map((group) => (
          <div
            key={group.id}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 text-[#1B5E20] rounded-xl border border-green-200">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">{group.sellerName}</h2>
                    <span className="text-xs text-gray-400 font-mono">({group.groupNumber})</span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {text('Package', 'প্যাকেজ')}: {group.groupNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-semibold rounded-lg">
                  {locale.startsWith('bn') ? group.statusLabelBn : group.statusLabelEn}
                </span>
              </div>
            </div>

            {/* Item List */}
            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.productTitle}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <Package aria-hidden="true" className="w-12 h-12 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {item.productTitle}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Variant: {item.variantTitle} • SKU: {item.sku}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-600">Qty: {item.quantity}</span>
                      <span className="text-xs font-bold text-[#1B5E20]">
                        {formatBdt(item.totalPoisha)}
                      </span>
                      <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium px-2 py-0.2 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />+{item.totalProductPoints} PP
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Courier Dispatch & Event Timeline */}
            <div className="pt-4 border-t border-gray-100">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#1B5E20]" />
                    <div>
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                        Logistics Partner: {group.courierProvider}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        Consignment #{group.trackingNumber}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md self-start sm:self-auto">
                    {locale.startsWith('bn') ? group.statusLabelBn : group.statusLabelEn}
                  </span>
                </div>

                {/* Timeline */}
                {!group.trackingNumber && (
                  <p className="text-xs text-gray-500">
                    {text('Tracking is not available yet.', 'ট্র্যাকিং এখনো পাওয়া যায়নি।')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Append-Only Order Lifecycle Audit Log */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Clock className="w-5 h-5 text-gray-500" />
            Append-Only Order State Audit Trail
          </h2>

          <div className="space-y-3">
            {order.statusHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between text-xs p-3 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">
                      {locale.startsWith('bn') ? entry.statusLabelBn : entry.statusLabelEn}
                    </span>
                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-semibold">
                      {entry.actorRole}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-0.5">{entry.reason}</p>
                </div>
                <span className="text-gray-400">
                  {formatLocalizedTime(new Date(entry.occurredAt), locale)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
