/**
 * End-to-End Smoke Test: Operational Portals (Seller Center & Admin Console)
 * Surfaces: /seller and /admin
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { describe, it, expect, mock } from 'bun:test';

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {} }),
  usePathname: () => '/seller',
  useSearchParams: () => new URLSearchParams(),
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SellerCenterPage from '@/app/seller/page';
import AdminPortalPage from '@/app/admin/page';
import { I18nProvider } from '@/i18n/context';
import { AuthProvider } from '@/components/auth/auth-context';

describe('E2E Smoke: Operational Portals', () => {
  describe('Seller Center Surface (/seller)', () => {
    it('renders Seller Center dashboard without exceptions', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(AuthProvider, null, React.createElement(SellerCenterPage))
        )
      );
      expect(html).toBeDefined();
      expect(html).toContain('Seller Center');
    });
  });

  describe('Admin Operations Console (/admin)', () => {
    it('renders Admin Portal and displays operational modules', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          I18nProvider,
          null,
          React.createElement(AuthProvider, null, React.createElement(AdminPortalPage))
        )
      );
      expect(html).toBeDefined();
      expect(html).toContain('Orders &amp; Fulfillment');
    });
  });
});
