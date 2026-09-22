'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlifLogo } from '@/components/brand/logo';
import {
  Database,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Filter,
  ArrowLeft,
  FileCode,
  HardDrive,
  GitBranch,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface ModelEntry {
  id: number;
  name: string;
  table: string;
  module: string;
  policy: 'IMMUTABLE' | 'SOFT_DELETE' | 'EPHEMERAL';
  description: string;
}

interface MigrationEntry {
  name: string;
  phase: string;
  appliedAt: string;
  description: string;
  status: 'APPLIED';
}

export default function AdminDatabasePage() {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'migrations' | 'runbook'>('dictionary');
  const [filterPolicy, setFilterPolicy] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const migrations: MigrationEntry[] = [
    { name: '20260922000001_init', phase: 'Phase 01', appliedAt: '2026-09-22 09:00', description: 'SystemConfig, HealthProbe, OutboxEvent, AuditLog foundations', status: 'APPLIED' },
    { name: '20260922000002_user_and_auth', phase: 'Phase 02', appliedAt: '2026-09-22 10:15', description: 'User account and identity tables with phone/email indexing', status: 'APPLIED' },
    { name: '20260922000003_rbac_and_iam', phase: 'Phase 02', appliedAt: '2026-09-22 11:30', description: 'RBAC roles, granular permissions, and role assignment matrices', status: 'APPLIED' },
    { name: '20260922000004_seller_multi_tenant', phase: 'Phase 02', appliedAt: '2026-09-22 12:45', description: 'Multi-tenant seller stores, delegated staff, KYC dossiers, and settings', status: 'APPLIED' },
    { name: '20260922000005_catalog_and_products', phase: 'Phase 03', appliedAt: '2026-09-22 14:00', description: 'Categories, brands, products, variants, media, and SEO slug history', status: 'APPLIED' },
    { name: '20260922000006_inventory_warehouses_stock', phase: 'Phase 03', appliedAt: '2026-09-22 14:45', description: 'Division warehouses, real-time stock balances, and movement ledger', status: 'APPLIED' },
    { name: '20260922000007_payments_refunds_commissions_settlements_payouts', phase: 'Phase 03', appliedAt: '2026-09-22 15:30', description: 'Digital payments, partial refunds, 5% commission ledger, and BEFTN payouts', status: 'APPLIED' },
    { name: '20260922000008_wallets_points_rewards_ranks_immutable_ledgers', phase: 'Phase 03', appliedAt: '2026-09-22 16:15', description: 'Multi-account wallets, double-entry journals, Product Points, and rank clubs', status: 'APPLIED' },
  ];

  const models: ModelEntry[] = [
    { id: 1, name: 'SystemConfig', table: 'system_configs', module: 'System & Observability', policy: 'SOFT_DELETE', description: 'System parameters and versioned rule configs' },
    { id: 2, name: 'HealthProbe', table: 'health_probes', module: 'System & Observability', policy: 'EPHEMERAL', description: 'Readiness and operational telemetry probes (TTL)' },
    { id: 3, name: 'OutboxEvent', table: 'outbox_events', module: 'System & Observability', policy: 'IMMUTABLE', description: 'Transactional outbox for reliable event dispatch' },
    { id: 4, name: 'AuditLog', table: 'audit_logs', module: 'System & Observability', policy: 'IMMUTABLE', description: 'Immutable security and administrative audit trail' },
    { id: 5, name: 'User', table: 'users', module: 'IAM & Auth', policy: 'SOFT_DELETE', description: 'Core user identity for customers, sellers, and admins' },
    { id: 6, name: 'Role', table: 'roles', module: 'IAM & Auth', policy: 'SOFT_DELETE', description: 'RBAC system and custom role definitions' },
    { id: 7, name: 'Permission', table: 'permissions', module: 'IAM & Auth', policy: 'SOFT_DELETE', description: 'Fine-grained operational permissions' },
    { id: 8, name: 'UserRoleAssignment', table: 'user_role_assignments', module: 'IAM & Auth', policy: 'SOFT_DELETE', description: 'User-to-role assignment mappings' },
    { id: 9, name: 'RolePermission', table: 'role_permissions', module: 'IAM & Auth', policy: 'SOFT_DELETE', description: 'Role-to-permission grant matrices' },
    { id: 10, name: 'Seller', table: 'sellers', module: 'Multi-Tenant Seller', policy: 'SOFT_DELETE', description: 'Verified merchant stores with BIN and Trade License' },
    { id: 11, name: 'SellerStaff', table: 'seller_staff', module: 'Multi-Tenant Seller', policy: 'SOFT_DELETE', description: 'Delegated merchant team members' },
    { id: 12, name: 'SellerKycDocument', table: 'seller_kyc_documents', module: 'Multi-Tenant Seller', policy: 'SOFT_DELETE', description: 'Government verified merchant compliance documents' },
    { id: 13, name: 'SellerStoreSettings', table: 'seller_store_settings', module: 'Multi-Tenant Seller', policy: 'SOFT_DELETE', description: 'Merchant fulfillment and return policies' },
    { id: 14, name: 'Category', table: 'categories', module: 'Product Catalog', policy: 'SOFT_DELETE', description: 'Hierarchical taxonomy adjacency tree' },
    { id: 15, name: 'Brand', table: 'brands', module: 'Product Catalog', policy: 'SOFT_DELETE', description: 'Verified merchant and manufacturer brands' },
    { id: 16, name: 'Product', table: 'products', module: 'Product Catalog', policy: 'SOFT_DELETE', description: 'Catalog products with NBR VAT rates' },
    { id: 17, name: 'ProductVariant', table: 'product_variants', module: 'Product Catalog', policy: 'SOFT_DELETE', description: 'SKU variants with integer poisha pricing and points' },
    { id: 18, name: 'ProductMedia', table: 'product_media', module: 'Product Catalog', policy: 'SOFT_DELETE', description: 'High-resolution images and video assets' },
    { id: 19, name: 'ProductSlugHistory', table: 'product_slug_histories', module: 'Product Catalog', policy: 'IMMUTABLE', description: 'Permanent 301 SEO redirects for slug changes' },
    { id: 20, name: 'Warehouse', table: 'warehouses', module: 'Warehousing & Stock', policy: 'SOFT_DELETE', description: 'Division logistics fulfillment hubs' },
    { id: 21, name: 'StockBalance', table: 'stock_balances', module: 'Warehousing & Stock', policy: 'SOFT_DELETE', description: 'Real-time available and reserved physical quantities' },
    { id: 22, name: 'StockReservation', table: 'stock_reservations', module: 'Warehousing & Stock', policy: 'SOFT_DELETE', description: 'Checkout cart stock reservations (15-min TTL)' },
    { id: 23, name: 'StockMovementLedger', table: 'stock_movement_ledger', module: 'Warehousing & Stock', policy: 'IMMUTABLE', description: 'Double-entry stock mutation ledger' },
    { id: 24, name: 'Cart', table: 'carts', module: 'Carts & Orders', policy: 'SOFT_DELETE', description: 'Active and abandoned customer shopping carts' },
    { id: 25, name: 'CartItem', table: 'cart_items', module: 'Carts & Orders', policy: 'SOFT_DELETE', description: 'Line items within customer carts' },
    { id: 26, name: 'Order', table: 'orders', module: 'Carts & Orders', policy: 'SOFT_DELETE', description: 'Unified customer parent orders in integer poisha' },
    { id: 27, name: 'SellerFulfillmentGroup', table: 'seller_fulfillment_groups', module: 'Carts & Orders', policy: 'SOFT_DELETE', description: 'Tenant-scoped merchant parcel fulfillment partition' },
    { id: 28, name: 'OrderItem', table: 'order_items', module: 'Carts & Orders', policy: 'SOFT_DELETE', description: 'Immutable frozen purchase line items with points' },
    { id: 29, name: 'OrderStatusHistory', table: 'order_status_history', module: 'Carts & Orders', policy: 'IMMUTABLE', description: 'Append-only order transition audit trail' },
    { id: 30, name: 'Shipment', table: 'shipments', module: 'Logistics', policy: 'SOFT_DELETE', description: 'Physical parcel dispatch via Pathao and Steadfast' },
    { id: 31, name: 'ShipmentEvent', table: 'shipment_events', module: 'Logistics', policy: 'IMMUTABLE', description: 'Courier tracking timeline event logs' },
    { id: 32, name: 'Payment', table: 'payments', module: 'Payments & Settlement', policy: 'IMMUTABLE', description: 'Inward payments captured via bKash, Nagad, etc.' },
    { id: 33, name: 'Refund', table: 'refunds', module: 'Payments & Settlement', policy: 'IMMUTABLE', description: 'Bounded item-level partial refunds' },
    { id: 34, name: 'RefundItem', table: 'refund_items', module: 'Payments & Settlement', policy: 'IMMUTABLE', description: 'Itemized returned units and point reversals' },
    { id: 35, name: 'CommissionLedger', table: 'commission_ledger', module: 'Payments & Settlement', policy: 'IMMUTABLE', description: '5% platform commission ledger with rule versions' },
    { id: 36, name: 'SellerSettlement', table: 'seller_settlements', module: 'Payments & Settlement', policy: 'SOFT_DELETE', description: 'Periodic merchant settlement clearing batches' },
    { id: 37, name: 'SellerPayout', table: 'seller_payouts', module: 'Payments & Settlement', policy: 'IMMUTABLE', description: 'Electronic BEFTN bank wire disbursals' },
    { id: 38, name: 'PaymentWebhookLog', table: 'payment_webhook_logs', module: 'Payments & Settlement', policy: 'IMMUTABLE', description: 'Gateway webhook IPN HMAC verification log' },
    { id: 39, name: 'Wallet', table: 'wallets', module: 'Wallets & Ledgers', policy: 'SOFT_DELETE', description: 'Segregated Main, Shopping, Good-Luck, Charity balances' },
    { id: 40, name: 'LedgerAccount', table: 'ledger_accounts', module: 'Wallets & Ledgers', policy: 'SOFT_DELETE', description: 'Double-entry chart of accounts' },
    { id: 41, name: 'LedgerJournal', table: 'ledger_journals', module: 'Wallets & Ledgers', policy: 'IMMUTABLE', description: 'Balanced double-entry journal transactions' },
    { id: 42, name: 'LedgerPosting', table: 'ledger_postings', module: 'Wallets & Ledgers', policy: 'IMMUTABLE', description: 'Atomic debit and credit ledger postings' },
    { id: 43, name: 'PointAccount', table: 'point_accounts', module: 'Product Points & Ranks', policy: 'SOFT_DELETE', description: 'Decoupled customer loyalty token balance' },
    { id: 44, name: 'PointEvent', table: 'point_events', module: 'Product Points & Ranks', policy: 'IMMUTABLE', description: 'Chronological point earnings, releases, and clawbacks' },
    { id: 45, name: 'RewardRule', table: 'reward_rules', module: 'Product Points & Ranks', policy: 'SOFT_DELETE', description: 'Versioned reward split rules (100% sum invariant)' },
    { id: 46, name: 'RewardAllocation', table: 'reward_allocations', module: 'Product Points & Ranks', policy: 'IMMUTABLE', description: 'Calculated reward distribution calculation snapshots' },
    { id: 47, name: 'RankDefinition', table: 'rank_definitions', module: 'Product Points & Ranks', policy: 'SOFT_DELETE', description: 'Customer & Seller club rank tiers and star bands' },
    { id: 48, name: 'UserRank', table: 'user_ranks', module: 'Product Points & Ranks', policy: 'SOFT_DELETE', description: 'Achieved user rank qualifications per period' },
    { id: 49, name: 'LeaderboardSnapshot', table: 'leaderboard_snapshots', module: 'Product Points & Ranks', policy: 'IMMUTABLE', description: 'Periodic competitive leaderboard rankings' },
  ];

  const filteredModels = models.filter((m) => {
    const matchesPolicy = filterPolicy === 'ALL' || m.policy === filterPolicy;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.module.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPolicy && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#F59E0B]/30">
      {/* SuperAdmin Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <AlifLogo size="sm" href="/" />
            <div className="h-5 w-[1px] bg-slate-700 hidden sm:block" />
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-100">SuperAdmin Operations</span>
              <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-2 py-0.5 rounded-full font-mono font-medium">
                DATA ARCHITECTURE & DICTIONARY
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300 font-medium">Phase 03 Complete</span>
            </div>

            <Link
              href="/admin/wallets"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium transition-colors"
            >
              Ledger Console
            </Link>

            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-[#F59E0B] font-mono uppercase tracking-wider mb-1">
              <Database className="w-4 h-4" />
              <span>PostgreSQL 16 & Prisma Schema Registry</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Database Dictionary & Migration Governance
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative catalog of all 49 relational models, expand-and-contract zero-downtime workflows, and seed idempotency verification.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Canonical Models</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">49 Tables</div>
            <div className="text-[11px] text-slate-500 mt-1">Normalized relational architecture</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Migrations Applied</span>
              <GitBranch className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400 font-mono">8 / 8 Migrations</div>
            <div className="text-[11px] text-slate-500 mt-1">Phase 01 through Phase 03</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Immutable Ledgers</span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">18 Entities</div>
            <div className="text-[11px] text-slate-500 mt-1">Append-only audit & financial logs</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>Seed Idempotency</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400">100% Idempotent</div>
            <div className="text-[11px] text-slate-500 mt-1">10 sections safe under reruns</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-8 text-sm">
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'dictionary'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Data Dictionary ({filteredModels.length})
          </button>
          <button
            onClick={() => setActiveTab('migrations')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'migrations'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Migration Sequence ({migrations.length})
          </button>
          <button
            onClick={() => setActiveTab('runbook')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'runbook'
                ? 'text-[#F59E0B] border-b-2 border-[#F59E0B]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Expand-and-Contract Runbook
          </button>
        </div>

        {/* Tab 1: Data Dictionary Explorer */}
        {activeTab === 'dictionary' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Filter Lifecycle:</span>
                {['ALL', 'IMMUTABLE', 'SOFT_DELETE', 'EPHEMERAL'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPolicy(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      filterPolicy === p
                        ? 'bg-[#F59E0B] text-black border-[#F59E0B]'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-64 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search models or tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">#</th>
                      <th className="p-4">Model Name</th>
                      <th className="p-4">PostgreSQL Table</th>
                      <th className="p-4">Domain Module</th>
                      <th className="p-4">Lifecycle Policy</th>
                      <th className="p-4">Entity Responsibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {filteredModels.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono text-slate-500">{m.id}</td>
                        <td className="p-4 font-mono font-bold text-white">{m.name}</td>
                        <td className="p-4 font-mono text-slate-400">{m.table}</td>
                        <td className="p-4 text-slate-300">{m.module}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              m.policy === 'IMMUTABLE'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : m.policy === 'SOFT_DELETE'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {m.policy}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">{m.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Migration Sequence */}
        {activeTab === 'migrations' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="p-4">Migration Script</th>
                      <th className="p-4">Roadmap Phase</th>
                      <th className="p-4">Applied At</th>
                      <th className="p-4">Schema Capabilities</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {migrations.map((mig) => (
                      <tr key={mig.name} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-mono font-bold text-white">{mig.name}</td>
                        <td className="p-4 font-mono text-slate-400">{mig.phase}</td>
                        <td className="p-4 text-slate-400">{mig.appliedAt}</td>
                        <td className="p-4 text-slate-300">{mig.description}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{mig.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Runbook */}
        {activeTab === 'runbook' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-slate-300">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-[#F59E0B]" />
                <span>Expand-and-Contract Migration Workflow</span>
              </h3>
              <p className="leading-relaxed text-slate-400">
                To guarantee zero downtime under active checkout and logistics load, schema evolution follows three progressive stages:
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 font-mono text-[11px]">Phase 1: Expand (Additive)</span>
                  <p className="mt-1 text-slate-400">Add new columns as optional or with defaults. Deploy code that dual-writes to both legacy and new structures.</p>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-blue-400 font-mono text-[11px]">Phase 2: Asynchronous Backfill</span>
                  <p className="mt-1 text-slate-400">Execute background BullMQ batch jobs to populate new fields across historical rows without locking tables.</p>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-emerald-400 font-mono text-[11px]">Phase 3: Contract (Subtractive)</span>
                  <p className="mt-1 text-slate-400">Enforce NOT NULL constraints and deprecate legacy columns in a scheduled maintenance window.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Rollback & Forward-Fix Playbook</span>
              </h3>
              <p className="leading-relaxed text-slate-400">
                Standard operating procedures for managing schema incidents and seed reruns:
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-white font-mono text-[11px]">Forward-Fix Default</span>
                  <p className="mt-1 text-slate-400">Never perform destructive downgrades. Schema corrections must be shipped as forward migrations with incremental versioning.</p>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-white font-mono text-[11px]">Seed Idempotency Guarantee</span>
                  <p className="mt-1 text-slate-400">Running `bun run db:seed` is always safe. All 10 sections use deterministic keys and upserts without creating duplicates.</p>
                </div>
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <span className="font-bold text-white font-mono text-[11px]">Automated Data Dictionary</span>
                  <p className="mt-1 text-slate-400">Run `bun run scripts/generate-data-dictionary.ts` to re-sync `docs/database/data-dictionary.md` upon any schema change.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
