import type { Metadata } from 'next';
import { getServerLocale } from '@/i18n/server';
import { buildBreadcrumbJsonLd, buildSeoMetadata } from '@/shared/seo/metadata';
import { SeoJsonLd } from '@/shared/seo/json-ld';

interface TaxonomyLayoutProps { children: React.ReactNode; params: { slug: string } }

export function buildTaxonomyMetadata(params: { slug: string; locale?: string; name?: string; description?: string; seoTitle?: string | null; seoDescription?: string | null; noIndex?: boolean }): Metadata {
  const title = params.seoTitle || params.name || `${params.slug} | AlifWorld`;
  const description = params.seoDescription || params.description || `Explore ${params.slug} on AlifWorld.`;
  return buildSeoMetadata({ path: `/categories/${params.slug}`, locale: params.locale, title, description, noIndex: params.noIndex });
}

export default function TaxonomyLayout({ children, params }: TaxonomyLayoutProps) {
  const locale = getServerLocale();
  return <>{children}<SeoJsonLd data={buildBreadcrumbJsonLd([{ name: 'AlifWorld', path: '/' }, { name: params.slug, path: `/categories/${params.slug}` }], locale)} /></>;
}
