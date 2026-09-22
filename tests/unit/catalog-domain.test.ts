import { describe, expect, it } from 'bun:test';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CreateBrandSchema,
  CreateProductSchema,
  CreateProductVariantSchema,
  CreateProductMediaSchema,
} from '@/features/catalog/validators';
import { MediaType } from '@/features/catalog/types';

describe('Catalog Domain: ID Generation & Prefixes', () => {
  it('generates IDs with correct entity prefixes', () => {
    const categoryId = generatePrefixedId(ENTITY_PREFIXES.CATEGORY);
    const brandId = generatePrefixedId(ENTITY_PREFIXES.BRAND);
    const productId = generatePrefixedId(ENTITY_PREFIXES.PRODUCT);
    const variantId = generatePrefixedId(ENTITY_PREFIXES.VARIANT);
    const mediaId = generatePrefixedId(ENTITY_PREFIXES.MEDIA);

    expect(categoryId.startsWith('cat_')).toBe(true);
    expect(brandId.startsWith('brd_')).toBe(true);
    expect(productId.startsWith('prd_')).toBe(true);
    expect(variantId.startsWith('var_')).toBe(true);
    expect(mediaId.startsWith('med_')).toBe(true);
  });
});

describe('Catalog Domain: Category & Brand Schema Validation', () => {
  it('validates a valid category creation payload with NBR VAT rate', () => {
    const valid = {
      name: 'Smartphones & Tablets',
      nameBn: 'স্মার্টফোন ও ট্যাবলেট',
      slug: 'smartphones-tablets',
      description: 'Mobile cellular phones and tablet computers',
      taxRatePercent: 5.0,
      displayOrder: 1,
      isActive: true,
    };

    const result = CreateCategorySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Smartphones & Tablets');
      expect(result.data.taxRatePercent).toBe(5.0);
    }
  });

  it('rejects invalid category slugs with spaces and uppercase letters', () => {
    const invalid = {
      name: 'Smartphones',
      slug: 'Smart Phones With Spaces',
    };
    expect(CreateCategorySchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects negative or excessive VAT rates', () => {
    const negative = { name: 'Phones', slug: 'phones', taxRatePercent: -5 };
    const excessive = { name: 'Phones', slug: 'phones', taxRatePercent: 120 };

    expect(CreateCategorySchema.safeParse(negative).success).toBe(false);
    expect(CreateCategorySchema.safeParse(excessive).success).toBe(false);
  });

  it('validates brand creation schema', () => {
    const validBrand = {
      name: 'Walton',
      slug: 'walton',
      website: 'https://waltonbd.com',
      isVerified: true,
      isActive: true,
    };

    const result = CreateBrandSchema.safeParse(validBrand);
    expect(result.success).toBe(true);
  });
});

describe('Catalog Domain: Product & Variant Schemas', () => {
  it('validates product creation with integer poisha and discrete points', () => {
    const validProduct = {
      sellerId: 'sel_dhaka_tech_01',
      categoryId: 'cat_smartphones_01',
      brandId: 'brd_walton_01',
      title: 'Walton Primo S8 Pro (8GB RAM / 128GB ROM)',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো',
      slug: 'walton-primo-s8-pro',
      description: 'High performance smartphone with 64MP camera and fast charging.',
      basePricePoisha: 2199000, // ৳21,990.00
      compareAtPricePoisha: 2499000, // ৳24,990.00
      currency: 'BDT',
      productPoint: 450, // 450 discrete Points (independent of price)
      sku: 'WALT-S8PRO',
      tags: ['smartphone', 'walton'],
      taxRatePercent: 5.0,
    };

    const result = CreateProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePricePoisha).toBe(2199000);
      expect(result.data.productPoint).toBe(450);
      expect(result.data.currency).toBe('BDT');
    }
  });

  it('rejects non-positive poisha base prices', () => {
    const zeroPrice = {
      sellerId: 'sel_01',
      categoryId: 'cat_01',
      title: 'Test Product',
      slug: 'test-product',
      description: 'Test Description for zero price',
      basePricePoisha: 0,
      productPoint: 10,
    };

    const negativePrice = {
      sellerId: 'sel_01',
      categoryId: 'cat_01',
      title: 'Test Product',
      slug: 'test-product',
      description: 'Test Description for negative price',
      basePricePoisha: -100,
      productPoint: 10,
    };

    expect(CreateProductSchema.safeParse(zeroPrice).success).toBe(false);
    expect(CreateProductSchema.safeParse(negativePrice).success).toBe(false);
  });

  it('rejects negative discrete product points', () => {
    const invalidPoints = {
      sellerId: 'sel_01',
      categoryId: 'cat_01',
      title: 'Test Product',
      slug: 'test-product',
      description: 'Test Description for negative points',
      basePricePoisha: 10000,
      productPoint: -15,
    };

    expect(CreateProductSchema.safeParse(invalidPoints).success).toBe(false);
  });

  it('validates product variant schema with SKU uppercase formatting', () => {
    const validVariant = {
      sku: 'WALT-S8PRO-BLK-128',
      title: 'Midnight Black / 128GB',
      pricePoisha: 2199000,
      compareAtPricePoisha: 2499000,
      productPoint: 450,
      option1Name: 'Color',
      option1Value: 'Midnight Black',
      option2Name: 'Storage',
      option2Value: '128GB',
      isActive: true,
    };

    const result = CreateProductVariantSchema.safeParse(validVariant);
    expect(result.success).toBe(true);
  });

  it('rejects invalid variant SKUs with lowercase or special symbols', () => {
    const invalidSku = {
      sku: 'invalid sku with spaces and lowercase',
      title: 'Invalid',
      pricePoisha: 1000,
    };

    expect(CreateProductVariantSchema.safeParse(invalidSku).success).toBe(false);
  });

  it('validates product media schema', () => {
    const validMedia = {
      mediaType: MediaType.IMAGE,
      url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
      altText: 'Walton Primo S8 Pro Front View',
      isPrimary: true,
      displayOrder: 1,
    };

    const result = CreateProductMediaSchema.safeParse(validMedia);
    expect(result.success).toBe(true);
  });
});
