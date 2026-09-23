import { describe, expect, it } from 'bun:test';
import { CreateProductSchema, CreateProductVariantSchema } from '@/features/catalog/validators';
import { ProductService } from '@/features/catalog/services/product-service';

describe('Milestone 084 mandatory BDT price and Product Point', () => {
  it('requires BDT and seller-defined Product Point on product drafts', () => {
    const base = { sellerId: 'sel_01', categoryId: 'cat_01', title: 'Phone', slug: 'phone', description: 'A valid phone description.' };
    expect(CreateProductSchema.safeParse({ ...base, basePricePoisha: 1, currency: 'BDT', productPoint: 0 }).success).toBe(true);
    expect(CreateProductSchema.safeParse({ ...base, basePricePoisha: 1, productPoint: 1 }).success).toBe(false);
    expect(CreateProductSchema.safeParse({ ...base, basePricePoisha: 1, currency: 'USD', productPoint: 1 }).success).toBe(false);
  });

  it('requires Product Point on variants', () => {
    expect(CreateProductVariantSchema.safeParse({ sku: 'PHONE-RED', title: 'Red', pricePoisha: 1000000, productPoint: 100 }).success).toBe(true);
    expect(CreateProductVariantSchema.safeParse({ sku: 'PHONE-RED', title: 'Red', pricePoisha: 1000000 }).success).toBe(false);
  });

  it('keeps Product Point independent from BDT price', () => {
    const first = CreateProductSchema.safeParse({ sellerId: 'sel_01', categoryId: 'cat_01', title: 'Phone', slug: 'phone', description: 'A valid phone description.', basePricePoisha: 1000000, currency: 'BDT', productPoint: 1000 });
    const second = CreateProductSchema.safeParse({ sellerId: 'sel_01', categoryId: 'cat_01', title: 'Phone 2', slug: 'phone-2', description: 'A valid phone description.', basePricePoisha: 1000000, currency: 'BDT', productPoint: 1 });
    expect(first.success && second.success).toBe(true);
  });
});
