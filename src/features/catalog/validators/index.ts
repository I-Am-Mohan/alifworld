/**
 * AlifWorld Catalog & Taxonomy Zod Validators
 * 
 * Strict runtime validation for categories, brands, products, variants,
 * media, poisha integer currencies, and discrete Product Points.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0005, ADR-0016, ADR-0022, ADR-0025
 */

import { z } from 'zod';
import { ProductStatus, MediaType } from '../types';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_REGEX = /^[A-Z0-9_-]{3,50}$/;

export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
  nameBn: z.string().max(150).optional().nullable(),
  slug: z.string().min(2).max(100).regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(1000).optional().nullable(),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().url('Invalid image URL').optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  taxRatePercent: z.number().min(0).max(100).default(0.0), // NBR standard or reduced rate
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

export const CreateBrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(100).regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens'),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  website: z.string().url('Invalid website URL').optional().nullable(),
  isVerified: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;

export const UpdateBrandSchema = CreateBrandSchema.partial().extend({
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
});

export type UpdateBrandInput = z.infer<typeof UpdateBrandSchema>;

export const CreateProductVariantSchema = z.object({
  sku: z.string().regex(SKU_REGEX, 'SKU must be uppercase alphanumeric with dashes/underscores (3-50 chars)'),
  title: z.string().min(1, 'Variant title is required').max(150),
  pricePoisha: z.coerce.number().int().min(1, 'Price must be at least 1 poisha (0.01 BDT)'),
  compareAtPricePoisha: z.coerce.number().int().min(1).optional().nullable(),
  productPoint: z.number().int().min(0, 'Product points must be zero or positive integer').optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  weightGrams: z.number().int().min(0).optional().nullable(),
  option1Name: z.string().max(50).optional().nullable(),
  option1Value: z.string().max(100).optional().nullable(),
  option2Name: z.string().max(50).optional().nullable(),
  option2Value: z.string().max(100).optional().nullable(),
  option3Name: z.string().max(50).optional().nullable(),
  option3Value: z.string().max(100).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

export type CreateProductVariantInput = z.infer<typeof CreateProductVariantSchema>;

export const CreateProductMediaSchema = z.object({
  mediaType: z.nativeEnum(MediaType).default(MediaType.IMAGE),
  url: z.string().min(5, 'Media URL or storage key is required'),
  altText: z.string().max(255).optional().nullable(),
  altTextBn: z.string().max(255).optional().nullable(),
  isPrimary: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  fileSize: z.number().int().min(1).optional().nullable(),
  mimeType: z.string().max(100).optional().nullable(),
  width: z.number().int().min(1).optional().nullable(),
  height: z.number().int().min(1).optional().nullable(),
});

export type CreateProductMediaInput = z.infer<typeof CreateProductMediaSchema>;

export const CreateProductSchema = z.object({
  sellerId: z.string().min(4, 'Seller tenant ID is required'),
  categoryId: z.string().min(4, 'Category ID is required'),
  brandId: z.string().optional().nullable(),
  title: z.string().min(3, 'Product title must be at least 3 characters').max(200),
  titleBn: z.string().max(250).optional().nullable(),
  slug: z.string().min(3).max(200).regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  descriptionBn: z.string().optional().nullable(),
  basePricePoisha: z.coerce.number().int().min(1, 'Base price must be at least 1 poisha (0.01 BDT)'),
  compareAtPricePoisha: z.coerce.number().int().min(1).optional().nullable(),
  currency: z.string().default('BDT'),
  productPoint: z.number().int().min(0, 'Product points must be zero or positive integer').default(0),
  sku: z.string().max(50).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  isPhysical: z.boolean().default(true),
  weightGrams: z.number().int().min(0).optional().nullable(),
  warranty: z.string().max(100).optional().nullable(),
  tags: z.array(z.string().max(50)).default([]),
  taxRatePercent: z.number().min(0).max(100).optional().nullable(),
  variants: z.array(CreateProductVariantSchema).optional(),
  media: z.array(CreateProductMediaSchema).optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
  status: z.nativeEnum(ProductStatus).optional(),
});

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const PublishProductSchema = z.object({
  productId: z.string().min(4),
  version: z.number().int().min(1),
});

export type PublishProductInput = z.infer<typeof PublishProductSchema>;

const CODE_REGEX = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export const CreateCatalogAttributeSchema = z.object({
  code: z.string().trim().toLowerCase().min(2).max(60).regex(CODE_REGEX),
  name: z.string().trim().min(2).max(100),
  nameBn: z.string().trim().max(150).optional().nullable(),
  inputType: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'COLOR']),
  isFilterable: z.boolean().default(false),
  isComparable: z.boolean().default(false),
  isVariantAllowed: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CreateCatalogAttributeInput = z.infer<typeof CreateCatalogAttributeSchema>;

export const UpdateCatalogAttributeSchema = CreateCatalogAttributeSchema.partial().extend({ version: z.number().int().positive() });
export type UpdateCatalogAttributeInput = z.infer<typeof UpdateCatalogAttributeSchema>;

export const CreateCatalogAttributeValueSchema = z.object({
  code: z.string().trim().toLowerCase().min(1).max(60).regex(CODE_REGEX),
  label: z.string().trim().min(1).max(100),
  labelBn: z.string().trim().max(150).optional().nullable(),
  swatch: z.string().trim().max(30).optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CreateCatalogAttributeValueInput = z.infer<typeof CreateCatalogAttributeValueSchema>;

export const UpdateCatalogAttributeValueSchema = CreateCatalogAttributeValueSchema.partial().extend({ version: z.number().int().positive() });
export type UpdateCatalogAttributeValueInput = z.infer<typeof UpdateCatalogAttributeValueSchema>;

export const CategoryAttributeAssignmentSchema = z.object({
  attributeId: z.string().min(4),
  isRequired: z.boolean().default(false),
  isVariantDefining: z.boolean().default(false),
  filterableOverride: z.boolean().nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
});
export const CategoryAttributeAssignmentsSchema = z.object({ assignments: z.array(CategoryAttributeAssignmentSchema).max(100) }).superRefine((input, ctx) => {
  const ids = input.assignments.map((assignment) => assignment.attributeId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['assignments'], message: 'Category attributes must be unique.' });
});
export type CategoryAttributeAssignmentInput = z.infer<typeof CategoryAttributeAssignmentSchema>;

export const ProductOptionSetSchema = z.object({
  attributeId: z.string().min(4),
  valueIds: z.array(z.string().min(4)).min(1).max(100).refine((values) => new Set(values).size === values.length, 'Option values must be unique.'),
  isRequired: z.boolean().default(false),
  isVariantDefining: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
});
export const ProductOptionSetsSchema = z.object({ version: z.number().int().positive(), optionSets: z.array(ProductOptionSetSchema).max(20) }).superRefine((input, ctx) => {
  const ids = input.optionSets.map((optionSet) => optionSet.attributeId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['optionSets'], message: 'Product option-set attributes must be unique.' });
});
export type ProductOptionSetsInput = z.infer<typeof ProductOptionSetsSchema>;

export const VariantOptionsSchema = z.object({
  version: z.number().int().positive(),
  options: z.array(z.object({ attributeId: z.string().min(4), valueId: z.string().min(4).optional(), textValue: z.string().trim().max(200).optional(), displayOrder: z.number().int().min(0).default(0) })).max(20),
}).superRefine((input, ctx) => {
  const ids = input.options.map((option) => option.attributeId);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'A variant cannot contain duplicate attributes.' });
  input.options.forEach((option, index) => {
    if (!option.valueId && !option.textValue) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', index], message: 'Each option requires a governed value or text value.' });
    if (option.valueId && option.textValue) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options', index], message: 'An option cannot contain both a governed value and text value.' });
  });
});
export type VariantOptionsInput = z.infer<typeof VariantOptionsSchema>;
