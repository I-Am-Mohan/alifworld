/**
 * End-to-End Smoke Test: Customer Storefront Surface
 * Surface: / (HomePage)
 * Reference: docs/architecture/single-application-modular-monolith.md
 */

import { describe, it, expect } from 'bun:test';
import HomePage from '@/app/page';

describe('E2E Smoke: Customer Storefront Surface', () => {
  it('renders HomePage without exceptions', () => {
    const vdom = HomePage();
    expect(vdom).toBeDefined();
    expect(vdom.type).toBe('main');
    expect(vdom.props.className).toContain('bg-black');
    expect(vdom.props.className).toContain('text-white');
  });

  it('includes navigation links to Seller Center, Admin Portal, and Health Probes', () => {
    const vdom = HomePage();
    const [header] = vdom.props.children;
    expect(header.type).toBe('header');

    const nav = header.props.children[1];
    expect(nav.type).toBe('nav');

    const links = nav.props.children;
    const hrefs = links.map((link: any) => link.props?.href);

    expect(hrefs).toContain('/seller');
    expect(hrefs).toContain('/admin');
    expect(hrefs).toContain('/api/health/live');
  });
});
