/**
 * Catalog & Product Domain Types
 */

import { Poisha, ProductPoint } from '@/shared/types/domain-terms';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface Category {
  readonly id: string;
  readonly nameEn: string;
  readonly nameBn: string;
  readonly slug: string;
  readonly parentId?: string;
  readonly displayOrder: number;
}

export interface ProductSummary {
  readonly id: string;
  readonly sellerId: string;
  readonly titleEn: string;
  readonly titleBn: string;
  readonly slug: string;
  readonly pricePoisha: Poisha;
  readonly productPoints: ProductPoint;
  readonly status: ProductStatus;
  readonly primaryImageUrl: string;
}
