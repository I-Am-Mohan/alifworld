'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlifLogo } from '@/components/brand/logo';
import { useAuthModal } from '@/components/auth/auth-context';
import { csrfFetch } from '@/shared/security/csrf-client';
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

interface CartItem {
  id: string;
  sellerId: string;
  sellerName: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  imageUrl?: string;
  pricePoisha: bigint;
  productPoint: number;
  quantity: number;
}

export default function CartPage() {
  const { locale } = useI18n();
  const { user, isLoadingUser, openAuthModal } = useAuthModal();
  const [cartId, setCartId] = useState<string | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const checkoutAttempt = useRef<{ fingerprint: string; key: string } | null>(null);

  const [division, setDivision] = useState<string>('DHAKA');
  const [recipientName, setRecipientName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [orderCreated, setOrderCreated] = useState<string | null>(null);

  const loadCart = async () => {
    setIsLoading(true);
    try {
      const guestToken = typeof window !== 'undefined' ? localStorage.getItem('alifworld_guest_cart_token') : null;
      const headers: Record<string, string> = {};
      if (guestToken) {
        headers['x-guest-cart-token'] = guestToken;
      }

      const response = await fetch('/api/v1/cart', {
        cache: 'no-store',
        headers,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Unable to load your cart');

      if (body.data?.isGuest && body.data?.guestCartToken && typeof window !== 'undefined') {
        localStorage.setItem('alifworld_guest_cart_token', body.data.guestCartToken);
      }

      setCartId(body.data?.id ?? null);
      setItems((body.data?.items ?? []).map((item: any) => ({
        id: item.id,
        sellerId: item.sellerId,
        sellerName: item.sellerName || item.seller?.businessName || '',
        productTitle: item.productTitle || item.variant?.product?.title || '',
        variantTitle: item.variantTitle || item.variant?.title || '',
        sku: item.sku || item.variant?.sku || '',
        imageUrl: item.imageUrl || item.variant?.imageUrl || undefined,
        pricePoisha: BigInt(item.pricePoisha),
        productPoint: item.productPoint || 0,
        quantity: item.quantity,
      })));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your cart');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoadingUser) return;
    const init = async () => {
      if (user && typeof window !== 'undefined') {
        const guestToken = localStorage.getItem('alifworld_guest_cart_token');
        if (guestToken) {
          try {
            await csrfFetch('/api/v1/cart/merge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guestCartToken: guestToken }),
            });
            localStorage.removeItem('alifworld_guest_cart_token');
          } catch (err) {
            console.warn('Auto merge error:', err);
          }
        }
      }
      await loadCart();
    };
    void init();
  }, [user, isLoadingUser]);

  // Math in integer poisha (1 BDT = 100 poisha)
  const subtotalPoisha = items.reduce(
    (acc, item) => acc + item.pricePoisha * BigInt(item.quantity),
    BigInt(0)
  );

  // Group items by seller
  const sellerPackages = React.useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of items) {
      const existing = map.get(item.sellerId) || [];
      existing.push(item);
      map.set(item.sellerId, existing);
    }
    return Array.from(map.entries()).map(([sellerId, pkgItems], idx) => {
      const sellerSubtotal = pkgItems.reduce(
        (sum, i) => sum + i.pricePoisha * BigInt(i.quantity),
        0n
      );
      const isDhaka = division === 'DHAKA';
      const qualifiesFree = sellerSubtotal >= 200000n; // ৳2,000 free shipping
      const shippingFee = qualifiesFree ? 0n : isDhaka ? 6000n : 12000n;
      return {
        sellerId,
        sellerName: pkgItems[0].sellerName || 'Verified Merchant',
        packageNumber: idx + 1,
        items: pkgItems,
        subtotal: sellerSubtotal,
        qualifiesFree,
        shippingFee,
        neededForFree: qualifiesFree ? 0n : 200000n - sellerSubtotal,
      };
    });
  }, [items, division]);

  const totalShippingFeePoisha = sellerPackages.reduce((acc, p) => acc + p.shippingFee, 0n);
  const estimatedGrandTotalPoisha = subtotalPoisha + totalShippingFeePoisha;

  // Discrete Product Points (STRICT: independent integer loyalty units)
  const totalProductPoints = items.reduce(
    (acc, item) => acc + item.productPoint * item.quantity,
    0
  );

  const formatBdt = (poisha: bigint) => formatLocalizedCurrency(poisha, locale);

  const updateQuantity = async (id: string, delta: number) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setBusyItem(id);
    try {
      const response = await csrfFetch(`/api/v1/cart/items/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: item.quantity + delta }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Unable to update quantity');
      checkoutAttempt.current = null;
      await loadCart();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update quantity');
    } finally {
      setBusyItem(null);
    }
  };

  const removeItem = async (id: string) => {
    setBusyItem(id);
    try {
      const response = await csrfFetch(`/api/v1/cart/items/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Unable to remove item');
      checkoutAttempt.current = null;
      await loadCart();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove item');
    } finally {
      setBusyItem(null);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartId) return;
    setIsCheckingOut(true);
    setError(null);
    const checkout = { shippingName: recipientName, shippingPhone: phone, shippingDivision: division,
      shippingDistrict: district, shippingAddress: address };
    const fingerprint = JSON.stringify([cartId, checkout]);
    if (checkoutAttempt.current?.fingerprint !== fingerprint) {
      checkoutAttempt.current = { fingerprint, key: crypto.randomUUID() };
    }
    try {
      const response = await csrfFetch('/api/v1/cart/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': checkoutAttempt.current.key },
        body: JSON.stringify({ cartId, checkout }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Checkout failed');
      setOrderCreated(body.data.orderNumber);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout failed');
    } finally {
      setIsCheckingOut(false);
    }
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
        {error && <div role="alert" className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" onClick={() => void loadCart()} className="underline">Retry loading cart</button></div>}
        {(isLoadingUser || isLoading) ? (
          <p role="status">Loading cart...</p>
        ) : orderCreated ? (
          <div className="max-w-2xl mx-auto bg-white border border-green-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-green-100 text-[#1B5E20] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order placed</h1>
            <p className="text-gray-600 mb-4">
              Your order <span className="font-semibold text-gray-900">#{orderCreated}</span> was recorded. Payment and fulfillment are pending.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 inline-flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#1B5E20]" />
              <span className="text-sm font-semibold text-[#1B5E20]">
                {totalProductPoints} Product Points (PP) recorded with the order. Posting is subject to approved eligibility rules.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href={`/orders/${orderCreated}`}
                className="px-6 py-3 bg-[#1B5E20] hover:bg-[#154a19] text-white font-medium rounded-xl shadow transition-colors flex items-center justify-center gap-2"
              >
                View Order <ArrowRight className="w-4 h-4" />
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
              {!user && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold text-amber-900">Guest Shopping Cart</div>
                    <div className="text-amber-700">
                      Sign in to permanently save your items, earn Product Points, and access corporate B2B pricing.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="px-3.5 py-1.5 bg-[#1B5E20] hover:bg-[#154a19] text-white font-bold text-xs rounded-xl whitespace-nowrap transition-colors"
                  >
                    Sign In to Merge
                  </button>
                </div>
              )}

              {/* Multi-Vendor Seller Fulfillment Packages */}
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#1B5E20]" />
                    Review Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    {sellerPackages.length} {sellerPackages.length === 1 ? 'Seller Package' : 'Seller Packages'}
                  </span>
                </div>

                {sellerPackages.map((pkg) => (
                  <div key={pkg.sellerId} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
                    {/* Package Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-xs font-extrabold rounded-lg">
                          Package {pkg.packageNumber} of {sellerPackages.length}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                          <Store className="w-3.5 h-3.5 text-[#1B5E20]" />
                          <span>{pkg.sellerName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Delivery:</span>
                        <span className="font-semibold text-gray-800">
                          {pkg.qualifiesFree ? (
                            <span className="text-emerald-700 font-bold">FREE Delivery</span>
                          ) : (
                            formatBdt(pkg.shippingFee)
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Free shipping progress bar */}
                    {!pkg.qualifiesFree && pkg.neededForFree > 0n && (
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
                        <span>
                          Add <strong>{formatBdt(pkg.neededForFree)}</strong> more from this seller for <strong>FREE Delivery</strong>!
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider whitespace-nowrap">
                          Threshold: ৳2,000
                        </span>
                      </div>
                    )}

                    {/* Package Items */}
                    <div className="divide-y divide-gray-100">
                      {pkg.items.map((item) => (
                        <div key={item.id} className="py-4 flex gap-4 items-start first:pt-0 last:pb-0">
                          {item.imageUrl ? (
                            <Image
                              unoptimized
                              src={item.imageUrl}
                              alt={item.productTitle}
                              width={80}
                              height={80}
                              className="w-20 h-20 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <span className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400" aria-hidden="true">
                              <ShoppingBag className="w-6 h-6" />
                            </span>
                          )}

                          <div className="flex-1 min-w-0">
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
                                disabled={busyItem === item.id}
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
                                disabled={busyItem === item.id}
                                className="p-1 text-gray-600 hover:text-black hover:bg-gray-100 rounded-r-lg transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={busyItem === item.id}
                              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="shipping-district">District</label>
                    <input id="shipping-district" required value={district} onChange={(event) => setDistrict(event.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl" />
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
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatBdt(subtotalPoisha)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-gray-400" />
                      Delivery ({sellerPackages.length} {sellerPackages.length === 1 ? 'Package' : 'Packages'})
                    </span>
                    <span className="font-semibold text-gray-900">
                      {totalShippingFeePoisha === 0n ? (
                        <span className="text-emerald-700 font-bold">FREE</span>
                      ) : (
                        formatBdt(totalShippingFeePoisha)
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                    <span className="text-base font-bold text-gray-900">Estimated Total</span>
                    <span className="text-xl font-black text-gray-900">
                      {formatBdt(estimatedGrandTotalPoisha)}
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
                        Product Points are independent of BDT. Eligibility for posting requires an approved rule.
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
                    'Placing order...'
                  ) : (
                    <>
                      Confirm & Place Order <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-[#1B5E20]" />
                  <span>Prices are stored in integer poisha</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
