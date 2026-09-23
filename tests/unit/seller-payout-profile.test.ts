import { describe, expect, it } from 'bun:test';
import { decryptPayoutSecret, encryptPayoutSecret, lastFour, payoutFingerprint } from '@/features/seller/payout-profile-crypto';
import { PayoutProfileInputSchema } from '@/features/seller/payout-profile';

describe('seller payout profile security', () => {
  it('encrypts and decrypts banking values without deterministic ciphertext', () => {
    const first = encryptPayoutSecret('1234567890');
    const second = encryptPayoutSecret('1234567890');
    expect(first).not.toBe(second);
    expect(decryptPayoutSecret(first)).toBe('1234567890');
  });

  it('generates safe last-four and duplicate fingerprints', () => {
    expect(lastFour(' 1234 5678 ')).toBe('5678');
    expect(payoutFingerprint('1234 5678')).toBe(payoutFingerprint('12345678'));
  });

  it('validates payout profile input boundaries', () => {
    expect(PayoutProfileInputSchema.safeParse({ sellerId: 'sel_abc123', providerName: 'Example Bank', accountNumber: '12345678', accountTitle: 'Alif Traders', version: 1 }).success).toBe(true);
    expect(PayoutProfileInputSchema.safeParse({ sellerId: 'sel_abc123', providerName: 'x', accountNumber: '12', accountTitle: 'A', version: 0 }).success).toBe(false);
  });
});
