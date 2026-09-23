import { describe, expect, it, mock } from 'bun:test';
import { ProductApprovalService } from '@/features/catalog/services/product-approval-service';
import { ProductStatus } from '@/features/catalog/types';

describe('Milestone 088 submission approval publication archival workflow', () => {
  const product = { id: 'prd_1', sellerId: 'sel_1', status: ProductStatus.PENDING_APPROVAL, version: 2, title: 'Phone', slug: 'phone', description: 'A valid product description.', currency: 'BDT', basePricePoisha: 1000000, productPoint: 100, seller: { status: 'VERIFIED', ownerUserId: 'usr_seller' }, category: { isActive: true, attributeAssignments: [] }, brand: null, media: [{ mediaType: 'IMAGE' }], variants: [], attributeValues: [], optionSets: [] };

  it('approves only ready pending products', async () => {
    const repository: any = { findProduct: mock(async () => product), transition: mock(async (input: any) => input) };
    const service = new ProductApprovalService(repository, {} as any, { hasRole: mock(async () => true) } as any);
    const result = await service.approve('usr_admin', product.id, { version: 2, reason: 'Ready for publication' });
    expect(result.toStatus).toBe(ProductStatus.APPROVED);
  });

  it('enforces the publication and archival state sequence', async () => {
    const repository: any = { findProduct: mock(async () => ({ ...product, status: ProductStatus.APPROVED })), transition: mock(async (input: any) => input) };
    const service = new ProductApprovalService(repository, {} as any, { hasRole: mock(async () => true) } as any);
    expect((await service.publish('usr_admin', product.id, { version: 2 })).toStatus).toBe(ProductStatus.PUBLISHED);
    repository.findProduct = mock(async () => ({ ...product, status: ProductStatus.PUBLISHED }));
    expect((await service.archive('usr_admin', product.id, { version: 2, reason: 'Retired listing' })).toStatus).toBe(ProductStatus.ARCHIVED);
  });

  it('rejects products without SEO-ready content', async () => {
    const repository: any = { findProduct: mock(async () => ({ ...product, title: '', slug: '', description: 'short' })) };
    const service = new ProductApprovalService(repository, {} as any, { hasRole: mock(async () => true) } as any);
    await expect(service.approve('usr_admin', product.id, { version: 2 })).rejects.toThrow('not ready');
  });
});
