/**
 * End-to-End Smoke Test: Customer Storefront Surface
 * Surface: / (HomePage)
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { describe, it, expect, mock } from 'bun:test';

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from '@/app/page';
import { I18nProvider } from '@/i18n/context';
import { AuthProvider } from '@/components/auth/auth-context';

describe('E2E Smoke: Customer Storefront Surface', () => {
  it('renders HomePage without exceptions', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(HomePage))
      )
    );
    expect(html).toBeDefined();
    expect(html).toContain('AlifWorld');
    expect(html).toContain('min-h-screen');
  });

  it('includes navigation links to Seller Center and Cart', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(AuthProvider, null, React.createElement(HomePage))
      )
    );
    expect(html).toContain('/seller');
    expect(html).toContain('/cart');
    expect(html).toContain('/seller/apply');
  });
});
