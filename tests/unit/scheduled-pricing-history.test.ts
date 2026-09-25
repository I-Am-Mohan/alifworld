import { describe, it, expect } from 'bun:test';
import {
  resolveEffectivePrice,
  VariantPricingSnapshot,
  EligiblePriceListRule,
} from '@/shared/pricing/price-resolver';

describe('Milestone 099: Scheduled Prices and Price History Invariants', () => {
  const baseVariant: VariantPricingSnapshot = {
    id: 'var-smartphone-256',
    productId: 'prod-smartphone-y',
    sku: 'SMART-Y-256',
    pricePoisha: 6000000n, // ৳60,000.00
    compareAtPricePoisha: 6500000n,
    costPricePoisha: 4500000n,
    minPricePoisha: 5000000n,
    minOrderQuantity: 1,
    productPoint: 600,
  };

  const now = new Date('2026-06-15T12:00:00Z');

  const futureScheduledRule: EligiblePriceListRule = {
    id: 'rule-flash-sale-future',
    priceListId: 'pl-flash-sale',
    pricePoisha: 4800000n, // ৳48,000.00 sale price (clamped to ৳50,000 MAP floor)
    minQuantity: 1,
    priceList: {
      id: 'pl-flash-sale',
      code: 'FLASH_EID_2026',
      channel: 'RETAIL',
      priority: 20,
      startsAt: new Date('2026-07-01T00:00:00Z'), // Starts 15 days in the future
      endsAt: new Date('2026-07-07T23:59:59Z'),
      status: 'ACTIVE',
    },
  };

  const pastExpiredRule: EligiblePriceListRule = {
    id: 'rule-past-promo',
    priceListId: 'pl-past-promo',
    pricePoisha: 5200000n,
    minQuantity: 1,
    priceList: {
      id: 'pl-past-promo',
      code: 'NEW_YEAR_2026',
      channel: 'RETAIL',
      priority: 15,
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2026-01-31T23:59:59Z'), // Expired
      status: 'ACTIVE',
    },
  };

  const currentlyActiveScheduledRule: EligiblePriceListRule = {
    id: 'rule-summer-deal',
    priceListId: 'pl-summer-deal',
    pricePoisha: 5400000n, // ৳54,000.00
    minQuantity: 1,
    priceList: {
      id: 'pl-summer-deal',
      code: 'SUMMER_DEALS_2026',
      channel: 'RETAIL',
      priority: 10,
      startsAt: new Date('2026-06-01T00:00:00Z'),
      endsAt: new Date('2026-06-30T23:59:59Z'), // Active now
      status: 'ACTIVE',
    },
  };

  it('ignores future scheduled price list rule when current time is before startsAt', () => {
    const result = resolveEffectivePrice({
      variant: baseVariant,
      quantity: 1,
      channel: 'RETAIL',
      activeRules: [futureScheduledRule],
      now,
    });

    expect(result.unitPricePoisha).toBe(6000000n); // Standard base price
    expect(result.appliedPriceListId).toBeNull();
  });

  it('ignores expired price list rule when current time is past endsAt', () => {
    const result = resolveEffectivePrice({
      variant: baseVariant,
      quantity: 1,
      channel: 'RETAIL',
      activeRules: [pastExpiredRule],
      now,
    });

    expect(result.unitPricePoisha).toBe(6000000n);
    expect(result.appliedPriceListId).toBeNull();
  });

  it('applies scheduled price list rule when current time falls within startsAt and endsAt', () => {
    const result = resolveEffectivePrice({
      variant: baseVariant,
      quantity: 1,
      channel: 'RETAIL',
      activeRules: [currentlyActiveScheduledRule],
      now,
    });

    expect(result.unitPricePoisha).toBe(5400000n); // ৳54,000.00
    expect(result.appliedPriceListCode).toBe('SUMMER_DEALS_2026');
  });

  it('activates future scheduled price list rule when simulated clock advances past startsAt', () => {
    const futureDate = new Date('2026-07-02T10:00:00Z');

    const result = resolveEffectivePrice({
      variant: baseVariant,
      quantity: 1,
      channel: 'RETAIL',
      activeRules: [futureScheduledRule],
      now: futureDate,
    });

    // Unit price is 4800000 poisha, but MAP floor is 5000000 poisha -> clamped to MAP floor!
    expect(result.unitPricePoisha).toBe(5000000n);
    expect(result.isMapClamped).toBe(true);
    expect(result.appliedPriceListCode).toBe('FLASH_EID_2026');
  });
});
