/**
 * AlifWorld Centralized SEO & Structured Data Builder
 *
 * Generates canonical URLs, hreflang alternates (en-BD, bn-BD), OpenGraph / Twitter
 * social cards, and Schema.org JSON-LD structured data for Google rich snippets.
 *
 * References:
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * - docs/architecture/continuous-integration-and-quality-gates.md
 * Invariants: ADR-0001, ADR-0003, ADR-0022
 */

import type { Metadata } from 'next';

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://alifworld.com';

export interface SeoImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  hreflang: {
    'en-BD': string;
    'bn-BD': string;
    'x-default': string;
  };
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    locale: string;
    alternateLocales: string[];
    type: 'website' | 'article' | 'product';
    images: SeoImage[];
  };
  twitter: {
    card: 'summary_large_image' | 'summary';
    site: string;
    creator: string;
    title: string;
    description: string;
    images: string[];
  };
  jsonLd: Record<string, any>;
}

export class SeoBuilder {
  /**
   * Generates SEO metadata for a Product Detail Page (PDP).
   */
  public static buildProductSeo(
    product: {
      slug: string;
      title: string;
      titleBn?: string | null;
      description?: string | null;
      descriptionBn?: string | null;
      brand?: string | null;
      categoryName?: string | null;
      categorySlug?: string | null;
      minPricePoisha: number;
      maxPricePoisha: number;
      inStock: boolean;
      imageUrl?: string | null;
      rating?: number | null;
      reviewCount?: number | null;
      sku?: string | null;
    },
    locale: 'en-BD' | 'bn-BD' = 'en-BD'
  ): SeoMetadata {
    const isBn = locale === 'bn-BD';
    const title = isBn && product.titleBn ? product.titleBn : product.title;
    const description =
      isBn && product.descriptionBn
        ? product.descriptionBn
        : product.description ||
          'Verified authentic product on AlifWorld with nationwide delivery across Bangladesh.';

    const pageTitle = `${title} | AlifWorld Bangladesh`;
    const canonicalPath = `/products/${product.slug}`;
    const canonicalUrl = `${APP_BASE_URL}${canonicalPath}`;

    const imageUrl = product.imageUrl || `${APP_BASE_URL}/images/og-product-default.jpg`;
    const priceBdt = (product.minPricePoisha / 100).toFixed(2);

    const jsonLd = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: title,
      description,
      image: [imageUrl],
      sku: product.sku || product.slug,
      brand: {
        '@type': 'Brand',
        name: product.brand || 'AlifWorld',
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'BDT',
        price: priceBdt,
        availability: product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: canonicalUrl,
        seller: {
          '@type': 'Organization',
          name: 'AlifWorld Bangladesh',
        },
      },
      ...(product.rating
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.rating.toString(),
              reviewCount: (product.reviewCount || 1).toString(),
            },
          }
        : {}),
    };

    return {
      title: pageTitle,
      description,
      canonicalUrl,
      hreflang: {
        'en-BD': canonicalUrl,
        'bn-BD': `${canonicalUrl}?locale=bn-BD`,
        'x-default': canonicalUrl,
      },
      openGraph: {
        title: pageTitle,
        description,
        url: canonicalUrl,
        siteName: 'AlifWorld Bangladesh',
        locale: isBn ? 'bn_BD' : 'en_BD',
        alternateLocales: isBn ? ['en_BD'] : ['bn_BD'],
        type: 'product',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@alifworldbd',
        creator: '@alifworldbd',
        title: pageTitle,
        description,
        images: [imageUrl],
      },
      jsonLd,
    };
  }

  /**
   * Generates SEO metadata for a Category Landing Page.
   */
  public static buildCategorySeo(
    category: {
      slug: string;
      name: string;
      nameBn?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      parentName?: string | null;
      parentSlug?: string | null;
    },
    locale: 'en-BD' | 'bn-BD' = 'en-BD'
  ): SeoMetadata {
    const isBn = locale === 'bn-BD';
    const name = isBn && category.nameBn ? category.nameBn : category.name;
    const description =
      category.description ||
      `Shop top authentic ${name} online in Bangladesh with express doorstep delivery on AlifWorld.`;

    const pageTitle = `${name} Collection | AlifWorld Bangladesh`;
    const canonicalPath = `/categories/${category.slug}`;
    const canonicalUrl = `${APP_BASE_URL}${canonicalPath}`;
    const imageUrl = category.imageUrl || `${APP_BASE_URL}/images/og-category-default.jpg`;

    const breadcrumbs = [
      { name: 'Home', item: APP_BASE_URL },
      { name: 'Categories', item: `${APP_BASE_URL}/categories` },
    ];

    if (category.parentName && category.parentSlug) {
      breadcrumbs.push({
        name: category.parentName,
        item: `${APP_BASE_URL}/categories/${category.parentSlug}`,
      });
    }

    breadcrumbs.push({ name, item: canonicalUrl });

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      description,
      url: canonicalUrl,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: crumb.name,
          item: crumb.item,
        })),
      },
    };

    return {
      title: pageTitle,
      description,
      canonicalUrl,
      hreflang: {
        'en-BD': canonicalUrl,
        'bn-BD': `${canonicalUrl}?locale=bn-BD`,
        'x-default': canonicalUrl,
      },
      openGraph: {
        title: pageTitle,
        description,
        url: canonicalUrl,
        siteName: 'AlifWorld Bangladesh',
        locale: isBn ? 'bn_BD' : 'en_BD',
        alternateLocales: isBn ? ['en_BD'] : ['bn_BD'],
        type: 'website',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: name }],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@alifworldbd',
        creator: '@alifworldbd',
        title: pageTitle,
        description,
        images: [imageUrl],
      },
      jsonLd,
    };
  }

  /**
   * Generates SEO metadata for a Brand Flagship Landing Page.
   */
  public static buildBrandSeo(
    brand: {
      slug: string;
      name: string;
      logoUrl?: string | null;
      website?: string | null;
      isVerified: boolean;
    },
    locale: 'en-BD' | 'bn-BD' = 'en-BD'
  ): SeoMetadata {
    const isBn = locale === 'bn-BD';
    const pageTitle = `${brand.name} Official Brand Flagship | AlifWorld`;
    const description = `Shop 100% genuine ${brand.name} products with verified manufacturer warranty on AlifWorld Bangladesh.`;

    const canonicalPath = `/brands/${brand.slug}`;
    const canonicalUrl = `${APP_BASE_URL}${canonicalPath}`;
    const imageUrl = brand.logoUrl || `${APP_BASE_URL}/images/og-brand-default.jpg`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      name: brand.name,
      url: canonicalUrl,
      logo: imageUrl,
      ...(brand.website ? { sameAs: [brand.website] } : {}),
    };

    return {
      title: pageTitle,
      description,
      canonicalUrl,
      hreflang: {
        'en-BD': canonicalUrl,
        'bn-BD': `${canonicalUrl}?locale=bn-BD`,
        'x-default': canonicalUrl,
      },
      openGraph: {
        title: pageTitle,
        description,
        url: canonicalUrl,
        siteName: 'AlifWorld Bangladesh',
        locale: isBn ? 'bn_BD' : 'en_BD',
        alternateLocales: isBn ? ['en_BD'] : ['bn_BD'],
        type: 'website',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: brand.name }],
      },
      twitter: {
        card: 'summary',
        site: '@alifworldbd',
        creator: '@alifworldbd',
        title: pageTitle,
        description,
        images: [imageUrl],
      },
      jsonLd,
    };
  }

  /**
   * Generates SEO metadata for a Seller Public Storefront.
   */
  public static buildSellerSeo(
    seller: {
      slug: string;
      businessName: string;
      storeDescription?: string | null;
      logoUrl?: string | null;
      bannerUrl?: string | null;
      isVerified: boolean;
      memberSince?: string;
    },
    locale: 'en-BD' | 'bn-BD' = 'en-BD'
  ): SeoMetadata {
    const isBn = locale === 'bn-BD';
    const pageTitle = `${seller.businessName} Storefront | AlifWorld Merchant`;
    const description =
      seller.storeDescription ||
      `Discover verified merchandise from ${seller.businessName} on AlifWorld Bangladesh with doorstep delivery.`;

    const canonicalPath = `/sellers/${seller.slug}`;
    const canonicalUrl = `${APP_BASE_URL}${canonicalPath}`;
    const imageUrl =
      seller.bannerUrl || seller.logoUrl || `${APP_BASE_URL}/images/og-seller-default.jpg`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: seller.businessName,
      description,
      url: canonicalUrl,
      image: imageUrl,
    };

    return {
      title: pageTitle,
      description,
      canonicalUrl,
      hreflang: {
        'en-BD': canonicalUrl,
        'bn-BD': `${canonicalUrl}?locale=bn-BD`,
        'x-default': canonicalUrl,
      },
      openGraph: {
        title: pageTitle,
        description,
        url: canonicalUrl,
        siteName: 'AlifWorld Bangladesh',
        locale: isBn ? 'bn_BD' : 'en_BD',
        alternateLocales: isBn ? ['en_BD'] : ['bn_BD'],
        type: 'website',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: seller.businessName }],
      },
      twitter: {
        card: 'summary_large_image',
        site: '@alifworldbd',
        creator: '@alifworldbd',
        title: pageTitle,
        description,
        images: [imageUrl],
      },
      jsonLd,
    };
  }

  /**
   * Converts generic SeoMetadata into Next.js Metadata object.
   */
  public static toNextMetadata(seo: SeoMetadata): Metadata {
    return {
      title: seo.title,
      description: seo.description,
      alternates: {
        canonical: seo.canonicalUrl,
        languages: {
          'en-BD': seo.hreflang['en-BD'],
          'bn-BD': seo.hreflang['bn-BD'],
          'x-default': seo.hreflang['x-default'],
        },
      },
      openGraph: {
        title: seo.openGraph.title,
        description: seo.openGraph.description,
        url: seo.openGraph.url,
        siteName: seo.openGraph.siteName,
        locale: seo.openGraph.locale,
        alternateLocale: seo.openGraph.alternateLocales,
        images: seo.openGraph.images.map((img) => ({
          url: img.url,
          width: img.width,
          height: img.height,
          alt: img.alt,
        })),
      },
      twitter: {
        card: seo.twitter.card,
        site: seo.twitter.site,
        creator: seo.twitter.creator,
        title: seo.twitter.title,
        description: seo.twitter.description,
        images: seo.twitter.images,
      },
    };
  }
}
