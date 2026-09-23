'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { useI18n } from '@/i18n/context';
import { formatLocalizedCurrency } from '@/shared/utils/localization';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  Store,
} from 'lucide-react';

interface DemoCartItem {
  id: string;
  sellerId: string;
  sellerName: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  imageUrl: string;
  pricePoisha: bigint;
  productPoint: number;
  quantity: number;
}

export default function CartPage() {
  const { locale } = useI18n();
  const [items, setItems] = useState<DemoCartItem[]>([
    {
      id: 'cit_earbuds_01',
      sellerId: 'sel_dhaka_tech',
      sellerName: 'Dhaka Tech Ltd.',
      productTitle: 'AuraPods Pro Wireless ANC',
      variantTitle: 'Titanium White',
      sku: 'AUD-AURAPOD-WHT',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&q=80',
      pricePoisha: BigInt(299000), // ৳2,990.00
      productPoint: 60,
      quantity: 1,
    },
    {
      id: 'cit_phone_01',
      sellerId: 'sel_dhaka_tech',
      sellerName: 'Dhaka Tech Ltd.',
      productTitle: 'Nexus Pro Smartphone 5G',
      variantTitle: 'Midnight Black / 128GB',
      sku: 'PHN-NEXUS-BLK',
      imageUrl: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&q=80',
      pricePoisha: BigInt(2199000), // ৳21,990.00
      productPoint: 450,
      quantity: 1,
    },
  ]);

  const [division, setDivision] = useState<string>('DHAKA');
  const [recipientName, setRecipientName] = useState<string>('Tanvir Ahmed');
  const [phone, setPhone] = useState<string>('01700112233');
  const [address, setAddress] = useState<string>('House 42, Road 11, Block D, Gulshan-2, Dhaka');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [orderCreated, setOrderCreated] = useState<string | null>(null);

  // Math in integer poisha (1 BDT = 100 poisha)
  const subtotalPoisha = items.reduce(
    (acc, item) => acc + item.pricePoisha * BigInt(item.quantity),
    BigInt(0)
  );

  // Group items by seller for distinct fulfillment calculations
  const sellerCount = new Set(items.map((i) => i.sellerId)).size;
  const shippingPerSeller = division === 'DHAKA' ? BigInt(6000) : BigInt(12000);
  const totalShippingFeePoisha = items.length > 0 ? shippingPerSeller * BigInt(sellerCount) : BigInt(0);

  // NBR Standard VAT (15.00%)
  const totalTaxPoisha = (subtotalPoisha * BigInt(15)) / BigInt(100);

  const grandTotalPoisha = subtotalPoisha + totalShippingFeePoisha + totalTaxPoisha;

  // Discrete Product Points (STRICT: independent integer loyalty units)
  const totalProductPoints = items.reduce(
    (acc, item) => acc + item.productPoint * item.quantity,
    0
  );

  const formatBdt = (poisha: bigint) => formatLocalizedCurrency(poisha, locale);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as DemoCartItem[]
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setOrderCreated('ORD-20260922-0001');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <AlifLogo size="md" />
            <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 bg-green-50 text-[#1B5E20] border border-green-200 rounded-full">
              Standard Checkout (BDT Poisha)
            </span>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-[#1B5E20] transition-colors"
          >
            ← Continue Shopping
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orderCreated ? (
          <div className="max-w-2xl mx-auto bg-white border border-green-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 text-[#1B5E20] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600 mb-4">
              Your order <span className="font-semibold text-gray-900">#{orderCreated}</span> has been successfully recorded in the transaction ledger and partitioned into seller fulfillment groups.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 inline-flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#1B5E20]" />
              <span className="text-sm font-semibold text-[#1B5E20]">
                {totalProductPoints} Product Points (PP) snapshotted and pending delivery release!
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href={`/orders/${orderCreated}`}
                className="px-6 py-3 bg-[#1B5E20] hover:bg-[#154a19] text-white font-medium rounded-xl shadow transition-colors flex items-center justify-center gap-2"
              >
                Track Live Shipment <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Return to Storefront
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your Shopping Cart is Empty</h2>
            <p className="text-sm text-gray-500 mb-6">
              Browse genuine products from verified merchants across Bangladesh.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B5E20] hover:bg-[#154a19] text-white font-semibold rounded-xl transition-colors"
            >
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Cart Items & Shipping Address Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Cart Items Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#1B5E20]" />
                    Review Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    Multi-Vendor Tenancy Scoped
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="py-4 flex gap-4 items-start">
                      <img
                        src={item.imageUrl}
                        alt={item.productTitle}
                        className="w-20 h-20 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                          <Store className="w-3.5 h-3.5 text-[#1B5E20]" />
                          <span className="font-semibold text-gray-700">{item.sellerName}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {item.productTitle}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">Variant: {item.variantTitle}</p>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#1B5E20]">
                            {formatBdt(item.pricePoisha)}
                          </span>
                          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            +{item.productPoint * item.quantity} PP
                          </span>
                        </div>
                      </div>

                      {/* Quantity Modifier */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded-l-lg transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="px-3 text-xs font-bold text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded-r-lg transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <MapPin className="w-5 h-5 text-[#1B5E20]" />
                  Shipping Destination (Bangladesh)
                </h2>

                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Recipient Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                          placeholder="Tanvir Ahmed"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Mobile Phone (+880)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                          placeholder="01700112233"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Administrative Division
                    </label>
                    <select
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B5E20] focus:outline-none bg-white font-medium"
                    >
                      <option value="DHAKA">Dhaka Division (৳60 Shipping / Same Day Dispatch)</option>
                      <option value="CHITTAGONG">Chittagong Division (৳120 Shipping)</option>
                      <option value="RAJSHAHI">Rajshahi Division (৳120 Shipping)</option>
                      <option value="KHULNA">Khulna Division (৳120 Shipping)</option>
                      <option value="BARISAL">Barisal Division (৳120 Shipping)</option>
                      <option value="SYLHET">Sylhet Division (৳120 Shipping)</option>
                      <option value="RANGPUR">Rangpur Division (৳120 Shipping)</option>
                      <option value="MYMENSINGH">Mymensingh Division (৳120 Shipping)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Full Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1B5E20] focus:outline-none"
                      placeholder="House, Road, Area, Landmark"
                    />
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Order Ledger Breakdown */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold text-gray-900 pb-3 border-b border-gray-100">
                  Order Summary
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatBdt(subtotalPoisha)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-gray-400" />
                      Courier Fulfillment ({division})
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatBdt(totalShippingFeePoisha)}
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>NBR Mushak 6.3 VAT (15%)</span>
                    <span className="font-semibold text-gray-900">{formatBdt(totalTaxPoisha)}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="text-base font-bold text-gray-900">Total Payable</span>
                    <span className="text-2xl font-black text-[#1B5E20]">
                      {formatBdt(grandTotalPoisha)}
                    </span>
                  </div>
                </div>

                {/* Independent Product Points Reward Box */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                        Earnable Loyalty Rewards
                      </h4>
                      <p className="text-sm font-bold text-amber-800">
                        {totalProductPoints} Product Points (PP)
                      </p>
                      <p className="text-[11px] text-amber-700/90 mt-0.5 leading-snug">
                        Product points are discrete integer tokens designated per SKU with zero conversion rate to BDT cash. Points snapshot at checkout and release upon delivery completion.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isCheckingOut}
                  className="w-full py-3.5 px-4 bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    'Recording Atomic Ledger Order...'
                  ) : (
                    <>
                      Confirm & Place Order <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-[#1B5E20]" />
                  <span>Integer Poisha Financial Precision • Zero Rounding Error</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
