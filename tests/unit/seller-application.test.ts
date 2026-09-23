import { describe, expect, it } from 'bun:test';
import { SellerApplicationDraftSchema, SellerApplicationIdSchema, SellerApplicationReviewSchema } from '@/features/seller/application';
import { SellerPolicy } from '@/shared/authz/policies/seller.policy';

describe('seller application workflow', () => {
  it('validates the Bangladesh seller application identity fields', () => {
    expect(SellerApplicationDraftSchema.safeParse({ businessName: 'Alif Traders', slug: 'alif-traders', tradeLicenseNumber: 'TL-100' }).success).toBe(true);
    expect(SellerApplicationDraftSchema.safeParse({ businessName: 'A', slug: 'bad slug' }).success).toBe(false);
    expect(SellerApplicationDraftSchema.safeParse({ businessName: 'Alif Traders', slug: 'alif-traders', tinNumber: '123' }).success).toBe(false);
  });

  it('requires reasons for rejection and requested changes', () => {
    expect(SellerApplicationReviewSchema.safeParse({ version: 1, decision: 'APPROVED', reason: 'All submitted business information was verified.' }).success).toBe(true);
    expect(SellerApplicationReviewSchema.safeParse({ version: 1, decision: 'REJECTED' }).success).toBe(false);
    expect(SellerApplicationReviewSchema.safeParse({ version: 1, decision: 'CHANGES_REQUESTED', reason: 'Please add your registered address.' }).success).toBe(true);
  });

  it('prevents seller roles from reviewing applications', async () => {
    const policy = new SellerPolicy();
    const decision = await policy.evaluate(
      { userId: 'usr_owner', roles: ['SELLER_OWNER'], permissions: ['seller:profile:manage'], sellerId: 'sel_1' },
      'seller_application:review',
      { type: 'SELLER', id: 'sapp_1' }
    );
    expect(decision.granted).toBe(false);
    expect(decision.code).toBe('PRIVILEGE_ESCALATION');
  });

  it('allows only platform reviewers to review applications', async () => {
    const policy = new SellerPolicy();
    const decision = await policy.evaluate(
      { userId: 'usr_admin', roles: ['ADMIN'], permissions: ['sellers:verify'] },
      'seller_application:review',
      { type: 'SELLER', id: 'sapp_1' }
    );
    expect(decision.granted).toBe(true);
  });

  it('requires the explicit application identifier format', () => {
    expect(() => SellerApplicationIdSchema.parse('sapp_01review')).not.toThrow();
    expect(() => SellerApplicationIdSchema.parse('application-1')).toThrow();
  });
});
