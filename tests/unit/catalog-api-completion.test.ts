import { describe, expect, it } from 'bun:test';
import { CreateProductSchema } from '@/features/catalog/validators';
import { CatalogPolicy } from '@/shared/authz/policies/catalog.policy';

describe('Milestone 080 catalog API completion', () => {
  it('accepts a valid seller product draft contract', () => {
    const result = CreateProductSchema.safeParse({ sellerId: 'sel_01', categoryId: 'cat_01', title: 'Example product', slug: 'example-product', description: 'A sufficiently detailed product description.', basePricePoisha: 10000, productPoint: 10, currency: 'BDT' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid price and non-canonical slugs at the API boundary', () => {
    expect(CreateProductSchema.safeParse({ sellerId: 'sel_01', categoryId: 'cat_01', title: 'Bad', slug: 'Bad Slug', description: 'A sufficiently detailed product description.', basePricePoisha: 0 }).success).toBe(false);
  });

  it('allows seller writes only within their own tenant and forbids publication', () => {
    const policy = new CatalogPolicy();
    const actor = { userId: 'usr_seller', roles: ['SELLER_OWNER'], permissions: ['catalog:write', 'catalog:publish'], sellerId: 'sel_01' };
    expect(policy.evaluate(actor, 'catalog:write', { type: 'CATALOG', id: 'prd_01', sellerId: 'sel_01' }).granted).toBe(true);
    expect(policy.evaluate(actor, 'catalog:write', { type: 'CATALOG', id: 'prd_02', sellerId: 'sel_02' }).granted).toBe(false);
    expect(policy.evaluate(actor, 'catalog:publish', { type: 'CATALOG', id: 'prd_01', sellerId: 'sel_01' }).granted).toBe(false);
  });
});
