import { describe, expect, it } from 'bun:test';
import { CreateProductSchema } from '@/features/catalog/validators';

describe('Milestone 087 product shipping attributes', () => {
  it('accepts dimensions, weight, shipping class, and required-shipping flag', () => {
    const result = CreateProductSchema.safeParse({ sellerId: 'sel_01', categoryId: 'cat_01', title: 'Phone', slug: 'phone', description: 'A valid phone description.', basePricePoisha: 1000000, currency: 'BDT', productPoint: 100, weightGrams: 180, lengthMm: 150, widthMm: 75, heightMm: 8, shippingClass: 'STANDARD', requiresShipping: true });
    expect(result.success).toBe(true);
  });

  it('rejects negative physical measurements', () => {
    const result = CreateProductSchema.safeParse({ sellerId: 'sel_01', categoryId: 'cat_01', title: 'Phone', slug: 'phone', description: 'A valid phone description.', basePricePoisha: 1000000, currency: 'BDT', productPoint: 100, weightGrams: -1, lengthMm: -10 });
    expect(result.success).toBe(false);
  });
});
