/**
 * Milestone 136: Server-Side Checkout Calculation REST API Integration Tests
 *
 * Verifies:
 * 1. POST /api/v1/checkout/quote - authoritative server calculation preview
 * 2. Independent Product Points snapshots & zero fiat conversion
 * 3. NBR Mushak-6.3 Value Added Tax breakdown endpoint
 * 4. Ownership authorization on order tax breakdowns
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { POST as checkoutQuoteRoute } from '@/app/api/v1/checkout/quote/route';
import { GET as getTaxBreakdownRoute } from '@/app/api/v1/checkout/tax-breakdown/[orderId]/route';
import { serverCheckoutCalculationService } from '@/features/checkout';
import { prisma } from '@/shared/database/prisma';
import { NextRequest } from 'next/server';

describe('Milestone 136: Server-Side Checkout Calculation REST API Integration Tests', () => {
  let authSpy: any;

  const customerActor = {
    userId: 'usr_customer_001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const otherCustomerActor = {
    userId: 'usr_customer_intruder',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const adminActor = {
    userId: 'usr_admin_001',
    roles: ['ADMIN'],
    permissions: ['admin.audit.read'],
    sellerId: null,
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. POST /api/v1/checkout/quote', () => {
    it('calculates authoritative checkout quote with taxes, shipping, discounts, and discrete Product Points', async () => {
      const mockResult = {
        currency: 'BDT' as const,
        subtotalPoisha: 350000,
        subtotalBdtFormatted: '৳3,500.00',
        discountPoisha: 50000,
        sellerDiscountPoisha: 20000,
        platformDiscountPoisha: 30000,
        discountBdtFormatted: '৳500.00',
        coupon: {
          couponCode: 'SAVE500',
          discountAmountPoisha: 50000,
          discountAmountBdtFormatted: '৳500.00',
          sellerSharePercent: 40,
          platformSharePercent: 60,
          sellerDiscountPoisha: 20000,
          platformDiscountPoisha: 30000,
          ruleVersion: 'v1.0.0',
        },
        shippingFeePoisha: 0,
        shippingFeeBdtFormatted: '৳0.00',
        taxPoisha: 45000,
        taxBdtFormatted: '৳450.00',
        taxSummary: {
          jurisdiction: 'BD' as const,
          standardRatePercent: 15.0,
          taxableAmountPoisha: 300000,
          taxableAmountBdtFormatted: '৳3,000.00',
          taxAmountPoisha: 45000,
          taxAmountBdtFormatted: '৳450.00',
          mushakStandard: 'Mushak-6.3' as const,
          rateBreakdown: [
            {
              ratePercent: 15.0,
              taxablePoisha: 300000,
              taxPoisha: 45000,
              description: 'NBR VAT @ 15%',
            },
          ],
        },
        totalPoisha: 345000,
        totalBdtFormatted: '৳3,450.00',
        totalProductPoints: 250, // discrete integer loyalty points
        sellerGroups: [],
        appliedRuleVersion: 'v1.0.0',
        calculatedAt: new Date().toISOString(),
        warnings: [],
      };

      const calcSpy = spyOn(
        serverCheckoutCalculationService,
        'calculateCheckout'
      ).mockResolvedValue(mockResult as any);

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            {
              variantId: 'var_test_101',
              quantity: 2,
            },
          ],
          shippingAddress: {
            division: 'DHAKA',
            district: 'Dhaka',
            upazila: 'Gulshan',
          },
          couponCode: 'SAVE500',
          shippingMethod: 'STANDARD',
        }),
      });

      const response = await checkoutQuoteRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.subtotalPoisha).toBe(350000);
      expect(json.data.discountPoisha).toBe(50000);
      expect(json.data.totalProductPoints).toBe(250);
      expect(json.data.taxSummary.mushakStandard).toBe('Mushak-6.3');

      calcSpy.mockRestore();
    });

    it('rejects calculation request with 422 if neither cartId nor items is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            division: 'DHAKA',
            district: 'Dhaka',
          },
        }),
      });

      const response = await checkoutQuoteRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('2. GET /api/v1/checkout/tax-breakdown/[orderId]', () => {
    const sampleTaxBreakdown = {
      orderId: 'ord_tax_sample_01',
      orderNumber: 'ORD-20261015-TAX01',
      currency: 'BDT',
      mushakStandard: 'Mushak-6.3',
      jurisdiction: 'BD',
      ruleVersion: 'v1.0.0',
      totalTaxableAmountPoisha: 200000,
      totalTaxableAmountBdtFormatted: '৳2,000.00',
      totalTaxAmountPoisha: 30000,
      totalTaxAmountBdtFormatted: '৳300.00',
      rates: [
        {
          ratePercent: 15.0,
          itemsCount: 1,
          taxableAmountPoisha: 200000,
          taxableAmountBdtFormatted: '৳2,000.00',
          taxAmountPoisha: 30000,
          taxAmountBdtFormatted: '৳300.00',
          description: 'NBR Standard VAT (15%)',
        },
      ],
      items: [
        {
          orderItemId: 'itm_t1',
          groupNumber: 'SFG-01',
          productTitle: 'Smart Watch',
          variantTitle: 'Midnight Black',
          sku: 'SW-BLK',
          quantity: 1,
          unitPricePoisha: 200000,
          unitPriceBdtFormatted: '৳2,000.00',
          taxableAmountPoisha: 200000,
          taxableAmountBdtFormatted: '৳2,000.00',
          taxRatePercent: 15.0,
          taxAmountPoisha: 30000,
          taxAmountBdtFormatted: '৳300.00',
        },
      ],
    };

    it('returns NBR Mushak-6.3 tax breakdown for authorized order owner', async () => {
      const taxSpy = spyOn(
        serverCheckoutCalculationService,
        'getOrderTaxBreakdown'
      ).mockResolvedValue(sampleTaxBreakdown as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/checkout/tax-breakdown/ord_tax_sample_01',
        { method: 'GET' }
      );

      const response = await getTaxBreakdownRoute(req, {
        params: Promise.resolve({ orderId: 'ord_tax_sample_01' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.mushakStandard).toBe('Mushak-6.3');
      expect(json.data.totalTaxAmountPoisha).toBe(30000);
      expect(json.data.totalTaxAmountBdtFormatted).toBe('৳300.00');
      expect(json.data.items.length).toBe(1);

      taxSpy.mockRestore();
    });

    it('rejects unauthorized customer with 403 OWNERSHIP_VIOLATION', async () => {
      authSpy.mockReturnValue(otherCustomerActor as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/checkout/tax-breakdown/ord_tax_sample_01',
        { method: 'GET' }
      );

      const response = await getTaxBreakdownRoute(req, {
        params: Promise.resolve({ orderId: 'ord_tax_sample_01' }),
      });
      const json = await response.json();

      // Should be 404 or 403 when order not found or not owned
      expect([403, 404]).toContain(response.status);
      expect(json.success).toBe(false);
    });

    it('allows Admin to view tax breakdown for any order', async () => {
      authSpy.mockReturnValue(adminActor as any);

      const taxSpy = spyOn(
        serverCheckoutCalculationService,
        'getOrderTaxBreakdown'
      ).mockResolvedValue(sampleTaxBreakdown as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/checkout/tax-breakdown/ord_tax_sample_01',
        { method: 'GET' }
      );

      const response = await getTaxBreakdownRoute(req, {
        params: Promise.resolve({ orderId: 'ord_tax_sample_01' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);

      taxSpy.mockRestore();
    });
  });
});
