'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlifLogo } from '@/components/brand/logo';
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
} from 'lucide-react';

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = (params?.orderNumber as string) || 'ORD-20260922-0001';

  // Demo order data matching seeded order
  const order = {
    orderNumber,
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    createdAt: '2026-09-22T10:30:00.000Z',
    customerName: 'Tanvir Ahmed',
    customerPhone: '+8801700112233',
    shippingDivision: 'DHAKA',
    shippingDistrict: 'Dhaka (Gulshan-2)',
    shippingAddress: 'House 42, Road 11, Block D, Gulshan-2, Dhaka-1212',
    subtotalPoisha: BigInt(2199000), // ৳21,990.00
    shippingFeePoisha: BigInt(6000),  // ৳60.00
    taxPoisha: BigInt(329850),        // ৳3,298.50
    totalPoisha: BigInt(2534850),      // ৳25,348.50
    totalProductPoints: 450,
    pointsReleased: false,
    fulfillmentGroups: [
      {
        id: 'sfg_01',
        groupNumber: `${orderNumber}-SFG01`,
        sellerName: 'Dhaka Tech Ltd.',
        sellerSlug: 'dhaka-tech',
        warehouseName: 'Dhaka Tech Banani Logistics Depot',
        status: 'HANDED_OVER_TO_COURIER',
        subtotalPoisha: BigInt(2199000),
        courierProvider: 'PATHAO',
        trackingNumber: 'PTH-DHK-882910',
        items: [
          {
            id: 'itm_01',
            productTitle: 'Nexus Pro Smartphone 5G',
            variantTitle: 'Midnight Black / 128GB',
            sku: 'PHN-NEXUS-BLK',
            imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&q=80',
            unitPricePoisha: BigInt(2199000),
            quantity: 1,
            totalPoisha: BigInt(2199000),
            productPointSnapshot: 450,
            totalProductPoints: 450,
          },
        ],
        shipment: {
          shipmentNumber: 'SHP-20260922-0001',
          status: 'IN_TRANSIT',
          events: [
            {
              id: 'she_01',
              status: 'LABEL_CREATED',
              description: 'Merchant generated Pathao delivery consignment label',
              occurredAt: '2026-09-22T11:00:00.000Z',
            },
            {
              id: 'she_02',
              status: 'PICKED_UP',
              location: 'Banani Depot, Dhaka',
              description: 'Pathao courier rider picked up package for dispatch',
              occurredAt: '2026-09-22T13:30:00.000Z',
            },
            {
              id: 'she_03',
              status: 'IN_TRANSIT',
              location: 'Tejgaon Sorting Hub, Dhaka',
              description: 'Package in sorting queue for last-mile route transit',
              occurredAt: '2026-09-22T15:15:00.000Z',
            },
          ],
        },
      },
    ],
    statusHistory: [
      {
        id: 'osh_01',
        toStatus: 'PENDING_PAYMENT',
        actorRole: 'CUSTOMER',
        reason: 'Order placed by customer at checkout',
        createdAt: '2026-09-22T10:30:00.000Z',
      },
      {
        id: 'osh_02',
        toStatus: 'CONFIRMED',
        actorRole: 'SYSTEM',
        reason: 'Payment authorized and verified via bKash gateway',
        createdAt: '2026-09-22T10:32:00.000Z',
      },
      {
        id: 'osh_03',
        toStatus: 'PROCESSING',
        actorRole: 'SELLER',
        reason: 'Merchant accepted fulfillment group and started packaging',
        createdAt: '2026-09-22T10:45:00.000Z',
      },
    ],
  };

  const formatBdt = (poisha: bigint) => {
    const taka = Number(poisha) / 100;
    return `৳${taka.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                  Order #{order.orderNumber}
                </h1>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full">
                  {order.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(order.createdAt).toLocaleDateString('en-BD', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Payment Settled ({order.paymentStatus})
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
                <h4 className="text-xs font-bold text-amber-900 uppercase">Independent Loyalty Points</h4>
                <p className="text-sm font-semibold text-amber-800">
                  {order.totalProductPoints} Product Points (PP) Snapshotted
                </p>
              </div>
            </div>
            <span className="text-xs bg-white/80 text-amber-900 font-medium px-3 py-1 rounded-full border border-amber-200">
              Pending Return Inspection Window
            </span>
          </div>
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
                    Origin: {group.warehouseName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-semibold rounded-lg">
                  {group.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Item List */}
            <div className="space-y-4">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.productTitle}
                    className="w-16 h-16 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                  />
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
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        +{item.totalProductPoints} PP
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
                    {group.shipment.status}
                  </span>
                </div>

                {/* Timeline */}
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-green-200">
                  {group.shipment.events.map((event, idx) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#1B5E20] border-2 border-white" />
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-900">{event.description}</p>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                          {new Date(event.occurredAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{event.location}</p>
                      )}
                    </div>
                  ))}
                </div>
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
                    <span className="font-bold text-gray-800">{entry.toStatus}</span>
                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-semibold">
                      {entry.actorRole}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-0.5">{entry.reason}</p>
                </div>
                <span className="text-gray-400">
                  {new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
