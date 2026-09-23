import { describe, expect, it } from 'bun:test';
import { redactSensitiveData, isSensitiveKey } from '@/shared/audit/redactor';
import { computeAuditDiff } from '@/shared/audit/audit-diff';
import { SellerPolicy } from '@/shared/authz/policies/seller.policy';
import { SystemRoleCode } from '@/features/identity/types';
import { canTransitionSellerStatus } from '@/features/seller/lifecycle';

describe('seller lifecycle audit acceptance matrix', () => {
  it('redacts banking, KYC, token, and private object fields', () => {
    expect(isSensitiveKey('accountNumber')).toBe(true);
    expect(isSensitiveKey('routingNumber')).toBe(true);
    expect(isSensitiveKey('encryptedAccountReference')).toBe(true);
    expect(isSensitiveKey('fileUrl')).toBe(true);
    const result = redactSensitiveData({ accountNumber: '1234', routingNumber: '9876', fileUrl: 'private/kyc/x', status: 'SUSPENDED' });
    expect(result.accountNumber).toBe('[REDACTED]');
    expect(result.routingNumber).toBe('[REDACTED]');
    expect(result.fileUrl).toBe('[REDACTED]');
    expect(result.status).toBe('SUSPENDED');
  });

  it('redacts sensitive values inside lifecycle before/after diffs', () => {
    const diff = computeAuditDiff({ status: 'VERIFIED', accountNumber: 'old' }, { status: 'SUSPENDED', accountNumber: 'new' });
    expect(diff?.status).toEqual({ from: 'VERIFIED', to: 'SUSPENDED' });
    expect(diff?.accountNumber).toEqual({ from: '[REDACTED]', to: '[REDACTED]' });
  });

  it('enforces the lifecycle transition matrix', () => {
    expect(canTransitionSellerStatus('VERIFIED', 'SUSPENDED')).toBe(true);
    expect(canTransitionSellerStatus('SUSPENDED', 'VERIFIED')).toBe(true);
    expect(canTransitionSellerStatus('DRAFT', 'VERIFIED')).toBe(false);
    expect(canTransitionSellerStatus('REJECTED', 'SUSPENDED')).toBe(false);
  });

  it('allows seller owners to read but denies staff administration by default', async () => {
    const policy = new SellerPolicy();
    const owner = await policy.evaluate({ userId: 'usr_owner', sellerId: 'sel_one', roles: [SystemRoleCode.SELLER_OWNER], permissions: [] }, 'staff:manage', { type: 'SELLER', id: 'sel_one', sellerId: 'sel_one' });
    const staff = await policy.evaluate({ userId: 'usr_staff', sellerId: 'sel_one', roles: [SystemRoleCode.SELLER_STAFF], permissions: [] }, 'staff:manage', { type: 'SELLER', id: 'sel_one', sellerId: 'sel_one' });
    expect(owner.granted).toBe(true);
    expect(staff.granted).toBe(false);
  });

  it('denies cross-tenant staff administration', async () => {
    const decision = await new SellerPolicy().evaluate({ userId: 'usr_owner', sellerId: 'sel_one', roles: [SystemRoleCode.SELLER_OWNER], permissions: [] }, 'staff:read', { type: 'SELLER', id: 'sel_two', sellerId: 'sel_two' });
    expect(decision.granted).toBe(false);
    expect(decision.code).toBe('TENANT_VIOLATION');
  });
});
