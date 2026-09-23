import { describe, expect, it, mock } from 'bun:test';
import { IdentifierPolicyService } from '@/features/catalog/services/identifier-policy-service';
import { isValidEan13, normalizeBarcode, normalizeSku } from '@/features/catalog/identifiers';

describe('Milestone 083 SKU barcode uniqueness policies', () => {
  it('normalizes and validates identifiers', () => {
    expect(normalizeSku(' sku-abc ')).toBe('SKU-ABC');
    expect(normalizeBarcode('1234 5678')).toBe('12345678');
    expect(isValidEan13('4006381333931')).toBe(true);
  });

  it('reports conflicts across products and variants', async () => {
    const service = new IdentifierPolicyService();
    const product = { id: 'prd_1', sku: 'SKU-1', barcode: null };
    const variant = { id: 'var_1', sku: null, barcode: '12345678' };
    const prisma = await import('@/shared/database/prisma');
    (prisma.prisma as any).product = { findFirst: mock(async () => product) };
    (prisma.prisma as any).productVariant = { findFirst: mock(async () => variant) };
    const result = await service.check({ sku: 'SKU-1', barcode: '12345678' });
    expect(result.available).toBe(false);
    expect(result.conflicts.productId).toBe('prd_1');
    expect(result.conflicts.variantId).toBe('var_1');
  });
});
