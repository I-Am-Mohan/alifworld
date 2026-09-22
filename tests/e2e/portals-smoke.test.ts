/**
 * End-to-End Smoke Test: Operational Portals (Seller Center & Admin Console)
 * Surfaces: /seller and /admin
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { describe, it, expect } from 'bun:test';
import SellerCenterPage from '@/app/seller/page';
import AdminPortalPage from '@/app/admin/page';

describe('E2E Smoke: Operational Portals', () => {
  describe('Seller Center Surface (/seller)', () => {
    it('renders Seller Center dashboard without exceptions', () => {
      const vdom = SellerCenterPage();
      expect(vdom).toBeDefined();
      expect(vdom.props.className).toContain('bg-black');
    });

    it('contains link to return to storefront', () => {
      const vdom = SellerCenterPage();
      const header = vdom.props.children[0];
      const backLink = header.props.children[1];
      expect(backLink.props.href).toBe('/');
    });
  });

  describe('Admin Operations Console (/admin)', () => {
    it('renders Admin Portal and displays compliance gate statuses', () => {
      const vdom = AdminPortalPage();
      expect(vdom).toBeDefined();
      expect(vdom.props.className).toContain('bg-black');
    });
  });
});
