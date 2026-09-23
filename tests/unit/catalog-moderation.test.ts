import { describe, expect, it, mock } from 'bun:test';
import { CatalogModerationService } from '@/features/catalog/services/moderation-service';
import { duplicateHash, normalizeDuplicateText } from '@/features/catalog/repositories/moderation-repository';
import { CatalogPolicy } from '@/shared/authz/policies/catalog.policy';

describe('Milestone 079 catalog moderation and duplicate detection', () => {
  it('normalizes duplicate text deterministically', () => {
    expect(normalizeDuplicateText('  Walton Primo S8-Pro! ')).toBe('walton primo s8 pro');
    expect(duplicateHash(normalizeDuplicateText('Same Product'))).toBe(duplicateHash(normalizeDuplicateText('same-product')));
  });

  it('generates stable fingerprints and variant signatures', () => {
    const service = new CatalogModerationService({} as any, {} as any);
    const first = service.fingerprint({ title: 'Phone Pro', brandId: 'brd_1', categoryId: 'cat_1', sku: 'PHONE-1', variants: [{ sku: 'PHONE-1-BLK', options: [{ attributeId: 'att_color', valueId: 'avl_black' }] }] });
    const second = service.fingerprint({ title: 'Phone-Pro', brandId: 'brd_1', categoryId: 'cat_1', sku: 'PHONE-1', variants: [{ sku: 'PHONE-1-BLK', options: [{ attributeId: 'att_color', valueId: 'avl_black' }] }] });
    expect(first.normalizedTitleHash).toBe(second.normalizedTitleHash);
    expect(first.variantSignature).toBe(second.variantSignature);
    expect(first.skuFingerprint).toBeTruthy();
  });

  it('keeps moderation administration unavailable to sellers', () => {
    const policy = new CatalogPolicy();
    const decision = policy.evaluate({ userId: 'usr_seller', roles: ['SELLER_OWNER'], permissions: ['catalog:write'], sellerId: 'sel_1' }, 'catalog:approve', { type: 'CATALOG', id: 'mrv_1' });
    expect(decision.granted).toBe(false);
  });

  it('requires a reason for non-dismissal resolutions', async () => {
    const repository: any = { findReview: mock(async () => ({ id: 'mrv_1', reason: null })) };
    const roles: any = { hasRole: mock(async () => true) };
    const service = new CatalogModerationService(repository, roles);
    await expect(service.resolve('usr_admin', 'mrv_1', { status: 'REQUEST_CHANGES' })).rejects.toThrow('reason');
  });
});
