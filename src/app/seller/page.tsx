import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function SellerCenterPage() {
  const store = {
    id: 'sel_dhaka_tech_01',
    businessName: 'Dhaka Tech Electronics',
    slug: 'dhaka-tech',
    status: 'VERIFIED',
    ownerName: 'Rahim Chowdhury',
    kycCompleted: true,
    staffCount: 2,
    activeProducts: 0,
    withdrawableBalance: '৳0.00',
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <header className="border-b border-neutral-800 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-brand-orange font-bold">
            AlifWorld Merchant Network
          </span>
          <h1 className="text-3xl font-black mt-1">{store.businessName}</h1>
          <div className="flex items-center space-x-3 mt-1.5 text-xs text-neutral-400">
            <span className="font-mono text-neutral-500">{store.id}</span>
            <span>•</span>
            <span className="text-brand-globeLightBlue">alifworld.com/stores/{store.slug}</span>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/seller/settings"
            className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm hover:bg-neutral-800 font-semibold"
          >
            Store Settings ⚙️
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800"
          >
            ← Storefront
          </Link>
        </div>
      </header>

      {/* Primary Status Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Store Verification Status
          </h2>
          <div className="mt-3 flex items-center space-x-3">
            <Badge variant="success" size="md">
              ✓ {store.status}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Trade License & NBR BIN verified. Catalog publishing active.
          </p>
          <div className="mt-4">
            <Link
              href="/seller/kyc"
              className="text-xs text-brand-orange hover:underline font-bold"
            >
              View KYC Dossier →
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Main Withdrawable Balance
          </h2>
          <p className="mt-2 text-3xl font-black text-brand-orange">{store.withdrawableBalance}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Double-entry ledger audited • BDT integer poisha precision
          </p>
          <div className="mt-4">
            <span className="text-xs text-neutral-500">
              Payout thresholds enforced (Phase 16)
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Delegated Store Staff
          </h2>
          <p className="mt-2 text-3xl font-black text-white">{store.staffCount}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Active staff members scoped to {store.slug}
          </p>
          <div className="mt-4">
            <Link
              href="/seller/staff"
              className="text-xs text-brand-globeLightBlue hover:underline font-bold"
            >
              Manage Store Staff →
            </Link>
          </div>
        </Card>
      </div>

      {/* Operational Modules Navigation */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-orange mr-2 inline-block" />
          Store Management & Configuration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/seller/settings"
            className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all group"
          >
            <div className="text-xs font-mono font-bold text-brand-orange mb-1">MODULE-01</div>
            <h3 className="text-base font-bold text-white group-hover:text-brand-orange transition-colors">
              Logistics & Store Profile
            </h3>
            <p className="text-xs text-neutral-400 mt-1.5">
              Configure pickup warehouse, return address, Pathao/Steadfast courier defaults, and vacation mode.
            </p>
          </Link>

          <Link
            href="/seller/kyc"
            className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all group"
          >
            <div className="text-xs font-mono font-bold text-emerald-400 mb-1">MODULE-02</div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
              KYC & Compliance Documents
            </h3>
            <p className="text-xs text-neutral-400 mt-1.5">
              Upload and manage Trade License, NID, NBR BIN, and bank cheque leaf verification records.
            </p>
          </Link>

          <Link
            href="/seller/staff"
            className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all group"
          >
            <div className="text-xs font-mono font-bold text-brand-globeLightBlue mb-1">MODULE-03</div>
            <h3 className="text-base font-bold text-white group-hover:text-brand-globeLightBlue transition-colors">
              Staff Delegation & Roles
            </h3>
            <p className="text-xs text-neutral-400 mt-1.5">
              Delegate order packing, product drafting, and store management to authorized employees.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
