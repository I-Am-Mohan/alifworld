import { describe, expect, it } from 'bun:test';
import { CreateCategorySchema, UpdateCategorySchema } from '@/features/catalog/validators';

describe('hierarchical category contracts', () => {
  it('validates normalized slugs and optional parents', () => {
    expect(CreateCategorySchema.safeParse({ name: 'Electronics', slug: 'electronics', parentId: null }).success).toBe(true);
    expect(CreateCategorySchema.safeParse({ name: 'Bad', slug: 'Bad Slug' }).success).toBe(false);
  });

  it('requires optimistic version for category updates', () => {
    expect(UpdateCategorySchema.safeParse({ name: 'Updated' }).success).toBe(false);
    expect(UpdateCategorySchema.safeParse({ name: 'Updated', version: 1 }).success).toBe(true);
  });
});
