import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between bg-black text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-globeDarkBlue via-brand-globeBlue to-brand-globeLightBlue flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            A
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              ALIF<span className="text-brand-orange">WORLD</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs uppercase tracking-widest text-neutral-400 font-medium">
              Bangladesh
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/seller"
            className="text-neutral-300 hover:text-white transition-colors"
          >
            Seller Center
          </Link>
          <Link
            href="/admin"
            className="text-neutral-300 hover:text-white transition-colors"
          >
            Admin Portal
          </Link>
          <Link
            href="/api/health/live"
            target="_blank"
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
            System Live
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-5xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border border-neutral-800 bg-neutral-900/60 text-neutral-300 text-xs font-semibold uppercase tracking-wider mb-8">
          <span className="text-brand-orange">Phase 02</span>
          <span className="text-neutral-600">•</span>
          <span>Next.js Modular Monolith with Bun</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-tight sm:leading-none">
          Bangladesh&apos;s Next-Gen <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-orange-400 to-amber-300">
            Commerce &amp; Rewards
          </span>{' '}
          Ecosystem
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl leading-relaxed">
          A high-availability unified marketplace delivering transparent double-entry
          wallet ledgers, independent Product Points, multi-vendor fulfillment, and
          nationwide logistics across Bangladesh.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/api/health/ready"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-brand-orange text-black font-bold text-base hover:bg-brand-orangeHover transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/25"
          >
            Inspect Platform Readiness
          </Link>
          <Link
            href="https://github.com/alifworld"
            target="_blank"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg border border-neutral-700 bg-neutral-900/80 text-white font-semibold text-base hover:bg-neutral-800 transition-colors"
          >
            Explore Architecture Specs
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-brand-orange/10 border border-brand-orange/30 flex items-center justify-center text-brand-orange font-bold text-sm mb-4">
              ৳
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Integer Poisha Ledger</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Every monetary transaction is strictly recorded in integer Poisha (1 BDT = 100 poisha)
              under double-entry journal balance constraints.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-brand-globeBlue font-bold text-sm mb-4">
              ★
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Decoupled Product Points</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Points snapshot at checkout and credit to customer balances only upon
              return window completion, preventing reward leakage.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm mb-4">
              ✓
            </div>
            <h3 className="font-bold text-lg text-white mb-2">Compliance Gating</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Built-in safeguards (GATE-01 to GATE-07) prevent multi-tier pyramids or
              unlicensed gaming, guaranteeing 100% Bangladesh legal adherence.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-6 py-6 text-center text-xs text-neutral-500">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-5xl mx-auto gap-4">
          <p>© {new Date().getFullYear()} AlifWorld Platform. All rights reserved.</p>
          <p className="flex items-center space-x-3">
            <span>Locales: <strong className="text-neutral-400">bn-BD</strong> (Default) / <strong className="text-neutral-400">en-BD</strong></span>
            <span>•</span>
            <span>Timezone: <strong className="text-neutral-400">Asia/Dhaka</strong></span>
          </p>
        </div>
      </footer>
    </main>
  );
}
