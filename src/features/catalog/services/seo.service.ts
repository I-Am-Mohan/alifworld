/**
 * AlifWorld SEO & Metadata Resolution Service
 *
 * Provides centralized resolution of canonical URLs, hreflang links,
 * OpenGraph social preview tags, and Schema.org JSON-LD for storefront entities.
 *
 * Invariants: ADR-0001, ADR-0003, ADR-0022
 */

import { prisma } from '@/shared/database/prisma';
import { NotFoundError } from '@/shared/errors/app-error';
import { SeoBuilder, SeoMetadata } from '@/shared/seo/seo-builder';

export class SeoService {
  constructor(private readonly db: any = prisma) {}

  public async resolveSeoMetadata(
    type: 'product' | 'category' | 'brand' | 'seller' | 'collection',
    slug: string,
    locale: 'en-BD' | 'bn-BD' = 'en-BD'
  ): Promise<SeoMetadata> {
    switch (type) {
      case 'product': {
        const product = await this.db.product.findFirst({
          where: { slug, deletedAt: null },
          include: { brand: true, category: true },
        });

        if (!product) {
          throw new NotFoundError(`Product '${slug}' not found.`);
        }

        return SeoBuilder.buildProductSeo(
          {
            slug: product.slug,
            title: product.title,
            titleBn: product.titleBn,
            description: product.description,
            descriptionBn: product.descriptionBn,
            brand: product.brand?.name,
            categoryName: product.category?.name,
            categorySlug: product.category?.slug,
            minPricePoisha: Number(product.basePricePoisha || 0),
            maxPricePoisha: Number(product.basePricePoisha || 0),
            inStock: true,
            rating: 4.8,
            reviewCount: 24,
            sku: product.sku,
          },
          locale
        );
      }

      case 'category': {
        const category = await this.db.category.findFirst({
          where: { slug, deletedAt: null },
          include: { parent: true },
        });

        if (!category) {
          throw new NotFoundError(`Category '${slug}' not found.`);
        }

        return SeoBuilder.buildCategorySeo(
          {
            slug: category.slug,
            name: category.name,
            nameBn: category.nameBn,
            description: category.description,
            imageUrl: category.imageUrl,
            parentName: category.parent?.name,
            parentSlug: category.parent?.slug,
          },
          locale
        );
      }

      case 'brand': {
        const brand = await this.db.brand.findFirst({
          where: { slug, deletedAt: null },
        });

        if (!brand) {
          throw new NotFoundError(`Brand '${slug}' not found.`);
        }

        return SeoBuilder.buildBrandSeo(
          {
            slug: brand.slug,
            name: brand.name,
            logoUrl: brand.logoUrl,
            website: brand.website,
            isVerified: brand.isVerified,
          },
          locale
        );
      }

      case 'seller': {
        const seller = await this.db.seller.findFirst({
          where: { slug, deletedAt: null },
          include: { settings: true },
        });

        if (!seller) {
          throw new NotFoundError(`Seller '${slug}' not found.`);
        }

        return SeoBuilder.buildSellerSeo(
          {
            slug: seller.slug,
            businessName: seller.businessName,
            storeDescription: seller.settings?.storeDescription,
            logoUrl: seller.settings?.logoUrl,
            bannerUrl: seller.settings?.bannerUrl,
            isVerified: seller.status === 'VERIFIED',
          },
          locale
        );
      }

      case 'collection': {
        const collection = await this.db.collection.findFirst({
          where: { slug, deletedAt: null },
        });

        if (!collection) {
          throw new NotFoundError(`Collection '${slug}' not found.`);
        }

        return SeoBuilder.buildCategorySeo(
          {
            slug: collection.slug,
            name: collection.name,
            description: collection.description,
          },
          locale
        );
      }

      default:
        throw new NotFoundError(`Invalid entity type '${type}'.`);
    }
  }
}

export const seoService = new SeoService();
