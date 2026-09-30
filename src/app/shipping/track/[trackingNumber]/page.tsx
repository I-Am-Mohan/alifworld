'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
import { useI18n } from '@/i18n/context';
import { formatLocalizedDate, formatLocalizedTime } from '@/shared/utils/localization';
import type { CourierTrackingResultDTO } from '@/features/shipping/types/courier.types';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export default function PublicShipmentTrackingPage() {
  const { locale } = useI18n();
  const params = useParams();
  const trackingNumber = (params?.trackingNumber as string) || '';
  const text = (en: string, bn: string) => (locale.startsWith('bn') ? bn : en);

  const [tracking, setTracking] = useState<CourierTrackingResultDTO | null>(null);
  const [loading, setLoading] = useState(Boolean(trackingNumber));
  const [error, setError] = useState<string | null>(trackingNumber ? null : 'NO_TRACKING_NUMBER');

  const loadTracking = useCallback(
    (signal?: AbortSignal) => {
      if (!trackingNumber) {
        return Promise.resolve();
      }

      return fetch(`/api/v1/shipping/track/${encodeURIComponent(trackingNumber)}`, { signal })
        .then(async (res) => {
          const body = await res.json().catch(() => null);
          if (!res.ok || !body?.success) {
            throw new Error(
              res.status === 404 ? 'NOT_FOUND' : body?.error?.message || 'LOAD_FAILED'
            );
          }
          setTracking(body.data);
          setError(null);
        })
        .catch((err: any) => {
          if (signal?.aborted) return;
          setError(err.message || 'LOAD_FAILED');
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [trackingNumber]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadTracking(controller.signal);
    return () => controller.abort();
  }, [loadTracking]);

  const handleRefresh = () => {
    setLoading(true);
    void loadTracking();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'OUT_FOR_DELIVERY':
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FAILED_DELIVERY':
      case 'RETURNED_TO_SELLER':
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlifLogo size="md" />
            <span className="hidden sm:inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {text('Parcel Tracking', 'পার্সেল ট্র্যাকিং')}
            </span>
          </div>

          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{text('Back to Store', 'স্টোরে ফিরুন')}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Tracking Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>{text('Shipment Tracking', 'শিপমেন্ট ট্র্যাকিং')}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 break-all">
              {trackingNumber || text('No Tracking ID', 'ট্র্যাকিং আইডি নেই')}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={text('Refresh Tracking', 'ট্র্যাকিং রিফ্রেশ করুন')}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>
              {loading
                ? text('Updating...', 'আপডেট হচ্ছে...')
                : text('Refresh Status', 'স্ট্যাটাস রিফ্রেশ')}
            </span>
          </button>
        </div>

        {/* Loading State */}
        {loading && !tracking && (
          <div
            role="status"
            className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs"
          >
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {text(
                'Locating consignment across logistics networks...',
                'কুরিয়ার নেটওয়ার্ক থেকে তথ্য সংগ্রহ করা হচ্ছে...'
              )}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-xs space-y-3"
          >
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                {error === 'NOT_FOUND'
                  ? text('Shipment Not Found', 'শিপমেন্ট পাওয়া যায়নি')
                  : text('Unable to load tracking details', 'ট্র্যাকিং তথ্য লোড করা যায়নি')}
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              {error === 'NOT_FOUND'
                ? text(
                    'No active consignment matching this tracking number was located. The courier may still be registering the physical label. Please verify the number and check back shortly.',
                    'এই ট���র্যাকিং নম্বরের কোনো সক্রিয় পার্সেল পাওয়া যায়নি। কুরিয়ার এখনো লেবেল সিস্টেমে যুক্ত না করে থাকতে পারে। অনুগ্রহ করে কিছু সময় পর আবার চেষ্টা করুন।'
                  )
                : text(
                    'A network or server error occurred. Please refresh or retry.',
                    'নেটওয়ার্ক ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
                  )}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{text('Retry', 'আবার চেষ্টা করুন')}</span>
            </button>
          </div>
        )}

        {/* Tracking Details Card */}
        {tracking && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              {/* Summary Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold border ${getStatusBadge(tracking.currentStatus)}`}
                    >
                      {locale.startsWith('bn') ? tracking.statusLabelBn : tracking.statusLabelEn}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {tracking.courierName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {text('Consignment ID', 'কনসাইনমেন্ট আইডি')}:{' '}
                    <span className="font-mono font-bold text-slate-700">
                      {tracking.consignmentId}
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {text('Payment terms', 'পেমেন্ট শর্ত')}
                  </span>
                  {tracking.isPrepaid ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                      {text('Prepaid Digitally', 'ডিজিটাল প্রিপেইড')}
                    </span>
                  ) : (
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 mt-0.5">
                      {text('Cash on Delivery: ', 'ক্যাশ অন ডেলিভারি: ')}
                      {tracking.codAmountBdtFormatted}
                    </span>
                  )}
                </div>
              </div>

              {/* Recipient & Destination Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    {text('Recipient Details', 'প্রাপকের বিবরণ')}
                  </p>
                  <p className="font-bold text-slate-900">{tracking.recipientName}</p>
                  <p className="text-slate-600 font-mono">{tracking.recipientPhoneMasked}</p>
                  <p className="text-slate-600 mt-1 whitespace-pre-wrap">
                    {tracking.deliveryAddress}
                  </p>
                  <p className="text-slate-600 font-semibold">
                    {tracking.district}, {tracking.division}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    {text('Logistics Status', 'লজিস্টিক অবস্থা')}
                  </p>
                  <p className="text-slate-700 font-medium">
                    {text('Current Hub / Location', 'বর্তমান অবস্থান')}:{' '}
                    <span className="font-bold text-slate-900">
                      {tracking.currentLocation || 'In Transit'}
                    </span>
                  </p>
                  {tracking.estimatedDeliveryDate && (
                    <p className="text-slate-700 font-medium mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {text('Est. Delivery', 'আনুমানিক ডেলিভারি')}:{' '}
                        {formatLocalizedDate(new Date(tracking.estimatedDeliveryDate), locale)}
                      </span>
                    </p>
                  )}
                  {tracking.isDelivered && tracking.deliveredAt && (
                    <p className="text-emerald-700 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {text('Delivered on', 'ডেলিভারি হয়েছে')}:{' '}
                        {formatLocalizedDate(new Date(tracking.deliveredAt), locale)}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Chronological Event Timeline */}
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>
                    {text('Logistics Event Timeline', 'শিপমেন্ট ট্র্যাকিং ইভেন্ট টাইমলাইন')}
                  </span>
                </h2>

                {tracking.events.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 italic">
                    {text(
                      'No checkpoint events recorded yet.',
                      'এখনো কোনো চেকপয়েন্ট ইভেন্ট রেকর্ড করা হয়নি।'
                    )}
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {tracking.events.map((event, idx) => (
                      <div key={idx} className="relative">
                        {/* Dot */}
                        <div
                          className={`absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            event.status === 'DELIVERED'
                              ? 'bg-emerald-500 ring-2 ring-emerald-200'
                              : idx === 0
                                ? 'bg-blue-500 ring-2 ring-blue-200'
                                : 'bg-slate-400'
                          }`}
                        />
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{event.description}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatLocalizedDate(new Date(event.occurredAt), locale)} •{' '}
                              {formatLocalizedTime(new Date(event.occurredAt), locale)}
                            </span>
                          </div>
                          {event.location && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{event.location}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>
            © 2026 AlifWorld. All rights reserved. Authoritative BDT Minor-Unit E-Commerce
            Logistics.
          </p>
        </div>
      </footer>
    </div>
  );
}
