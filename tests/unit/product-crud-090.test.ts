import { describe, expect, it, mock } from 'bun:test';
import { ProductVariantService } from '@/features/catalog/services/product-variant-service';
import { ProductService } from '@/features/catalog/services/product-service';
import { ProductStatus } from '@/features/catalog/types';
import { AuthorizationError, ConflictError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

const seller = { id: 'sel_1', ownerUserId: 'usr_owner', status: 'VERIFIED' };
const product = { id: 'prd_1', sellerId: 'sel_1', status: ProductStatus.DRAFT, version: 1, title: 'Test product', slug: 'test-product', basePricePoisha: 1000, productPoint: 5 };

function setupPrisma() {
  (prisma as any).auditLog = { create: mock(async () => ({})) };
  (prisma as any).outboxEvent = { create: mock(async () => ({})) };
  (prisma as any).product = { findFirst: mock(async () => product) };
  (prisma as any).seller = { findFirst: mock(async () => ({ ownerUserId: seller.ownerUserId })) };
}

describe('Milestone 090 product CRUD contracts', () => {
  it('deletes only lifecycle-eligible products with optimistic versioning', async () => {
    setupPrisma();
    const repo: any = { findById: mock(async () => product), softDelete: mock(async () => {}) };
    const service = new ProductService(repo, {} as any, {} as any, {} as any, { findById: mock(async () => seller) } as any, { hasRole: mock(async () => false) } as any, {} as any, { record: mock(async () => null) } as any);
    const result = await service.deleteProduct('usr_owner', 'prd_1', 1, 'sel_1');
    expect(result).toEqual({ deleted: true, productId: 'prd_1' });
    expect(repo.softDelete).toHaveBeenCalledWith('prd_1', 1, 'usr_owner', 'sel_1');
  });

  it('blocks deletion of published products', async () => {
    setupPrisma();
    const repo: any = { findById: mock(async () => ({ ...product, status: ProductStatus.PUBLISHED })) };
    const service = new ProductService(repo, {} as any, {} as any, {} as any, { findById: mock(async () => seller) } as any, { hasRole: mock(async () => false) } as any);
    await expect(service.deleteProduct('usr_owner', 'prd_1', 1, 'sel_1')).rejects.toThrow(ConflictError);
  });

  it('rejects variant access for a different seller', async () => {
    setupPrisma();
    (prisma as any).product.findFirst = mock(async () => ({ id: 'prd_1', sellerId: 'sel_other' }));
    (prisma as any).seller.findFirst = mock(async () => ({ ownerUserId: 'usr_other' }));
    const service = new ProductVariantService({} as any, { hasRole: mock(async () => false) } as any, {} as any);
    await expect(service.list('usr_owner', 'prd_1', 'sel_1')).rejects.toThrow(AuthorizationError);
  });

  it('records variant creation and enforces globally unique identifiers', async () => {
    setupPrisma();
    const repository: any = { findBySku: mock(async () => null), create: mock(async () => ({ id: 'var_1', sku: 'SKU-1' })) };
    const identifiers: any = { assertAvailable: mock(async () => {}) };
    const service = new ProductVariantService(repository, { hasRole: mock(async () => false) } as any, identifiers);
    const result = await service.create('usr_owner', 'prd_1', { sku: 'SKU-1', title: 'Variant', pricePoisha: 1000, productPoint: 2, isActive: true, displayOrder: 0 }, 'sel_1');
    expect(result.id).toBe('var_1');
    expect(identifiers.assertAvailable).toHaveBeenCalled();
  });
});
