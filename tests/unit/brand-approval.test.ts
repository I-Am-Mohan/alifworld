import { describe, expect, it } from 'bun:test';
import { CreateBrandSchema, UpdateBrandSchema } from '@/features/catalog/validators';

describe('brand approval contract', () => {
  it('creates unverified brands by default', () => {
    const result = CreateBrandSchema.parse({ name: 'Acme', slug: 'acme' });
    expect(result.isVerified).toBe(false);
  });

  it('requires optimistic version for brand updates', () => {
    expect(UpdateBrandSchema.safeParse({ name: 'Updated' }).success).toBe(false);
    expect(UpdateBrandSchema.safeParse({ name: 'Updated', version: 1 }).success).toBe(true);
  });
});
