import type { Metadata } from 'next';
import { getServerEnv } from '@/shared/config/environment';
import { CANONICAL_LOCALES, DEFAULT_LOCALE, normalizeToCanonicalLocale } from '@/i18n/config';
import type { CanonicalLocale } from '@/i18n/types';

export const SEO_SITE_NAME = 'AlifWorld';
export const SEO_DEFAULT_TITLE = 'AlifWorld | Bangladesh Premium Multi-Vendor Marketplace';
export const SEO_DEFAULT_DESCRIPTION =
  'AlifWorld - Bangladesh leading multi-vendor e-commerce platform with transparent wallet ledgers, customer reward clubs, and seller empowerment.';

export interface SeoPageInput {
  path: string;
  locale?: string;
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

function getSiteUrl(): URL {
  const configured = getServerEnv().NEXT_PUBLIC_APP_URL || getServerEnv().APP_URL;
  return new URL(configured);
}

function normalizedPath(path: string): string {
  const value = path.trim() || '/';
  return value.startsWith('/') ? value : `/${value}`;
}

export function absoluteUrl(path: string): string {
  return new URL(normalizedPath(path), getSiteUrl()).toString();
}

export function localePath(path: string, locale: string): string {
  const normalizedLocale = normalizeToCanonicalLocale(locale);
  const cleanPath = normalizedPath(path);
  const prefix = normalizedLocale === DEFAULT_LOCALE ? '' : `/${normalizedLocale}`;
  return `${prefix}${cleanPath === '/' ? '' : cleanPath}` || '/';
}

export function localeAlternates(path: string): Record<CanonicalLocale, string> {
  return Object.fromEntries(
    CANONICAL_LOCALES.map((locale) => [locale, absoluteUrl(localePath(path, locale))])
  ) as Record<CanonicalLocale, string>;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[], locale?: string): Record<string, unknown> {
  const normalizedLocale = normalizeToCanonicalLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(localePath(item.path, normalizedLocale)),
    })),
  };
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.png'),
  };
}

export function buildSeoMetadata(input: SeoPageInput): Metadata {
  const locale = normalizeToCanonicalLocale(input.locale);
  const canonicalPath = localePath(input.path, locale);
  const canonical = absoluteUrl(canonicalPath);
  const image = input.image ? absoluteUrl(input.image) : absoluteUrl('/logo.png');
  const alternates = localeAlternates(input.path);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
      languages: {
        ...alternates,
        'x-default': alternates[DEFAULT_LOCALE],
      },
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: input.type === 'product' ? 'website' : input.type || 'website',
      siteName: SEO_SITE_NAME,
      title: input.title,
      description: input.description,
      url: canonical,
      locale,
      alternateLocale: CANONICAL_LOCALES.filter((candidate) => candidate !== locale),
      images: [{ url: image, alt: input.title }],
      ...(input.publishedTime || input.modifiedTime || input.section
        ? {
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime,
            section: input.section,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

export function buildNoIndexMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}
