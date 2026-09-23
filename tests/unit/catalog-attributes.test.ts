import { describe, expect, it } from 'bun:test';
import {
  CategoryAttributeAssignmentsSchema,
  CreateCatalogAttributeSchema,
  CreateCatalogAttributeValueSchema,
  ProductOptionSetsSchema,
  VariantOptionsSchema,
} from '@/features/catalog/validators';

describe('Milestone 074 catalog attribute contracts', () => {
  it('validates governed attribute definitions and stable codes', () => {
    expect(CreateCatalogAttributeSchema.safeParse({ code: 'color', name: 'Color', inputType: 'SELECT' }).success).toBe(true);
    expect(CreateCatalogAttributeSchema.safeParse({ code: 'Color Name', name: 'Color', inputType: 'SELECT' }).success).toBe(false);
  });

  it('validates attribute values and rejects invalid codes', () => {
    expect(CreateCatalogAttributeValueSchema.safeParse({ code: 'midnight_black', label: 'Midnight Black' }).success).toBe(true);
    expect(CreateCatalogAttributeValueSchema.safeParse({ code: 'not valid', label: 'Invalid' }).success).toBe(false);
  });

  it('rejects duplicate category assignments', () => {
    const result = CategoryAttributeAssignmentsSchema.safeParse({ assignments: [{ attributeId: 'att_1' }, { attributeId: 'att_1' }] });
    expect(result.success).toBe(false);
  });

  it('requires unique product option-set attributes and values', () => {
    expect(ProductOptionSetsSchema.safeParse({ version: 1, optionSets: [{ attributeId: 'att_1', valueIds: ['avl_1', 'avl_1'] }] }).success).toBe(false);
    expect(ProductOptionSetsSchema.safeParse({ version: 1, optionSets: [{ attributeId: 'att_1', valueIds: ['avl_1'] }, { attributeId: 'att_1', valueIds: ['avl_2'] }] }).success).toBe(false);
  });

  it('rejects duplicate variant attributes and mixed value forms', () => {
    expect(VariantOptionsSchema.safeParse({ version: 1, options: [{ attributeId: 'att_1', valueId: 'avl_1' }, { attributeId: 'att_1', valueId: 'avl_2' }] }).success).toBe(false);
    expect(VariantOptionsSchema.safeParse({ version: 1, options: [{ attributeId: 'att_1', valueId: 'avl_1', textValue: 'Red' }] }).success).toBe(false);
    expect(VariantOptionsSchema.safeParse({ version: 1, options: [{ attributeId: 'att_1', valueId: 'avl_1' }, { attributeId: 'att_2', textValue: '128GB' }] }).success).toBe(true);
  });
});
