import { describe, expect, it, mock } from 'bun:test';
import { ProductApprovalService } from '@/features/catalog/services/product-approval-service';
import { ProductStatus } from '@/features/catalog/types';
import { CatalogPolicy } from '@/shared/authz/policies/catalog.policy';

const product = {
  id: 'prd_approval_01', sellerId: 'sel_01', status: ProductStatus.DRAFT, version: 1,
  currency: 'BDT', basePricePoisha: 1000, productPoint: 0,
  seller: { status: 'VERIFIED', ownerUserId: 'usr_seller' },
  category: { isActive: true, attributeAssignments: [] }, brand: null,
  media: [{ mediaType: 'IMAGE' }], variants: [], attributeValues: [], optionSets: [],
};

describe('Milestone 076 product approval workflow', () => {
  it('reports readiness failures without mutating state', async () => {
    const repository: any = { findProduct: mock(async () => ({ ...product, media: [] })) };
    const service = new ProductApprovalService(repository, {} as any, {} as any);
    const result = await service.validateProduct(product.id);
    expect(result.ready).toBe(false);
    expect(result.errors).toContain('At least one product image is required.');
  });

  it('allows submission only after readiness checks and uses the submitted version', async () => {
    const repository: any = {
      findProduct: mock(async () => product),
      findIdempotentRequest: mock(async () => null),
      transition: mock(async (input: any) => input),
    };
    const sellerRepository: any = { findById: mock(async () => product.seller) };
    const roles: any = { hasRole: mock(async () => false) };
    const service = new ProductApprovalService(repository, sellerRepository, roles);
    const result = await service.submit('usr_seller', product.id, { version: 1, idempotencyKey: 'approval-key-01' });
    expect(result.toStatus).toBe(ProductStatus.PENDING_APPROVAL);
    expect(result.submittedVersion).toBe(1);
  });

  it('denies seller publication in the catalog policy', () => {
    const policy = new CatalogPolicy();
    const decision = policy.evaluate({ userId: 'usr_seller', roles: ['SELLER_OWNER'], permissions: ['catalog:publish'], sellerId: 'sel_01' }, 'catalog:publish', { type: 'CATALOG', id: product.id, sellerId: 'sel_01' });
    expect(decision.granted).toBe(false);
  });
});
