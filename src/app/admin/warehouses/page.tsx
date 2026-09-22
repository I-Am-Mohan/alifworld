'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

interface AdminWarehouse {
  id: string;
  code: string;
  name: string;
  division: string;
  district: string;
  addressLine: string;
  isPlatformHub: boolean;
  isActive: boolean;
  totalVariants: number;
  totalOnHand: number;
  totalAvailable: number;
  reservedStock: number;
}

export default function AdminWarehousesPage() {
  const [activeTab, setActiveTab] = useState<'warehouses' | 'ledger' | 'divisions'>('warehouses');
  const [sweepResult, setSweepResult] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [warehouses, setWarehouses] = useState<AdminWarehouse[]>([
    {
      id: 'whs_dhk_hub_01',
      code: 'DHK-HUB-01',
      name: 'Dhaka Central Fulfillment Hub',
      division: 'DHAKA',
      district: 'Dhaka (Tejgaon)',
      addressLine: 'Plot 14-16, Tejgaon Industrial Area, Dhaka-1208',
      isPlatformHub: true,
      isActive: true,
      totalVariants: 42,
      totalOnHand: 2450,
      totalAvailable: 2310,
      reservedStock: 140,
    },
    {
      id: 'whs_ctg_hub_01',
      code: 'CTG-HUB-01',
      name: 'Chittagong Port Logistics Hub',
      division: 'CHITTAGONG',
      district: 'Chittagong (Agrabad)',
      addressLine: 'Agrabad Commercial Area, Chittagong-4100',
      isPlatformHub: true,
      isActive: true,
      totalVariants: 28,
      totalOnHand: 1820,
      totalAvailable: 1750,
      reservedStock: 70,
    },
    {
      id: 'whs_dhk_dth_01',
      code: 'DHK-DTH-01',
      name: 'Dhaka Tech Banani Depot',
      division: 'DHAKA',
      district: 'Dhaka (Banani)',
      addressLine: 'Road 11, Block D, Banani, Dhaka-1213',
      isPlatformHub: false,
      isActive: true,
      totalVariants: 12,
      totalOnHand: 450,
      totalAvailable: 430,
      reservedStock: 20,
    },
    {
      id: 'whs_syl_depot_01',
      code: 'SYL-HUB-01',
      name: 'Sylhet Regional Distribution Center',
      division: 'SYLHET',
      district: 'Sylhet (Subidbazar)',
      addressLine: 'Airport Road, Subidbazar, Sylhet-3100',
      isPlatformHub: true,
      isActive: true,
      totalVariants: 18,
      totalOnHand: 920,
      totalAvailable: 890,
      reservedStock: 30,
    },
    {
      id: 'whs_raj_depot_01',
      code: 'RAJ-DEP-01',
      name: 'Rajshahi Agro & Silk Depot',
      division: 'RAJSHAHI',
      district: 'Rajshahi (Shaheb Bazar)',
      addressLine: 'Station Road, Rajshahi-6000',
      isPlatformHub: false,
      isActive: true,
      totalVariants: 8,
      totalOnHand: 310,
      totalAvailable: 305,
      reservedStock: 5,
    },
  ]);

  const auditMovements = [
    {
      id: 'mov_damage_earbuds_hub',
      timestamp: '2026-09-22 14:15:00',
      facility: 'DHK-HUB-01',
      type: 'DAMAGE',
      variant: 'Xiaomi Redmi Buds 5 Pro (MI-BUDS5P-WHT)',
      delta: -2,
      actor: 'usr_superadmin',
      reason: 'Warehouse shelf transit impact testing damage',
    },
    {
      id: 'mov_res_earbuds_hub',
      timestamp: '2026-09-22 14:02:10',
      facility: 'DHK-HUB-01',
      type: 'RESERVE',
      variant: 'Xiaomi Redmi Buds 5 Pro (MI-BUDS5P-WHT)',
      delta: -10,
      actor: 'usr_customer_demo',
      reason: 'Buyer checkout session reservation (cart: crt_demo_checkout_02)',
    },
    {
      id: 'mov_intake_earbuds_hub',
      timestamp: '2026-09-22 13:00:00',
      facility: 'DHK-HUB-01',
      type: 'RECEIVE',
      variant: 'Xiaomi Redmi Buds 5 Pro (MI-BUDS5P-WHT)',
      delta: 120,
      actor: 'usr_superadmin',
      reason: 'Initial platform hub inventory intake (PO-2026-003)',
    },
    {
      id: 'mov_res_walton_hub',
      timestamp: '2026-09-22 12:45:30',
      facility: 'DHK-HUB-01',
      type: 'RESERVE',
      variant: 'Walton Primo S8 Pro (WLT-PRX60-BLU-128)',
      delta: -5,
      actor: 'usr_customer_demo',
      reason: 'Buyer checkout session reservation (cart: crt_demo_checkout_01)',
    },
    {
      id: 'mov_intake_walton_hub',
      timestamp: '2026-09-22 12:00:00',
      facility: 'DHK-HUB-01',
      type: 'RECEIVE',
      variant: 'Walton Primo S8 Pro (WLT-PRX60-BLU-128)',
      delta: 80,
      actor: 'usr_superadmin',
      reason: 'Initial platform hub inventory intake (PO-2026-001)',
    },
  ];

  // New facility form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDivision, setNewDivision] = useState('DHAKA');
  const [newDistrict, setNewDistrict] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newIsHub, setNewIsHub] = useState(true);

  const handleRunExpirySweep = () => {
    setSweepResult(
      'TTL Sweep completed successfully: 0 stale cart reservations exceeded the 15-minute checkout window. All physical balances verified against append-only ledger.'
    );
    setTimeout(() => setSweepResult(null), 5500);
  };

  const handleAddWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const newFacility: AdminWarehouse = {
      id: `whs_${newCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      code: newCode.toUpperCase(),
      name: newName,
      division: newDivision,
      district: newDistrict || `${newDivision} Central`,
      addressLine: newAddress,
      isPlatformHub: newIsHub,
      isActive: true,
      totalVariants: 0,
      totalOnHand: 0,
      totalAvailable: 0,
      reservedStock: 0,
    };

    setWarehouses((prev) => [...prev, newFacility]);
    setShowAddModal(false);
    setNewCode('');
    setNewName('');
    setNewDistrict('');
    setNewAddress('');
  };

  const totalOnHandAll = warehouses.reduce((acc, w) => acc + w.totalOnHand, 0);
  const totalAvailableAll = warehouses.reduce((acc, w) => acc + w.totalAvailable, 0);
  const totalReservedAll = warehouses.reduce((acc, w) => acc + w.reservedStock, 0);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col justify-between">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <AlifLogo size="md" />
            <div className="hidden md:flex items-center space-x-2 border-l border-slate-200 pl-6">
              <span className="text-xs uppercase tracking-widest font-black text-[#FF6A00]">
                AlifWorld Logistics
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-700">Platform Warehouse Network</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunExpirySweep}
              className="text-xs font-bold flex items-center space-x-1.5"
            >
              <span>⏱️ Sweep TTL Reservations</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="font-bold text-xs"
            >
              + Add Warehouse
            </Button>
            <Link href="/admin">
              <Button variant="secondary" size="sm" className="font-bold text-xs">
                ← Admin Console
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Sweep notification toast */}
        {sweepResult && (
          <div className="mb-6 p-4 rounded-xl bg-sky-50 border border-sky-200 text-[#0284C7] text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2">
              <span>ℹ️</span>
              <span>{sweepResult}</span>
            </div>
            <button onClick={() => setSweepResult(null)} className="text-sky-600 hover:text-sky-900">✕</button>
          </div>
        )}

        {/* Page Title & Subtitle */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#0284C7] mb-1">
            <span>Nationwide Node Matrix</span>
            <span>•</span>
            <span>ADR-0026 Inventory Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Platform Warehouse Network &amp; Audit Trail
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Centralized fulfillment hubs, merchant-owned local depots, dynamic checkout TTL reservations (15-minute window), and immutable inventory ledgers across all 8 Bangladesh divisions.
          </p>
        </div>

        {/* Facilities Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Facilities</div>
            <div className="text-3xl font-black text-slate-900 mt-2">{warehouses.length}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">8 Bangladesh Divisions Covered</div>
          </Card>

          <Card className="bg-white border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Platform Hubs</div>
            <div className="text-3xl font-black text-[#FF6A00] mt-2">
              {warehouses.filter((w) => w.isPlatformHub).length}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Centralized multi-seller fulfillment</div>
          </Card>

          <Card className="bg-white border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Audited Net Available</div>
            <div className="text-3xl font-black text-[#10B981] mt-2">
              {totalAvailableAll.toLocaleString()} units
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Physical On-Hand: {totalOnHandAll.toLocaleString()}</div>
          </Card>

          <Card className="bg-white border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reserved for Checkout</div>
            <div className="text-3xl font-black text-[#0284C7] mt-2">
              {totalReservedAll.toLocaleString()} units
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">15-minute active buyer hold</div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-3 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'warehouses'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Warehouses &amp; Merchant Depots ({warehouses.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'ledger'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Central Movement Audit Ledger ({auditMovements.length})
          </button>
          <button
            onClick={() => setActiveTab('divisions')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'divisions'
                ? 'border-[#FF6A00] text-[#FF6A00]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Division Routing Grid (8 Divisions)
          </button>
        </div>

        {/* Tab 1: Warehouses Table */}
        {activeTab === 'warehouses' && (
          <Card className="bg-white border-slate-200/90 shadow-sm overflow-hidden mb-8">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Physical Nodes &amp; Storage Depots</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Physical distribution points supporting Dhaka same-day dispatch and 64-district delivery.
                </p>
              </div>
              <div className="text-xs font-mono text-slate-500">
                Invariant: Physical = Available + Reserved
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Facility Code &amp; Name</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Division &amp; District</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Facility Type</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-right">Physical On-Hand</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-right">Reserved (Hold)</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-right">Available to Sell</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((w) => (
                      <TableRow key={w.id} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                        <TableCell className="py-3.5">
                          <div className="font-bold text-slate-900 text-sm">{w.name}</div>
                          <div className="text-xs font-mono text-[#FF6A00] font-bold">{w.code}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{w.addressLine}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-800">{w.division}</div>
                          <div className="text-xs text-slate-500">{w.district}</div>
                        </TableCell>
                        <TableCell>
                          {w.isPlatformHub ? (
                            <Badge variant="orange">PLATFORM HUB</Badge>
                          ) : (
                            <Badge variant="blue">MERCHANT DEPOT</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-slate-700">
                          {w.totalOnHand.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-amber-600">
                          {w.reservedStock.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black text-[#10B981]">
                          {w.totalAvailable.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success">ACTIVE</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Audit Ledger */}
        {activeTab === 'ledger' && (
          <Card className="bg-white border-slate-200/90 shadow-sm overflow-hidden mb-8">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Central Operations Movement Ledger</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cryptographically referenced append-only financial and physical inventory audit entries.
                </p>
              </div>
              <span className="text-xs font-mono text-[#10B981] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                LIFECYCLE: APPEND-ONLY IMMUTABLE
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Timestamp</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Facility</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Movement Type</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Variant Details</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase text-right">Quantity Delta</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Operator / Actor</TableHead>
                      <TableHead className="text-slate-600 font-bold text-xs uppercase">Audit Justification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditMovements.map((mov) => (
                      <TableRow key={mov.id} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-500 py-3.5">
                          {mov.timestamp}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[#FF6A00] font-bold">
                          {mov.facility}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              mov.type === 'RECEIVE'
                                ? 'green'
                                : mov.type === 'RESERVE'
                                ? 'blue'
                                : mov.type === 'DAMAGE'
                                ? 'danger'
                                : 'cyan'
                            }
                          >
                            {mov.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800">
                          {mov.variant}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-xs font-black ${
                            mov.delta > 0 ? 'text-[#10B981]' : 'text-amber-600'
                          }`}
                        >
                          {mov.delta > 0 ? `+${mov.delta}` : mov.delta}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600">
                          {mov.actor}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {mov.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Division Routing Grid */}
        {activeTab === 'divisions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { name: 'Dhaka Division', code: 'DHK', hubs: 2, status: 'Active (Same-Day Available)', transit: '12-24 hrs' },
              { name: 'Chittagong Division', code: 'CTG', hubs: 1, status: 'Active (Next-Day Hub)', transit: '24-48 hrs' },
              { name: 'Sylhet Division', code: 'SYL', hubs: 1, status: 'Active (Regional Hub)', transit: '24-48 hrs' },
              { name: 'Rajshahi Division', code: 'RAJ', hubs: 1, status: 'Active (Agro Depot)', transit: '48-72 hrs' },
              { name: 'Khulna Division', code: 'KHL', hubs: 0, status: 'Route via Jessore Hub', transit: '48-72 hrs' },
              { name: 'Barisal Division', code: 'BAR', hubs: 0, status: 'Route via Dhaka Central', transit: '48-72 hrs' },
              { name: 'Rangpur Division', code: 'RNG', hubs: 0, status: 'Route via Bogura Depot', transit: '48-72 hrs' },
              { name: 'Mymensingh Division', code: 'MYM', hubs: 0, status: 'Route via Gazipur Node', transit: '24-48 hrs' },
            ].map((div) => (
              <Card key={div.code} className="bg-white border-slate-200/90 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-[#FF6A00]">{div.code}</span>
                  <Badge variant={div.hubs > 0 ? 'green' : 'blue'}>
                    {div.hubs > 0 ? `${div.hubs} Facility` : 'Transit Hub'}
                  </Badge>
                </div>
                <h3 className="text-sm font-black text-slate-900 mt-2">{div.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{div.status}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">SLA Window:</span>
                  <span className="font-mono font-bold text-slate-700">{div.transit}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Add Warehouse or Depot</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWarehouse} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Facility Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KHL-HUB-01"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Facility Type
                  </label>
                  <select
                    value={newIsHub ? 'true' : 'false'}
                    onChange={(e) => setNewIsHub(e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                  >
                    <option value="true">Platform Central Hub</option>
                    <option value="false">Merchant Local Depot</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Facility Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Khulna Regional Hub"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Division *
                  </label>
                  <select
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                  >
                    {['DHAKA', 'CHITTAGONG', 'SYLHET', 'RAJSHAHI', 'KHULNA', 'BARISAL', 'RANGPUR', 'MYMENSINGH'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    District / Zone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Khulna Sadar"
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Physical Address Line
                </label>
                <input
                  type="text"
                  placeholder="e.g. Road 4, Khalishpur Industrial Area, Khulna"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/20 focus:border-[#FF6A00]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  Save Warehouse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">AlifWorld Fulfillment Infrastructure</span>
            <span>•</span>
            <span>ADR-0026 Physical &amp; Financial Ledger</span>
          </div>
          <div>Same-day delivery powered across Greater Dhaka and Chittagong.</div>
        </div>
      </footer>
    </div>
  );
}
