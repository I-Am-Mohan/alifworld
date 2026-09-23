import { describe, expect, it } from 'bun:test';
import { SellerOperationalDefaultsSchema, SellerNotificationDefaultsSchema } from '@/features/seller/operational-defaults';
import { TaxService } from '@/features/catalog/services/tax-service';

describe('seller operational defaults', () => {
  it('validates effective-dated tax and order defaults', () => {
    const result = SellerOperationalDefaultsSchema.safeParse({ sellerId: 'sel_abc123', taxJurisdiction: 'BD', taxRuleVersion: 'v1', taxEffectiveFrom: '2026-09-23T00:00:00Z', shippingMode: 'PLATFORM', defaultHandlingDays: 2, orderCutoffTime: '18:30', autoAcceptOrders: false, defaultOrderStatus: 'PENDING', version: 1 });
    expect(result.success).toBe(true);
  });

  it('validates seller notification defaults without allowing unknown channels', () => {
    expect(SellerNotificationDefaultsSchema.safeParse({ sellerId: 'sel_abc123', preferences: [{ channel: 'EMAIL', eventType: 'MARKETING', enabled: false }] }).success).toBe(true);
    expect(SellerNotificationDefaultsSchema.safeParse({ sellerId: 'sel_abc123', preferences: [{ channel: 'WHATSAPP', eventType: 'MARKETING', enabled: false }] }).success).toBe(false);
  });

  it('accepts an effective date in tax resolution', () => {
    expect(new TaxService().resolveTaxRatePercent({ date: new Date('2026-09-23T00:00:00Z') })).toBe(15);
  });
});
