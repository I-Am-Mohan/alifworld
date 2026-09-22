import Link from 'next/link';

export default function SellerCenterPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="border-b border-neutral-800 pb-6 mb-8 flex justify-between items-center">
        <div>
          <span className="text-xs uppercase tracking-widest text-brand-orange font-bold">
            AlifWorld Merchant Network
          </span>
          <h1 className="text-3xl font-black mt-1">Seller Center Dashboard</h1>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800"
        >
          ← Back to Storefront
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            Seller Account Status
          </h2>
          <div className="mt-4 flex items-center space-x-3">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-lg font-bold text-white">Pending Verification</span>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            Submit Trade License and BIN/VAT certificate to activate store catalog.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            Main Withdrawable Balance
          </h2>
          <p className="mt-3 text-3xl font-black text-brand-orange">৳0.00</p>
          <p className="mt-1 text-xs text-neutral-500">
            Zero pending payouts • Double-entry ledger verified
          </p>
        </div>

        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            Active Catalog Items
          </h2>
          <p className="mt-3 text-3xl font-black text-white">0</p>
          <p className="mt-1 text-xs text-neutral-500">
            Catalog locked until seller onboarding completion (Phase 07)
          </p>
        </div>
      </div>
    </div>
  );
}
