import { describe, expect, it } from 'bun:test';
import { canTransitionSellerStatus } from '@/features/seller/lifecycle';

describe('seller lifecycle transitions', () => {
  it('allows verified sellers to be restricted or suspended', () => {
    expect(canTransitionSellerStatus('VERIFIED', 'RESTRICTED')).toBe(true);
    expect(canTransitionSellerStatus('VERIFIED', 'SUSPENDED')).toBe(true);
  });

  it('allows suspended or restricted sellers to reactivate', () => {
    expect(canTransitionSellerStatus('SUSPENDED', 'VERIFIED')).toBe(true);
    expect(canTransitionSellerStatus('RESTRICTED', 'VERIFIED')).toBe(true);
  });

  it('blocks invalid lifecycle transitions', () => {
    expect(canTransitionSellerStatus('DRAFT', 'SUSPENDED')).toBe(false);
    expect(canTransitionSellerStatus('REJECTED', 'VERIFIED')).toBe(false);
    expect(canTransitionSellerStatus('VERIFIED', 'VERIFIED')).toBe(false);
  });
});
