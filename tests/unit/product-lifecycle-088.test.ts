import { describe, expect, it } from 'bun:test';
import { ProductApprovalService } from '@/features/catalog/services/product-approval-service';
import { ProductStatus } from '@/features/catalog/types';

describe('Milestone 088 product lifecycle contract', () => {
  it('uses the governed lifecycle states', () => {
    expect(ProductStatus.DRAFT).toBe('DRAFT');
    expect(ProductStatus.PENDING_APPROVAL).toBe('PENDING_APPROVAL');
    expect(ProductStatus.APPROVED).toBe('APPROVED');
    expect(ProductStatus.PUBLISHED).toBe('PUBLISHED');
    expect(ProductStatus.ARCHIVED).toBe('ARCHIVED');
  });

  it('requires approval before publication', async () => {
    const repository: any = { findProduct: async () => ({ id: 'prd_1', status: ProductStatus.PENDING_APPROVAL }) };
    const service = new ProductApprovalService(repository, {} as any, { hasRole: async () => true } as any);
    await expect(service.publish('admin', 'prd_1', { version: 1 })).rejects.toThrow('Only approved products');
  });
});
