import Link from 'next/link';
import { getAppConfig } from '@/shared/config/environment';

export const dynamic = 'force-dynamic';

export default function AdminPortalPage() {
  const config = getAppConfig();

  const gates = [
    {
      id: 'GATE-01',
      title: 'Single-Tier Referral Enforcement',
      status: config.gates.featureAffiliateMultiTierEnabled ? 'Multi-Tier (Review)' : 'Locked Single-Tier',
      compliant: !config.gates.featureAffiliateMultiTierEnabled,
      depth: config.gates.maxAffiliateDepth,
    },
    {
      id: 'GATE-02',
      title: 'Promotional Lottery / Raffles',
      status: config.gates.featureLotteryEnabled ? 'Active (Unsafe)' : 'Disabled (Pending License)',
      compliant: !config.gates.featureLotteryEnabled,
    },
    {
      id: 'GATE-03',
      title: 'MFS Direct Debit & Tokenization',
      status: config.gates.featureMfsDirectDebitEnabled ? 'Active' : 'Mock / Sandbox Only',
      compliant: true,
    },
    {
      id: 'GATE-04',
      title: 'NBR VAT Mushak-6.3 Integration',
      status: config.gates.featureNbrTaxIntegrationEnabled ? 'Connected' : 'Pending NBR API Clearance',
      compliant: true,
    },
    {
      id: 'GATE-05',
      title: 'Maker-Checker High-Value Payouts',
      status: config.gates.featureMakerCheckerPayoutEnabled ? 'Enforced (>= ৳50,000)' : 'Disabled',
      compliant: config.gates.featureMakerCheckerPayoutEnabled,
    },
    {
      id: 'GATE-06',
      title: 'Product Points Cash Conversion',
      status: config.gates.featurePointsCashConvertible ? 'Convertible (Violation)' : 'Non-Convertible Invariant',
      compliant: !config.gates.featurePointsCashConvertible,
    },
    {
      id: 'GATE-07',
      title: 'Advanced Shopping Term Deposits',
      status: config.gates.featureAdvancedShoppingEnabled ? 'Active (Violation)' : 'Disabled (Pending License)',
      compliant: !config.gates.featureAdvancedShoppingEnabled,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="border-b border-neutral-800 pb-6 mb-8 flex justify-between items-center">
        <div>
          <span className="text-xs uppercase tracking-widest text-brand-orange font-bold">
            AlifWorld Platform Operations
          </span>
          <h1 className="text-3xl font-black mt-1">Admin Operations Console</h1>
        </div>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm hover:bg-neutral-800"
        >
          ← Back to Storefront
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="w-3 h-3 rounded-full bg-emerald-400 mr-2.5 inline-block" />
          Active Regulatory Compliance Gates (GATE-01 to GATE-07)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gates.map((gate) => (
            <div
              key={gate.id}
              className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono font-bold text-brand-orange">
                    {gate.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      gate.compliant
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {gate.compliant ? 'COMPLIANT' : 'ATTENTION'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{gate.title}</h3>
                <p className="text-xs text-neutral-400">{gate.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Operational Modules & Subsystems */}
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <span className="w-3 h-3 rounded-full bg-brand-orange mr-2.5 inline-block" />
          Platform Domains & Administration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/users"
            className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-brand-orange">IAM-01</span>
                <span className="text-xs text-neutral-500 group-hover:text-white transition-colors">
                  Open Directory →
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">User Management & Identities</h3>
              <p className="text-xs text-neutral-400">
                Browse platform users, manage Bangladesh E.164 phones, inspect verification states, and delegate roles.
              </p>
            </div>
          </Link>

          <Link
            href="/admin/roles"
            className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono font-bold text-brand-globeLightBlue">IAM-02</span>
                <span className="text-xs text-neutral-500 group-hover:text-white transition-colors">
                  Open Matrix →
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">RBAC Roles & Permissions</h3>
              <p className="text-xs text-neutral-400">
                Inspect 9 standard system roles, configure granular permission matrices, and audit multi-tenant scopes.
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
