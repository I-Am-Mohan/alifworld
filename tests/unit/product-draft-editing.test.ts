import { describe, expect, it, mock } from 'bun:test';
import { ProductService } from '@/features/catalog/services/product-service';
import { prisma } from '@/shared/database/prisma';
import { ProductStatus } from '@/features/catalog/types';

describe('Milestone 081 product draft creation and editing', () => {
  it('creates seller drafts with BDT and independent Product Points', async () => {
    const product = { id: 'prd_1', sellerId: 'sel_1', categoryId: 'cat_1', status: ProductStatus.DRAFT, version: 1, title: 'Draft', slug: 'draft', basePricePoisha: 1000, productPoint: 5 };
    const repo: any = { findBySlug: mock(async () => ({ product: null })), create: mock(async () => product), findById: mock(async () => product) };
    const seller = { id: 'sel_1', ownerUserId: 'usr_1', status: 'VERIFIED' };
    const service = new ProductService(repo, { create: mock(async () => ({})) } as any, { create: mock(async () => ({})) } as any, { findById: mock(async () => ({ id: 'cat_1', isActive: true })) } as any, { findById: mock(async () => seller) } as any, { hasRole: mock(async () => false) } as any);
    (prisma as any).outboxEvent = { create: mock(async () => ({})) };
    (prisma as any).auditLog = { create: mock(async () => ({})) };
    const result = await service.createProduct('usr_1', { sellerId: 'sel_1', categoryId: 'cat_1', title: 'Draft', slug: 'draft', description: 'A valid product description.', basePricePoisha: 1000, currency: 'BDT', productPoint: 5, tags: [], isPhysical: true });
    expect(result.status).toBe(ProductStatus.DRAFT);
    expect(repo.create).toHaveBeenCalled();
  });

  it('records slug history and protects optimistic draft edits', async () => {
    const existing = { id: 'prd_1', sellerId: 'sel_1', categoryId: 'cat_1', status: ProductStatus.DRAFT, version: 1, slug: 'old-slug' };
    const repo: any = { findById: mock(async () => existing), findBySlug: mock(async () => ({ product: null })), recordSlugHistory: mock(async () => {}), update: mock(async (_id: string, version: number, data: any) => ({ ...existing, ...data, version: version + 1 })) };
    const service = new ProductService(repo, {} as any, {} as any, { findById: mock(async () => ({ id: 'cat_1', isActive: true })) } as any, { findById: mock(async () => ({ id: 'sel_1', ownerUserId: 'usr_1', status: 'VERIFIED' })) } as any, { hasRole: mock(async () => false) } as any);
    (prisma as any).outboxEvent = { create: mock(async () => ({})) };
    (prisma as any).auditLog = { create: mock(async () => ({})) };
    const result = await service.updateProduct('usr_1', 'prd_1', 1, { version: 1, slug: 'new-slug', title: 'Updated' });
    expect(result.slug).toBe('new-slug');
    expect(repo.recordSlugHistory).toHaveBeenCalled();
  });
});
