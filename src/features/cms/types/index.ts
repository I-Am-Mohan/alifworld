/**
 * AlifWorld CMS Domain Types & Contracts
 * 
 * Defines type contracts for storefront homepage layout, hero banners,
 * feature highlight blocks, and dynamic category/brand showcases.
 * 
 * Invariants: ADR-0001, ADR-0003, ADR-0022
 */

export interface HeroBanner {
  id: string;
  title: string;
  titleBn?: string | null;
  subtitle?: string | null;
  subtitleBn?: string | null;
  imageUrl: string;
  ctaText: string;
  ctaTextBn?: string | null;
  ctaLink: string;
  badgeText?: string | null;
  badgeTextBn?: string | null;
  bgColor?: string | null;
  order: number;
  isActive: boolean;
}

export type HomeSectionType =
  | 'HERO_CAROUSEL'
  | 'FEATURE_HIGHLIGHTS'
  | 'FEATURED_CATEGORIES'
  | 'FLASH_SALE'
  | 'SPECIAL_REWARDS'
  | 'BRAND_SHOWCASE'
  | 'PROMO_BANNER';

export interface HomeSection {
  id: string;
  type: HomeSectionType;
  title: string;
  titleBn?: string | null;
  subtitle?: string | null;
  subtitleBn?: string | null;
  order: number;
  isActive: boolean;
  data: Record<string, any>;
}

export interface HomepageLayout {
  id: string;
  slug: 'storefront-home';
  contentType: 'HOMEPAGE_LAYOUT';
  version: number;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  sections: HomeSection[];
  publishedAt?: string | null;
  updatedAt: string;
}

export interface LocalizedHomeSection {
  id: string;
  type: HomeSectionType;
  title: string;
  subtitle?: string | null;
  order: number;
  isActive: boolean;
  data: Record<string, any>;
}

export interface LocalizedHomepage {
  slug: string;
  locale: 'en-BD' | 'bn-BD';
  version: number;
  sections: LocalizedHomeSection[];
  updatedAt: string;
}
