import { describe, expect, it } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  generateCsrfTokenEdge,
  verifyCsrfTokenSignatureEdge,
  verifyRequestCsrfEdge,
} from '@/shared/security/csrf-edge';

const TEST_SECRET = 'edge_runtime_csrf_test_secret_minimum_length';

describe('Edge-runtime CSRF primitives', () => {
  it('generates and verifies a Web Crypto HMAC token', async () => {
    const token = await generateCsrfTokenEdge(TEST_SECRET);

    expect(token.split('.')).toHaveLength(3);
    expect(token.split('.')[0]).toHaveLength(48);
    expect(await verifyCsrfTokenSignatureEdge(token, TEST_SECRET)).toBe(true);
    expect(await verifyCsrfTokenSignatureEdge(`${token}tampered`, TEST_SECRET)).toBe(false);
  });

  it('keeps safe requests exempt without importing Node crypto', async () => {
    const request = new NextRequest('http://localhost:3000/', { method: 'GET' });
    const result = await verifyRequestCsrfEdge(request);

    expect(result).toEqual({
      valid: true,
      code: 'CSRF_SKIPPED',
      reason: 'Safe HTTP read-only method',
    });
  });
});
