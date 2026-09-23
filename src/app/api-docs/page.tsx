'use client';

import Link from 'next/link';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

const openApiUrl = '/api/v1/openapi.json';

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">AlifWorld Developer Portal</p>
            <h1 className="mt-1 text-xl font-black text-white">Interactive API Documentation</h1>
            <p className="mt-1 text-xs text-slate-400">Explore endpoints, inspect schemas, authorize with a bearer token, and send test requests.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${openApiUrl}`)}
              className="rounded-lg border border-slate-700 px-3 py-2 font-bold text-slate-200 transition hover:border-amber-400 hover:text-amber-300"
            >
              Copy OpenAPI URL
            </button>
            <a
              href={openApiUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-700 px-3 py-2 font-bold text-slate-200 transition hover:border-amber-400 hover:text-amber-300"
            >
              Open JSON
            </a>
            <Link href="/" className="rounded-lg bg-amber-500 px-3 py-2 font-bold text-slate-950 transition hover:bg-amber-400">
              Storefront
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-2 py-4 sm:px-6">
        <div className="mb-4 rounded-xl border border-blue-900/60 bg-blue-950/40 p-4 text-xs text-blue-100">
          <strong>How to test authenticated endpoints:</strong> click <strong>Authorize</strong>, enter your JWT access token in the format <code className="rounded bg-slate-900 px-1.5 py-0.5">Bearer &lt;token&gt;</code>, select an endpoint, click <strong>Try it out</strong>, then execute the request.
        </div>
        <div className="scalar-shell overflow-hidden rounded-xl bg-white shadow-2xl">
          <ApiReferenceReact
            configuration={{
              url: openApiUrl,
              theme: 'purple',
              layout: 'modern',
              withDefaultFonts: false,
              showSidebar: true,
              isEditable: false,
            }}
          />
        </div>
      </section>
    </main>
  );
}
