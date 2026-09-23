import { describe, expect, test } from 'bun:test';
import { CollectionRuleSchema, CreateCollectionSchema, UpdateCollectionSchema } from '../../src/features/catalog/collection';

const validRule = { categoryId: 'cat_example', minPricePoisha: 100, maxPricePoisha: 1000 };

describe('collection contracts', () => {
  test('requires rules for rule-based collections and rejects rules for curated collections', () => {
    expect(CreateCollectionSchema.safeParse({ name: 'Deals', slug: 'deals', collectionType: 'RULE_BASED', rule: validRule }).success).toBe(true);
    expect(CreateCollectionSchema.safeParse({ name: 'Deals', slug: 'deals', collectionType: 'RULE_BASED' }).success).toBe(false);
    expect(CreateCollectionSchema.safeParse({ name: 'Deals', slug: 'deals', collectionType: 'CURATED', rule: validRule }).success).toBe(false);
  });

  test('rejects unbounded or invalid price rules', () => {
    expect(CollectionRuleSchema.safeParse({ minPricePoisha: 200, maxPricePoisha: 100 }).success).toBe(false);
    expect(CollectionRuleSchema.safeParse({ arbitraryWhere: { status: 'PUBLISHED' } }).success).toBe(false);
  });

  test('requires optimistic version for updates', () => {
    expect(UpdateCollectionSchema.safeParse({ name: 'Updated' }).success).toBe(false);
    expect(UpdateCollectionSchema.safeParse({ name: 'Updated', version: 2 }).success).toBe(true);
  });
});
