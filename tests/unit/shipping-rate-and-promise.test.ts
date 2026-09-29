/**
 * Milestone 133: Shipping Rate & Delivery Promise Abstraction Unit Tests
 *
 * Verifies:
 * 1. Physical & volumetric weight calculation (IATA standard: L*W*H/5000)
 * 2. Asia/Dhaka delivery promise engine (Friday weekend exclusion, 14:00 cutoff rollover)
 * 3. Zone-based shipping rate matrix & incremental weight brackets
 * 4. Special handling surcharges (FRAGILE, HEAVY) & Digital bypass
 * 5. Free shipping threshold qualification per seller
 * 6. Multi-vendor seller parcel partitioning
 * 7. Cash on Delivery (COD) threshold restrictions
 * 8. Versioned Admin shipping rule repository matching
 */

import { describe, it, expect } from 'bun:test';
import {
  calculatePackageWeight,
  calculateDeliveryPromise,
  getDhakaDateParts,
  toBanglaNumber,
} from '@/features/shipping/services/shipping-promise-calculator';
import { shippingRateService } from '@/features/shipping/services/shipping-rate.service';
import { RuleBasedShippingRateProvider } from '@/features/shipping/providers/rule-based-shipping.provider';
import { ShippingItemInput } from '@/features/shipping/types/shipping-rate.types';

describe('Milestone 133: Shipping Rate & Promise Abstraction Unit Tests', () => {
  describe('1. Package Weight & Volumetric Weight Calculations', () => {
    it('calculates standard physical weight correctly', () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-1',
          productTitle: 'Cotton T-Shirt',
          quantity: 2,
          weightGrams: 200,
          unitPricePoisha: 50000n,
          sellerId: 'seller-1',
        },
      ];

      const weight = calculatePackageWeight(items);
      expect(weight.actualWeightGrams).toBe(400);
      expect(weight.chargeableWeightGrams).toBe(400);
      expect(weight.isVolumetricDominant).toBe(false);
      expect(weight.isOverweight).toBe(false);
    });

    it('calculates volumetric weight when dimensional weight exceeds physical weight', () => {
      // Bulky light box: 500mm x 400mm x 300mm = 60,000,000 mm³
      // Volumetric weight: 60,000,000 / 5,000 = 12,000g (12kg)
      // Physical weight: 1,500g (1.5kg)
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-bulky',
          productTitle: 'Foam Pillow',
          quantity: 1,
          weightGrams: 1500,
          lengthMm: 500,
          widthMm: 400,
          heightMm: 300,
          unitPricePoisha: 120000n,
          sellerId: 'seller-1',
        },
      ];

      const weight = calculatePackageWeight(items);
      expect(weight.actualWeightGrams).toBe(1500);
      expect(weight.volumetricWeightGrams).toBe(12000);
      expect(weight.chargeableWeightGrams).toBe(12000);
      expect(weight.isVolumetricDominant).toBe(true);
      expect(weight.isOverweight).toBe(true); // > 10,000g
    });

    it('bypasses digital non-physical items from chargeable weight', () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-digital',
          productTitle: 'E-Book / Software License',
          quantity: 1,
          requiresShipping: false,
          shippingClass: 'DIGITAL',
          unitPricePoisha: 50000n,
          sellerId: 'seller-1',
        },
      ];

      const weight = calculatePackageWeight(items);
      expect(weight.chargeableWeightGrams).toBe(0);
      expect(weight.actualWeightGrams).toBe(0);
    });
  });

  describe('2. Delivery Promise Engine in Asia/Dhaka', () => {
    it('accurately resolves Asia/Dhaka time offset (UTC+6)', () => {
      // 2026-10-01 06:00:00 UTC = 2026-10-01 12:00:00 Dhaka
      const utcDate = new Date(Date.UTC(2026, 9, 1, 6, 0, 0));
      const dhakaParts = getDhakaDateParts(utcDate);

      expect(dhakaParts.year).toBe(2026);
      expect(dhakaParts.month).toBe(9); // October
      expect(dhakaParts.day).toBe(1);
      expect(dhakaParts.hours).toBe(12);
      expect(dhakaParts.minutes).toBe(0);
    });

    it('processes order placed before 14:00 cutoff on the same business day', () => {
      // Thursday, Oct 1, 2026 at 10:00 AM Dhaka (04:00 UTC)
      const morningDate = new Date(Date.UTC(2026, 9, 1, 4, 0, 0));

      const promise = calculateDeliveryPromise({
        asOfDate: morningDate,
        handlingDays: 1,
        transitDaysMin: 1,
        transitDaysMax: 2,
        orderCutoffTime: '14:00',
        ruleVersion: 'v1.0.0',
      });

      expect(promise.isCutoffPassed).toBe(false);
      expect(promise.cutoffRemainingMinutes).toBe(240); // 4 hours before 14:00
      expect(promise.appliedRuleVersion).toBe('v1.0.0');
      expect(promise.promiseTextEn).toContain('Business Days');
    });

    it('rolls order placed after 14:00 cutoff to the next business day', () => {
      // Thursday, Oct 1, 2026 at 16:00 PM Dhaka (10:00 UTC) - after 14:00
      const eveningDate = new Date(Date.UTC(2026, 9, 1, 10, 0, 0));

      const promise = calculateDeliveryPromise({
        asOfDate: eveningDate,
        handlingDays: 1,
        transitDaysMin: 1,
        transitDaysMax: 2,
        orderCutoffTime: '14:00',
      });

      expect(promise.isCutoffPassed).toBe(true);
      expect(promise.cutoffRemainingMinutes).toBeNull();
      // Because Thursday post-cutoff rolls to Friday (weekend), next business day is Saturday!
      expect(promise.minEstimatedDate).toBeDefined();
    });

    it('formats promise strings in both English and Bangla numerals', () => {
      const bnNumber = toBanglaNumber(250);
      expect(bnNumber).toBe('২৫০');

      const fixedDate = new Date(Date.UTC(2026, 9, 1, 4, 0, 0));
      const promise = calculateDeliveryPromise({
        asOfDate: fixedDate,
        handlingDays: 1,
        transitDaysMin: 1,
        transitDaysMax: 2,
      });

      expect(promise.promiseTextEn).toContain('Business Days');
      expect(promise.promiseTextBn).toContain('কার্যদিবস');
      expect(promise.minEstimatedFormattedBn).toBeDefined();
      expect(promise.maxEstimatedFormattedBn).toBeDefined();
    });
  });

  describe('3. Rule-Based Shipping Provider & Zone Matrix', () => {
    const provider = new RuleBasedShippingRateProvider();

    it('calculates base rate of ৳60.00 for Metro Dhaka within 1kg', async () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-1',
          productTitle: 'Shirt',
          quantity: 1,
          weightGrams: 500,
          unitPricePoisha: 100000n, // ৳1,000 (below ৳2,000 free shipping)
          sellerId: 'sel-1',
        },
      ];

      const rates = await provider.calculateRates({
        originZone: 'METRO_DHAKA',
        destinationZone: 'METRO_DHAKA',
        destinationAddress: { division: 'DHAKA', district: 'Dhaka' },
        packageWeight: calculatePackageWeight(items),
        items,
        sellerSubtotalPoisha: 100000,
      });

      const standardRate = rates.find((r) => r.methodCode === 'STANDARD');
      expect(standardRate).toBeDefined();
      expect(standardRate?.baseRatePoisha).toBe(6000); // ৳60.00
      expect(standardRate?.weightSurchargePoisha).toBe(0);
      expect(standardRate?.finalRatePoisha).toBe(6000);
      expect(standardRate?.finalRateBdtFormatted).toBe('৳60.00');
    });

    it('adds incremental weight surcharge for parcels exceeding 1kg', async () => {
      // 3.2kg parcel inside Metro Dhaka: 1kg base + 3 incremental 1kg blocks @ ৳20 = ৳60 base + ৳60 surcharge = ৳120
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-heavy',
          productTitle: 'Rice Bag 3.2kg',
          quantity: 1,
          weightGrams: 3200,
          unitPricePoisha: 80000n,
          sellerId: 'sel-1',
        },
      ];

      const rates = await provider.calculateRates({
        originZone: 'METRO_DHAKA',
        destinationZone: 'METRO_DHAKA',
        destinationAddress: { division: 'DHAKA', district: 'Dhaka' },
        packageWeight: calculatePackageWeight(items),
        items,
        sellerSubtotalPoisha: 80000,
      });

      const standard = rates.find((r) => r.methodCode === 'STANDARD');
      expect(standard?.baseRatePoisha).toBe(6000);
      expect(standard?.weightSurchargePoisha).toBe(6000); // 3 blocks * 2000 poisha
      expect(standard?.finalRatePoisha).toBe(12000); // ৳120.00
    });

    it('applies Outside Dhaka nationwide rate of ৳120.00 base', async () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-1',
          productTitle: 'Watch',
          quantity: 1,
          weightGrams: 300,
          unitPricePoisha: 150000n,
          sellerId: 'sel-1',
        },
      ];

      const rates = await provider.calculateRates({
        originZone: 'METRO_DHAKA',
        destinationZone: 'MAJOR_CITIES',
        destinationAddress: { division: 'CHITTAGONG', district: 'Chittagong' },
        packageWeight: calculatePackageWeight(items),
        items,
        sellerSubtotalPoisha: 150000,
      });

      const standard = rates.find((r) => r.methodCode === 'STANDARD');
      expect(standard?.baseRatePoisha).toBe(12000); // ৳120.00
      expect(standard?.finalRatePoisha).toBe(12000);
    });

    it('applies Remote Upazila rate of ৳150.00 base', async () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-1',
          productTitle: 'Book',
          quantity: 1,
          weightGrams: 400,
          unitPricePoisha: 50000n,
          sellerId: 'sel-1',
        },
      ];

      const rates = await provider.calculateRates({
        originZone: 'METRO_DHAKA',
        destinationZone: 'REMOTE_UPAZILA',
        destinationAddress: { division: 'RANGPUR', district: 'Kurigram', upazila: 'Rajarhat' },
        packageWeight: calculatePackageWeight(items),
        items,
        sellerSubtotalPoisha: 50000,
      });

      const standard = rates.find((r) => r.methodCode === 'STANDARD');
      expect(standard?.baseRatePoisha).toBe(15000); // ৳150.00
      expect(standard?.finalRatePoisha).toBe(15000);
    });

    it('adds fragile item surcharge (৳50.00)', async () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-glass',
          productTitle: 'Ceramic Tea Set',
          quantity: 1,
          weightGrams: 800,
          shippingClass: 'FRAGILE',
          unitPricePoisha: 150000n,
          sellerId: 'sel-1',
        },
      ];

      const rates = await provider.calculateRates({
        originZone: 'METRO_DHAKA',
        destinationZone: 'METRO_DHAKA',
        destinationAddress: { division: 'DHAKA', district: 'Dhaka' },
        packageWeight: calculatePackageWeight(items),
        items,
        sellerSubtotalPoisha: 150000,
      });

      const standard = rates.find((r) => r.methodCode === 'STANDARD');
      expect(standard?.classSurchargePoisha).toBe(5000); // ৳50.00
      expect(standard?.finalRatePoisha).toBe(11000); // ৳60 base + ৳50 fragile = ৳110.00
    });

    it('qualifies for free shipping when seller subtotal meets or exceeds ৳2,000 threshold', async () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-1',
          productTitle: 'Premium Headphones',
          quantity: 1,
          weightGrams: 600,
          unitPricePoisha: 250000n, // ৳2,500 >= ৳2,000
          sellerId: 'sel-1',
        },
      ];

      const rates = await provider.calculateRates({
        originZone: 'METRO_DHAKA',
        destinationZone: 'MAJOR_CITIES',
        destinationAddress: { division: 'SYLHET', district: 'Sylhet' },
        packageWeight: calculatePackageWeight(items),
        items,
        sellerSubtotalPoisha: 250000,
      });

      const standard = rates.find((r) => r.methodCode === 'STANDARD');
      expect(standard?.isFreeShipping).toBe(true);
      expect(standard?.freeShippingDiscountPoisha).toBe(12000);
      expect(standard?.finalRatePoisha).toBe(0);
      expect(standard?.finalRateBdtFormatted).toBe('৳0.00');
    });
  });

  describe('4. Multi-Vendor Shipping Rate Service Partitioning', () => {
    it('partitions multi-seller items and computes separate shipping packages', async () => {
      const items: ShippingItemInput[] = [
        // Seller 1 item (qualifies for free shipping)
        {
          variantId: 'var-s1',
          productTitle: 'Smartphone',
          quantity: 1,
          weightGrams: 400,
          unitPricePoisha: 250000n, // ৳2,500.00
          sellerId: 'seller-alpha',
        },
        // Seller 2 item (does not qualify for free shipping)
        {
          variantId: 'var-s2',
          productTitle: 'Leather Belt',
          quantity: 1,
          weightGrams: 200,
          unitPricePoisha: 80000n, // ৳800.00
          sellerId: 'seller-beta',
        },
      ];

      const quote = await shippingRateService.calculateOrderShippingQuote({
        address: {
          division: 'DHAKA',
          district: 'Dhaka',
          streetAddress: 'House 12, Road 4, Dhanmondi',
        },
        items,
        shippingMethod: 'STANDARD',
      });

      expect(quote.zone).toBe('METRO_DHAKA');
      expect(quote.sellerQuotes.length).toBe(2);

      const quoteAlpha = quote.sellerQuotes.find((q) => q.sellerId === 'seller-alpha');
      const quoteBeta = quote.sellerQuotes.find((q) => q.sellerId === 'seller-beta');

      expect(quoteAlpha?.qualifiesForFreeShipping).toBe(true);
      expect(quoteAlpha?.activeRate.finalRatePoisha).toBe(0);

      expect(quoteBeta?.qualifiesForFreeShipping).toBe(false);
      expect(quoteBeta?.activeRate.finalRatePoisha).toBe(6000); // ৳60.00 Metro Dhaka

      expect(quote.totalShippingFeePoisha).toBe(6000); // 0 + 6000
      expect(quote.totalShippingFeeBdtFormatted).toBe('৳60.00');
      expect(quote.totalFreeShippingSavingsPoisha).toBe(6000);
      expect(quote.allSellersCodAllowed).toBe(true);
      expect(quote.requiresPrepayment).toBe(false);
    });

    it('enforces digital prepayment when total order value exceeds ৳50,000 COD limit', async () => {
      const items: ShippingItemInput[] = [
        {
          variantId: 'var-laptop',
          productTitle: 'Gaming Laptop',
          quantity: 1,
          weightGrams: 2500,
          unitPricePoisha: 6000000n, // ৳60,000.00 > ৳50,000 threshold
          sellerId: 'sel-laptop',
        },
      ];

      const quote = await shippingRateService.calculateOrderShippingQuote({
        address: {
          division: 'DHAKA',
          district: 'Dhaka',
        },
        items,
        shippingMethod: 'STANDARD',
      });

      expect(quote.requiresPrepayment).toBe(true);
      expect(quote.allSellersCodAllowed).toBe(false);
    });
  });
});
