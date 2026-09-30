import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { prisma } from '@/shared/database/prisma';
import { IdentifierPolicyService } from '@/features/catalog/services/identifier-policy-service';
import { isValidEan13, normalizeBarcode, normalizeSku } from '@/features/catalog/identifiers';

describe('Milestone 083 SKU barcode uniqueness policies', () => {
  let originalProduct: typeof prisma.product;
  let originalVariant: typeof prisma.productVariant;
  beforeEach(() => {
    originalProduct = prisma.product;
    originalVariant = prisma.productVariant;
  });
  afterEach(() => {
    Object.assign(prisma, { product: originalProduct, productVariant: originalVariant });
  });
  it('queries only the identifier provided by the caller', async () => {
    const findProduct = mock(async () => null);
    const findVariant = mock(async () => null);
    Object.assign(prisma, {
      product: { findFirst: findProduct },
      productVariant: { findFirst: findVariant },
    });
    await new IdentifierPolicyService().check({ sku: 'SKU-1' });
    expect(findProduct).toHaveBeenCalledWith({
      where: { deletedAt: null, OR: [{ sku: 'SKU-1' }] },
      select: { id: true, sku: true, barcode: true },
    });
    expect(findVariant).toHaveBeenCalledWith({
      where: { deletedAt: null, OR: [{ sku: 'SKU-1' }] },
      select: { id: true, sku: true, barcode: true },
    });
  });
  it('does not treat absent optional identifiers as a collision', async () => {
    const service = new IdentifierPolicyService();
    const result = await service.check({});
    expect(result.available).toBe(true);
    expect(result.conflicts.productId).toBeNull();
    expect(result.conflicts.variantId).toBeNull();
    await expect(service.assertAvailable({})).resolves.toBeUndefined();
  });
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
