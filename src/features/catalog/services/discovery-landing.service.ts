/**
 * AlifWorld Discovery & Landing Page Service
 *
 * Orchestrates category breadcrumb hierarchies, brand flagship profiles,
 * and promotional collection landing pages backed by the resilient SearchService.
 *
 * References:
 * - docs/architecture/catalog-taxonomy-products-and-media.md
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0003, ADR-0022
 */

import { prisma } from '@/shared/database/prisma';
import { NotFoundError } from '@/shared/errors/app-error';
import { searchService, SearchServiceInterface } from '@/features/search';
import { SearchDocument, SearchQueryOptions, SearchFacets } from '@/features/search/types';

export interface BreadcrumbItem {
  label: string;
  slug: string;
  href: string;
}

export interface CategoryLandingResult {
  category: {
    id: string;
    name: string;
    nameBn?: string | null;
    slug: string;
    description?: string | null;
    imageUrl?: string | null;
    parentId?: string | null;
  };
  breadcrumbs: BreadcrumbItem[];
  subcategories: Array<{
    id: string;
    name: string;
    nameBn?: string | null;
    slug: string;
    imageUrl?: string | null;
  }>;
  products: SearchDocument[];
  totalHits: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: SearchFacets;
}

export interface BrandLandingResult {
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    website?: string | null;
    isVerified: boolean;
  };
  products: SearchDocument[];
  totalHits: number;
  page: number;
  limit: number;
  totalPages: number;
  facets?: SearchFacets;
}

export interface CollectionLandingResult {
  collection: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    collectionType: string;
    status: string;
  };
  products: SearchDocument[];
  totalCount: number;
}

export class DiscoveryLandingService {
  constructor(
    private readonly searchEngine: SearchServiceInterface = searchService,
    private readonly db: any = prisma
  ) {}

  /**
   * Resolves category landing details, parent breadcrumbs, and filtered search products.
   */
  public async getCategoryLanding(
    slug: string,
    options?: Partial<SearchQueryOptions>
  ): Promise<CategoryLandingResult> {
    const category = await this.db.category.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundError(`Category with slug '${slug}' not found.`);
    }

    // Resolve breadcrumbs hierarchy
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', slug: '', href: '/' },
      { label: 'Categories', slug: 'categories', href: '/categories' },
    ];

    if (category.parent) {
      breadcrumbs.push({
        label: category.parent.name,
        slug: category.parent.slug,
        href: `/categories/${category.parent.slug}`,
      });
    }

    breadcrumbs.push({
      label: category.name,
      slug: category.slug,
      href: `/categories/${category.slug}`,
    });

    // Query products belonging to category
    const searchResponse = await this.searchEngine.search({
      query: options?.query || '',
      categorySlug: slug,
      brand: options?.brand,
      brands: options?.brands,
      minPricePoisha: options?.minPricePoisha,
      maxPricePoisha: options?.maxPricePoisha,
      minRating: options?.minRating,
      minPoints: options?.minPoints,
      inStockOnly: options?.inStockOnly,
      sortBy: options?.sortBy || 'relevance',
      page: options?.page || 1,
      limit: options?.limit || 20,
    });

    return {
      category: {
        id: category.id,
        name: category.name,
        nameBn: category.nameBn,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        parentId: category.parentId,
      },
      breadcrumbs,
      subcategories: (category.children || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        nameBn: c.nameBn,
        slug: c.slug,
        imageUrl: c.imageUrl,
      })),
      products: searchResponse.hits,
      totalHits: searchResponse.totalHits,
      page: searchResponse.page,
      limit: searchResponse.limit,
      totalPages: searchResponse.totalPages,
      facets: searchResponse.facets,
    };
  }

  /**
   * Resolves brand landing page, verification status, and brand product catalog.
   */
  public async getBrandLanding(
    slug: string,
    options?: Partial<SearchQueryOptions>
  ): Promise<BrandLandingResult> {
    const brand = await this.db.brand.findFirst({
      where: { slug, deletedAt: null, isActive: true },
    });

    if (!brand) {
      throw new NotFoundError(`Brand with slug '${slug}' not found.`);
    }

    // Query products by brand name
    const searchResponse = await this.searchEngine.search({
      query: options?.query || '',
      brand: brand.name,
      categorySlug: options?.categorySlug,
      minPricePoisha: options?.minPricePoisha,
      maxPricePoisha: options?.maxPricePoisha,
      minRating: options?.minRating,
      minPoints: options?.minPoints,
      inStockOnly: options?.inStockOnly,
      sortBy: options?.sortBy || 'relevance',
      page: options?.page || 1,
      limit: options?.limit || 20,
    });

    return {
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logoUrl: brand.logoUrl,
        website: brand.website,
        isVerified: brand.isVerified,
      },
      products: searchResponse.hits,
      totalHits: searchResponse.totalHits,
      page: searchResponse.page,
      limit: searchResponse.limit,
      totalPages: searchResponse.totalPages,
      facets: searchResponse.facets,
    };
  }

  /**
   * Resolves curated promotional collection landing page with member products.
   */
  public async getCollectionLanding(
    slug: string,
    options?: Partial<SearchQueryOptions>
  ): Promise<CollectionLandingResult> {
    const collection = await this.db.collection.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      include: {
        products: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
                seller: { include: { profile: true } },
                variants: { include: { stockBalances: true } },
              },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!collection) {
      throw new NotFoundError(`Collection with slug '${slug}' not found.`);
    }

    const products: SearchDocument[] = (collection.products || [])
      .map((cp: any) => cp.product)
      .filter((p: any) => p && p.status === 'PUBLISHED' && !p.deletedAt)
      .map((p: any) => {
        const basePrice = Number(p.basePricePoisha || 0);
        let inStock = false;
        if (p.variants) {
          for (const v of p.variants) {
            if (v.stockBalances) {
              for (const sb of v.stockBalances) {
                if ((sb.onHand || 0) - (sb.reserved || 0) > 0) inStock = true;
              }
            }
          }
        }

        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          titleBn: p.titleBn,
          description: p.description,
          descriptionBn: p.descriptionBn,
          brand: p.brand?.name || null,
          categoryName: p.category?.name || null,
          categorySlug: p.category?.slug || null,
          sellerId: p.sellerId,
          sellerName: p.seller?.profile?.storeName || null,
          minPricePoisha: basePrice,
          maxPricePoisha: basePrice,
          currency: 'BDT' as const,
          productPointSnapshot: p.productPoint || 0,
          inStock,
          tags: p.tags || [],
          rating: 4.8,
          reviewCount: 25,
          isPublished: true,
          createdAt: p.createdAt?.toISOString?.() || new Date().toISOString(),
          updatedAt: p.updatedAt?.toISOString?.() || new Date().toISOString(),
        };
      });

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        collectionType: collection.collectionType,
        status: collection.status,
      },
      products,
      totalCount: products.length,
    };
  }
}

export const discoveryLandingService = new DiscoveryLandingService();
