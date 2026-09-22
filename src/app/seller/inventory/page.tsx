'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface StockBalanceView {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  onHand: number;
  reserved: number;
  damaged: number;
  quarantined: number;
  available: number;
  lowStockThreshold: number;
  reorderPoint: number;
}

interface ReservationView {
  id: string;
  cartId: string;
  variantTitle: string;
  sku: string;
  quantity: number;
  status: 'ACTIVE' | 'COMMITTED' | 'RELEASED' | 'EXPIRED';
  expiresAt: string;
  ttlRemaining: string;
}

interface MovementView {
  id: string;
  timestamp: string;
  movementType: 'RECEIVE' | 'RESERVE' | 'RELEASE' | 'COMMIT' | 'DAMAGE' | 'ADJUST';
  sku: string;
  variantTitle: string;
  warehouseCode: string;
  quantityDelta: number;
  availableAfter: number;
  sourceType: string;
  sourceId: string;
  reason: string;
}

export default function SellerInventoryPage() {
  const [activeTab, setActiveTab] = useState<'balances' | 'reservations' | 'ledger' | 'intake'>('balances');
  const [intakeQty, setIntakeQty] = useState<number>(20);
  const [selectedVariant, setSelectedVariant] = useState<string>('WLT-PRX60-BLU-128');
  const [poReference, setPoReference] = useState<string>('PO-2026-BANANI-09');
  const [intakeMessage, setIntakeMessage] = useState<string | null>(null);

  // Initial Seeded/Live State
  const [balances, setBalances] = useState<StockBalanceView[]>([
    {
      id: 'stb_dhk_walton_phone_hub',
      warehouseName: 'Dhaka Central Fulfillment Hub',
      warehouseCode: 'DHK-HUB-01',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro',
      variantTitle: 'Ocean Blue / 128GB',
      onHand: 80,
      reserved: 5,
      damaged: 1,
      quarantined: 0,
      available: 74,
      lowStockThreshold: 10,
      reorderPoint: 20,
    },
    {
      id: 'stb_dhk_walton_phone_depot',
      warehouseName: 'Dhaka Tech Banani Depot',
      warehouseCode: 'DHK-DTH-01',
      sku: 'WLT-PRX60-BLU-128',
      productTitle: 'Walton Primo S8 Pro',
      variantTitle: 'Ocean Blue / 128GB',
      onHand: 30,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 30,
      lowStockThreshold: 5,
      reorderPoint: 10,
    },
    {
      id: 'stb_dhk_xiaomi_buds_hub',
      warehouseName: 'Dhaka Central Fulfillment Hub',
      warehouseCode: 'DHK-HUB-01',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      variantTitle: 'Moonlight White',
      onHand: 120,
      reserved: 10,
      damaged: 2,
      quarantined: 0,
      available: 108,
      lowStockThreshold: 15,
      reorderPoint: 30,
    },
    {
      id: 'stb_dhk_xiaomi_buds_depot',
      warehouseName: 'Dhaka Tech Banani Depot',
      warehouseCode: 'DHK-DTH-01',
      sku: 'MI-BUDS5P-WHT',
      productTitle: 'Xiaomi Redmi Buds 5 Pro',
      variantTitle: 'Moonlight White',
      onHand: 45,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 45,
      lowStockThreshold: 10,
      reorderPoint: 20,
    },
  ]);

  const [reservations] = useState<ReservationView[]>([
    {
      id: 'res_checkout_walton_01',
      cartId: 'crt_demo_checkout_01',
      variantTitle: 'Walton Primo S8 Pro (Ocean Blue)',
      sku: 'WLT-PRX60-BLU-128',
      quantity: 5,
      status: 'ACTIVE',
      expiresAt: 'In 12 mins',
      ttlRemaining: '11m 48s',
    },
    {
      id: 'res_checkout_xiaomi_02',
      cartId: 'crt_demo_checkout_02',
      variantTitle: 'Xiaomi Redmi Buds 5 Pro (White)',
      sku: 'MI-BUDS5P-WHT',
      quantity: 10,
      status: 'ACTIVE',
      expiresAt: 'In 8 mins',
      ttlRemaining: '07m 32s',
    },
  ]);

  const [movements, setMovements] = useState<MovementView[]>([
    {
      id: 'mov_damage_earbuds_hub',
      timestamp: '2026-09-22 14:15:00',
      movementType: 'DAMAGE',
      sku: 'MI-BUDS5P-WHT',
      variantTitle: 'Moonlight White',
      warehouseCode: 'DHK-HUB-01',
      quantityDelta: -2,
      availableAfter: 108,
      sourceType: 'AUDIT_ADJUSTMENT',
      sourceId: 'stb_dhk_xiaomi_buds_hub',
      reason: 'Warehouse shelf transit impact testing damage',
    },
    {
      id: 'mov_res_earbuds_hub',
      timestamp: '2026-09-22 14:02:10',
      movementType: 'RESERVE',
      sku: 'MI-BUDS5P-WHT',
      variantTitle: 'Moonlight White',
      warehouseCode: 'DHK-HUB-01',
      quantityDelta: -10,
      availableAfter: 110,
      sourceType: 'CHECKOUT_RESERVATION',
      sourceId: 'crt_demo_checkout_02',
      reason: 'Buyer checkout session reservation',
    },
    {
      id: 'mov_intake_earbuds_hub',
      timestamp: '2026-09-22 13:00:00',
      movementType: 'RECEIVE',
      sku: 'MI-BUDS5P-WHT',
      variantTitle: 'Moonlight White',
      warehouseCode: 'DHK-HUB-01',
      quantityDelta: 120,
      availableAfter: 120,
      sourceType: 'PURCHASE_ORDER',
      sourceId: 'PO-2026-003',
      reason: 'Initial platform hub inventory intake',
    },
    {
      id: 'mov_res_walton_hub',
      timestamp: '2026-09-22 12:45:30',
      movementType: 'RESERVE',
      sku: 'WLT-PRX60-BLU-128',
      variantTitle: 'Ocean Blue / 128GB',
      warehouseCode: 'DHK-HUB-01',
      quantityDelta: -5,
      availableAfter: 75,
      sourceType: 'CHECKOUT_RESERVATION',
      sourceId: 'crt_demo_checkout_01',
      reason: 'Buyer checkout session reservation',
    },
    {
      id: 'mov_intake_walton_hub',
      timestamp: '2026-09-22 12:00:00',
      movementType: 'RECEIVE',
      sku: 'WLT-PRX60-BLU-128',
      variantTitle: 'Ocean Blue / 128GB',
      warehouseCode: 'DHK-HUB-01',
      quantityDelta: 80,
      availableAfter: 80,
      sourceType: 'PURCHASE_ORDER',
      sourceId: 'PO-2026-001',
      reason: 'Initial platform hub inventory intake',
    },
  ]);

  const totalOnHand = balances.reduce((acc, b) => acc + b.onHand, 0);
  const totalReserved = balances.reduce((acc, b) => acc + b.reserved, 0);
  const totalDamaged = balances.reduce((acc, b) => acc + b.damaged + b.quarantined, 0);
  const totalAvailable = balances.reduce((acc, b) => acc + b.available, 0);

  const handleSimulateIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (intakeQty <= 0) return;

    setBalances((prev) =>
      prev.map((item) => {
        if (item.sku === selectedVariant && item.warehouseCode === 'DHK-DTH-01') {
          const newOnHand = item.onHand + intakeQty;
          const newAvailable = newOnHand - item.reserved - item.damaged - item.quarantined;
          return {
            ...item,
            onHand: newOnHand,
            available: newAvailable,
          };
        }
        return item;
      })
    );

    const newMovement: MovementView = {
      id: `mov_intake_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      movementType: 'RECEIVE',
      sku: selectedVariant,
      variantTitle: selectedVariant === 'WLT-PRX60-BLU-128' ? 'Ocean Blue / 128GB' : 'Moonlight White',
      warehouseCode: 'DHK-DTH-01',
      quantityDelta: intakeQty,
      availableAfter: (balances.find((b) => b.sku === selectedVariant && b.warehouseCode === 'DHK-DTH-01')?.available ?? 0) + intakeQty,
      sourceType: 'PURCHASE_ORDER',
      sourceId: poReference,
      reason: 'Merchant depot purchase order intake',
    };

    setMovements((prev) => [newMovement, ...prev]);
    setIntakeMessage(`Successfully received ${intakeQty} units into Banani Depot (${poReference}). Available stock recalculated.`);
    setTimeout(() => setIntakeMessage(null), 4000);
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
                Seller Center
              </span>
              <h1 className="text-sm font-black text-slate-900 leading-tight">
                Multi-Warehouse Inventory Control
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setActiveTab('intake')}
              className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold text-xs shadow-sm shadow-orange-500/25"
            >
              + Receive Stock (PO)
            </Button>
            <Link
              href="/seller/products"
              className="px-4 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
            >
              Products Catalog
            </Link>
            <Link
              href="/seller"
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        {/* Strict Invariant Formula Callout */}
        <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-[#FF6A00] text-white font-black flex items-center justify-center text-sm shrink-0">
              i
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Strict Domain Invariant Enforced</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                <code className="font-mono bg-white border border-orange-200 px-2 py-0.5 rounded text-[#EA580C] font-bold">
                  Available = OnHand - Reserved - Damaged - Quarantined
                </code>
                {' '}— Client-side overrides are strictly rejected.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-slate-500">
            OCC Version Locking Active • Strict TTL Expiry: 15m
          </div>
        </div>

        {/* Primary KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 bg-white border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Physical On-Hand
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{totalOnHand}</p>
            <p className="text-[11px] text-slate-500 mt-1">Physical count in facilities</p>
          </Card>

          <Card className="p-5 bg-white border-slate-200">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              Active Checkout Reserved
            </span>
            <p className="text-3xl font-black text-amber-600 mt-1">{totalReserved}</p>
            <p className="text-[11px] text-slate-500 mt-1">Locked in active buyer carts (15m TTL)</p>
          </Card>

          <Card className="p-5 bg-white border-slate-200">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Damaged / Quarantine
            </span>
            <p className="text-3xl font-black text-rose-600 mt-1">{totalDamaged}</p>
            <p className="text-[11px] text-slate-500 mt-1">Unfulfillable units under inspection</p>
          </Card>

          <Card className="p-5 bg-orange-50/60 border-orange-200">
            <span className="text-[11px] font-bold text-[#EA580C] uppercase tracking-wider">
              Net Available for Sale
            </span>
            <p className="text-3xl font-black text-[#FF6A00] mt-1">{totalAvailable}</p>
            <p className="text-[11px] text-slate-600 mt-1">Storefront checkout purchasing ceiling</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 space-x-2">
          <button
            onClick={() => setActiveTab('balances')}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'balances'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Stock Balances ({balances.length})
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'reservations'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Active Reservations ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'ledger'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Movement Ledger ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('intake')}
            className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'intake'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Receive Stock (PO Intake)
          </button>
        </div>

        {/* Tab 1: Stock Balances Table */}
        {activeTab === 'balances' && (
          <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900">Facility Stock Balances</CardTitle>
              <span className="text-xs text-slate-500">Dhaka Central Hub &amp; Banani Depot</span>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Product &amp; SKU</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Warehouse Facility</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-right">On-Hand</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-right">Reserved</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-right">Damaged</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-right">Available</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((row) => (
                    <TableRow key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <TableCell>
                        <div className="font-bold text-xs text-slate-900">{row.productTitle}</div>
                        <div className="text-[11px] text-slate-500">{row.variantTitle}</div>
                        <div className="text-[10px] font-mono text-slate-400">{row.sku}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-700">{row.warehouseName}</div>
                        <div className="text-[10px] font-mono text-[#0284C7] font-semibold">{row.warehouseCode}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-700 font-bold">
                        {row.onHand}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600 font-bold">
                        {row.reserved}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-rose-600 font-bold">
                        {row.damaged}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-black text-[#FF6A00]">
                          {row.available}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.available > row.lowStockThreshold ? (
                          <Badge variant="success" size="sm">IN STOCK</Badge>
                        ) : row.available > 0 ? (
                          <Badge variant="warning" size="sm">LOW STOCK</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">OUT OF STOCK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Tab 2: Active Checkout Reservations */}
        {activeTab === 'reservations' && (
          <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Active Buyer Checkout Reservations</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Temporary stock locks held during customer checkout. Automatically released upon 15m TTL cutoff.
                </p>
              </div>
              <Badge variant="warning" size="sm">TTL = 15 MINUTES</Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Reservation ID</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Cart Session</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Variant</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-right">Locked Qty</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Time to Expiry</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((res) => (
                    <TableRow key={res.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <TableCell className="font-mono text-xs text-slate-600">
                        {res.id}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#0284C7] font-semibold">
                        {res.cartId}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-bold text-slate-900">{res.variantTitle}</div>
                        <div className="text-[10px] font-mono text-slate-400">{res.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-amber-600 font-bold">
                        {res.quantity} units
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          ⏱️ {res.ttlRemaining}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="warning" size="sm">ACTIVE</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Tab 3: Immutable Movement Ledger */}
        {activeTab === 'ledger' && (
          <Card className="border-slate-200 bg-white p-0 overflow-hidden shadow-sm">
            <CardHeader className="border-b border-slate-200 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Append-Only Stock Movement Ledger</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographically audited, immutable record of every inventory delta. Entries are never updated or deleted.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                LIFECYCLE: IMMUTABLE
              </span>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Timestamp</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Type</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Variant &amp; Facility</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-right">Delta</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase text-right">Available After</TableHead>
                    <TableHead className="text-[11px] text-slate-600 uppercase">Source &amp; Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((mov) => (
                    <TableRow key={mov.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <TableCell className="font-mono text-[11px] text-slate-500">
                        {mov.timestamp}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            mov.movementType === 'RECEIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : mov.movementType === 'RESERVE'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : mov.movementType === 'DAMAGE'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {mov.movementType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold text-slate-900">{mov.variantTitle}</div>
                        <div className="text-[10px] font-mono text-slate-500">{mov.sku} • {mov.warehouseCode}</div>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${
                        mov.quantityDelta > 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-black text-[#FF6A00]">
                        {mov.availableAfter}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-700">{mov.reason}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {mov.sourceType}: {mov.sourceId}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Tab 4: Direct Stock Intake Form */}
        {activeTab === 'intake' && (
          <Card className="border-slate-200 bg-white max-w-2xl shadow-sm">
            <CardHeader className="border-b border-slate-200 py-4 px-6">
              <CardTitle className="text-sm font-bold text-slate-900">Direct Stock Intake (Purchase Order)</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Record incoming stock units into your merchant warehouse. Automatically recalculates available stock and appends an immutable movement log.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {intakeMessage && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  ✓ {intakeMessage}
                </div>
              )}
              <form onSubmit={handleSimulateIntake} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination Warehouse
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Dhaka Tech Banani Depot (DHK-DTH-01)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Product Variant
                  </label>
                  <select
                    value={selectedVariant}
                    onChange={(e) => setSelectedVariant(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                  >
                    <option value="WLT-PRX60-BLU-128">Walton Primo S8 Pro (Ocean Blue / 128GB)</option>
                    <option value="MI-BUDS5P-WHT">Xiaomi Redmi Buds 5 Pro (Moonlight White)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Intake Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={intakeQty}
                    onChange={(e) => setIntakeQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Order / Invoice Reference
                  </label>
                  <input
                    type="text"
                    value={poReference}
                    onChange={(e) => setPoReference(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:border-[#FF6A00] focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('balances')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#FF6A00] hover:bg-[#E55F00] text-white font-bold"
                  >
                    Confirm Stock Intake &amp; Update Ledger
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
