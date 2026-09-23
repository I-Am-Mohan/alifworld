import { CollectionRuleSchema } from './collection';

export const CollectionType = {
  CURATED: 'CURATED',
  RULE_BASED: 'RULE_BASED',
} as const;
export type CollectionType = (typeof CollectionType)[keyof typeof CollectionType];

export const CollectionStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type CollectionStatus = (typeof CollectionStatus)[keyof typeof CollectionStatus];

export type CollectionRule = ReturnType<typeof CollectionRuleSchema.parse>;

export interface CollectionProductModel {
  id: string;
  collectionId: string;
  productId: string;
  displayOrder: number;
  createdAt: Date;
}

export interface CollectionProductSummary {
  id: string;
  title: string;
  titleBn?: string | null;
  slug: string;
  status: string;
  basePricePoisha: string;
  currency: string;
  productPoint: number;
  categoryId: string;
  brandId?: string | null;
  tags: string[];
}

export interface CollectionModel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  collectionType: CollectionType;
  rule?: CollectionRule | null;
  status: CollectionStatus;
  isActive: boolean;
  displayOrder: number;
  version: number;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  products?: CollectionProductModel[];
  productIds?: string[];
  visibleProducts?: CollectionProductSummary[];
}
