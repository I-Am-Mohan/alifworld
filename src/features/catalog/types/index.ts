/**
 * AlifWorld Catalog & Taxonomy Domain Types
 * 
 * Defines type contracts for categories, approved brands, products,
 * variants, media assets, tax rules, and pricing snapshots.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0005, ADR-0014, ADR-0022, ADR-0025
 */

export const ProductStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const MediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export interface CategoryModel {
  id: string;
  name: string;
  nameBn?: string | null;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  icon?: string | null;
  displayOrder: number;
  isActive: boolean;
  taxRatePercent: number; // e.g. 5.00, 15.00
  version: number;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  parent?: CategoryModel | null;
  children?: CategoryModel[];
}

export interface BrandModel {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  website?: string | null;
  isVerified: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  isActive: boolean;
  version: number;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CatalogAttributeInputType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'COLOR';

export interface CatalogAttributeModel {
  id: string;
  code: string;
  name: string;
  nameBn?: string | null;
  inputType: CatalogAttributeInputType;
  isFilterable: boolean;
  isComparable: boolean;
  isVariantAllowed: boolean;
  displayOrder: number;
  isActive: boolean;
  version: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogAttributeValueModel {
  id: string;
  attributeId: string;
  code: string;
  label: string;
  labelBn?: string | null;
  swatch?: string | null;
  displayOrder: number;
  isActive: boolean;
  version: number;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryAttributeModel {
  id: string;
  categoryId: string;
  attributeId: string;
  isRequired: boolean;
  isVariantDefining: boolean;
  filterableOverride?: boolean | null;
  displayOrder: number;
  version: number;
  attribute?: CatalogAttributeModel;
}

export interface ProductOptionSetModel {
  id: string;
  productId: string;
  attributeId: string;
  isRequired: boolean;
  isVariantDefining: boolean;
  displayOrder: number;
  version: number;
  valueIds: string[];
}

export interface ProductVariantOptionModel {
  id: string;
  variantId: string;
  attributeId: string;
  valueId?: string | null;
  textValue?: string | null;
  displayOrder: number;
}

export interface ProductVariantModel {
  id: string;
  productId: string;
  sku: string;
  title: string;
  pricePoisha: bigint | number; // Stored in integer poisha (1 BDT = 100 poisha)
  compareAtPricePoisha?: bigint | number | null;
  productPoint?: number | null; // Optional variant points override
  barcode?: string | null;
  weightGrams?: number | null;
  option1Name?: string | null; // e.g. "Color"
  option1Value?: string | null; // e.g. "Space Gray"
  option2Name?: string | null; // e.g. "Storage"
  option2Value?: string | null; // e.g. "256GB"
  option3Name?: string | null;
  option3Value?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
  version: number;
  options?: ProductVariantOptionModel[];
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMediaModel {
  id: string;
  productId: string;
  mediaType: MediaType;
  url: string;
  altText?: string | null;
  altTextBn?: string | null;
  isPrimary: boolean;
  displayOrder: number;
  fileSize?: number | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSlugHistoryModel {
  id: string;
  productId: string;
  oldSlug: string;
  createdAt: Date;
}

export interface ProductModel {
  id: string;
  sellerId: string;
  categoryId: string;
  brandId?: string | null;
  title: string;
  titleBn?: string | null;
  slug: string;
  description: string;
  descriptionBn?: string | null;
  status: ProductStatus;
  basePricePoisha: bigint | number; // Stored in integer poisha (1 BDT = 100 poisha)
  compareAtPricePoisha?: bigint | number | null;
  currency: string;
  productPoint: number; // Discrete integer Product Points (independent from price!)
  sku?: string | null;
  barcode?: string | null;
  isPhysical: boolean;
  weightGrams?: number | null;
  warranty?: string | null;
  tags: string[];
  taxRatePercent?: number | null; // Overrides category tax rate if present
  version: number;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariantModel[];
  media?: ProductMediaModel[];
  category?: CategoryModel;
  brand?: BrandModel | null;
}

export interface TaxRule {
  id: string;
  jurisdiction: 'BD';
  categoryId?: string;
  name: string;
  standardRatePercent: number; // e.g. 15.00 standard, 5.00 for ICT hardware, 0.00 for exempt
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  description: string;
}

export interface TaxCalculationBreakdown {
  lineItemId?: string;
  title: string;
  netPricePoisha: bigint;
  taxRatePercent: number;
  taxAmountPoisha: bigint;
  grossPricePoisha: bigint;
}

export interface TaxSnapshot {
  jurisdiction: 'BD';
  effectiveDate: string; // ISO date
  totalNetPoisha: bigint;
  totalTaxPoisha: bigint;
  totalGrossPoisha: bigint;
  lines: TaxCalculationBreakdown[];
}
