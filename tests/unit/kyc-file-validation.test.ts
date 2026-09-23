import { describe, expect, it } from 'bun:test';
import { validateKycFile } from '@/features/seller/kyc-file-validation';

describe('secure KYC file validation', () => {
  it('accepts matching PDF signatures', () => {
    expect(() => validateKycFile({ size: 4, type: 'application/pdf' }, new TextEncoder().encode('%PDF'))).not.toThrow();
  });

  it('rejects mismatched magic bytes', () => {
    expect(() => validateKycFile({ size: 4, type: 'application/pdf' }, new TextEncoder().encode('NOPE'))).toThrow();
  });

  it('rejects unsupported types and oversized files', () => {
    expect(() => validateKycFile({ size: 4, type: 'text/plain' }, new Uint8Array([1, 2, 3, 4]))).toThrow();
    expect(() => validateKycFile({ size: 10 * 1024 * 1024 + 1, type: 'application/pdf' }, new TextEncoder().encode('%PDF'))).toThrow();
  });
});
