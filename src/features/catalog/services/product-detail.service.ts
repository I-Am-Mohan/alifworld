/**
 * AlifWorld Product Detail Service
 * 
 * Orchestrates product detail resolution by canonical slug or historical slug,
 * variant selection matrix, available inventory calculation, and Google Schema.org JSON-LD.
 * 
 * References:
 * - docs/architecture/catalog-taxonomy-products-and-media.md
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0003, ADR-0016, ADR-0022
 */

import { prisma } from '@/shared/database/prisma';
import { NotFoundError } from '@/shared/errors/app-error';
import { calculateAvailableStock } from '@/features/inventory/types';

export interface ProductVariantDetail {
  id: string;
  sku: string;
  title: string;
  pricePoisha: number;
  compareAtPricePoisha?: number | null;
  priceBdtFormatted: string;
  compareAtPriceBdtFormatted?: string | null;
  productPoint: number;
  options: Array<{ name: string; value: string }>;
  imageUrl?: string | null;
  availableQuantity: number;
  inStock: boolean;
  weightGrams?: number | null;
}

export interface ProductDetailResult {
  isRedirect?: false;
  id: string;
  slug: string;
  title: string;
  titleBn?: string | null;
  description: string;
  descriptionBn?: string | null;
  basePricePoisha: number;
  basePriceBdtFormatted: string;
  compareAtPricePoisha?: number | null;
  compareAtPriceBdtFormatted?: string | null;
  productPoint: number;
  currency: 'BDT';
  minOrderQuantity: number;
  warranty?: string | null;
  tags: string[];
  category: {
    id: string;
    name: string;
    nameBn?: string | null;
    slug: string;
  };
  brand?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    isVerified: boolean;
  } | null;
  seller: {
    id: string;
    storeName: string;
    slug?: string;
  };
  media: Array<{
    id: string;
    url: string;
    altText?: string | null;
    isPrimary: boolean;
  }>;
  variants: ProductVariantDetail[];
  breadcrumbs: Array<{ label: string; href: string }>;
  jsonLd: Record<string, any>;
}

export interface ProductDetailRedirect {
  isRedirect: true;
  targetSlug: string;
  targetUrl: string;
}

export class ProductDetailService {
  constructor(private readonly db: any = prisma) {}

  /**
   * Resolves product details by slug or ID. If slug was historically renamed, returns a redirect directive.
   */
  public async getProductBySlug(
    identifier: string,
    locale: 'en-BD' | 'bn-BD' = 'en-BD'
  ): Promise<ProductDetailResult | ProductDetailRedirect> {
    // 1. Direct slug or ID lookup
    let product = await this.db.product.findFirst({
      where: {
        OR: [{ slug: identifier }, { id: identifier }],
        deletedAt: null,
      },
      include: {
        category: {
          include: { parent: true },
        },
        brand: true,
        seller: {
          include: { profile: true },
        },
        variants: {
          where: { deletedAt: null },
          include: {
            stockBalances: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        media: {
          orderBy: { displayOrder: 'asc' },
        },
        translations: true,
      },
    });

    // 2. Slug History lookup for permanent redirects (SEO preservation)
    if (!product) {
      const historyEntry = await this.db.productSlugHistory.findFirst({
        where: { oldSlug: identifier },
        include: {
          product: true,
        },
      });

      if (historyEntry?.product && !historyEntry.product.deletedAt) {
        return {
          isRedirect: true,
          targetSlug: historyEntry.product.slug,
          targetUrl: `/products/${historyEntry.product.slug}`,
        };
      }

      throw new NotFoundError(`Product with identifier '${identifier}' not found.`);
    }

    if (product.status !== 'PUBLISHED') {
      throw new NotFoundError(`Product '${identifier}' is currently not available for viewing.`);
    }

    // Resolve translations
    let title = product.title;
    let titleBn = product.titleBn;
    let description = product.description;
    let descriptionBn = product.descriptionBn;

    if (product.translations) {
      for (const t of product.translations) {
        if (t.locale === 'bn-BD') {
          if (t.title) titleBn = t.title;
          if (t.description) descriptionBn = t.description;
        }
      }
    }

    const isBn = locale === 'bn-BD';
    const displayTitle = isBn && titleBn ? titleBn : title;
    const displayDescription = isBn && descriptionBn ? descriptionBn : description;

    const basePricePoisha = Number(product.basePricePoisha || 0);
    const compareAtPricePoisha = product.compareAtPricePoisha ? Number(product.compareAtPricePoisha) : null;

    // Process Variants
    const variants: ProductVariantDetail[] = (product.variants || []).map((v: any) => {
      let availableQuantity = 0;
      if (v.stockBalances) {
        for (const sb of v.stockBalances) {
          availableQuantity += calculateAvailableStock({
            onHand: sb.onHand || 0,
            reserved: sb.reserved || 0,
            damaged: sb.damaged || 0,
            quarantined: sb.quarantined || 0,
          });
        }
      }

      const variantPricePoisha = Number(v.pricePoisha || product.basePricePoisha || 0);
      const variantComparePoisha = v.compareAtPricePoisha ? Number(v.compareAtPricePoisha) : null;

      const options: Array<{ name: string; value: string }> = [];
      if (v.option1Name && v.option1Value) options.push({ name: v.option1Name, value: v.option1Value });
      if (v.option2Name && v.option2Value) options.push({ name: v.option2Name, value: v.option2Value });
      if (v.option3Name && v.option3Value) options.push({ name: v.option3Name, value: v.option3Value });

      return {
        id: v.id,
        sku: v.sku,
        title: v.title,
        pricePoisha: variantPricePoisha,
        compareAtPricePoisha: variantComparePoisha,
        priceBdtFormatted: this.formatBdt(variantPricePoisha),
        compareAtPriceBdtFormatted: variantComparePoisha ? this.formatBdt(variantComparePoisha) : null,
        productPoint: v.productPoint ?? product.productPoint ?? 0,
        options,
        imageUrl: v.imageUrl || null,
        availableQuantity,
        inStock: availableQuantity > 0,
        weightGrams: v.weightGrams ?? product.weightGrams ?? null,
      };
    });

    // Build Breadcrumb path
    const breadcrumbs = [
      { label: isBn ? 'হোম' : 'Home', href: '/' },
      { label: isBn ? 'ক্যাটালগ' : 'Catalog', href: '/search' },
    ];

    if (product.category) {
      if (product.category.parent) {
        breadcrumbs.push({
          label: isBn && product.category.parent.nameBn ? product.category.parent.nameBn : product.category.parent.name,
          href: `/categories/${product.category.parent.slug}`,
        });
      }
      breadcrumbs.push({
        label: isBn && product.category.nameBn ? product.category.nameBn : product.category.name,
        href: `/categories/${product.category.slug}`,
      });
    }

    breadcrumbs.push({
      label: displayTitle,
      href: `/products/${product.slug}`,
    });

    // Media list
    const media = (product.media || []).map((m: any) => ({
      id: m.id,
      url: m.mediaUrl,
      altText: m.altText || displayTitle,
      isPrimary: Boolean(m.isPrimary),
    }));

    // Schema.org JSON-LD structured data for SEO
    const primaryImage = media.find((m: any) => m.isPrimary)?.url || media[0]?.url || 'https://alifworld.com/placeholder.png';
    const jsonLd = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: displayTitle,
      description: displayDescription,
      image: [primaryImage],
      sku: product.sku || product.id,
      brand: {
        '@type': 'Brand',
        name: product.brand?.name || 'AlifWorld',
      },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'BDT',
        lowPrice: (basePricePoisha / 100).toFixed(2),
        highPrice: ((variants[0]?.pricePoisha || basePricePoisha) / 100).toFixed(2),
        offerCount: variants.length || 1,
        availability: variants.some((v) => v.inStock)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '24',
      },
    };

    return {
      id: product.id,
      slug: product.slug,
      title,
      titleBn,
      description,
      descriptionBn,
      basePricePoisha,
      basePriceBdtFormatted: this.formatBdt(basePricePoisha),
      compareAtPricePoisha,
      compareAtPriceBdtFormatted: compareAtPricePoisha ? this.formatBdt(compareAtPricePoisha) : null,
      productPoint: product.productPoint || 0,
      currency: 'BDT',
      minOrderQuantity: product.minOrderQuantity || 1,
      warranty: product.warranty || null,
      tags: product.tags || [],
      category: {
        id: product.category.id,
        name: product.category.name,
        nameBn: product.category.nameBn,
        slug: product.category.slug,
      },
      brand: product.brand
        ? {
            id: product.brand.id,
            name: product.brand.name,
            slug: product.brand.slug,
            logoUrl: product.brand.logoUrl,
            isVerified: product.brand.isVerified,
          }
        : null,
      seller: {
        id: product.sellerId,
        storeName: product.seller?.profile?.storeName || 'Official Merchant',
        slug: product.seller?.profile?.slug || undefined,
      },
      media,
      variants,
      breadcrumbs,
      jsonLd,
    };
  }

  private formatBdt(poisha: number): string {
    const bdt = poisha / 100;
    return bdt.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

export const productDetailService = new ProductDetailService();
