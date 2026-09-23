import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getServerLocale } from '@/i18n/server';
import { buildBreadcrumbJsonLd, buildSeoMetadata } from '@/shared/seo/metadata';
import { SeoJsonLd } from '@/shared/seo/json-ld';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const locale = getServerLocale(headers());
  const isEnglish = locale === 'en-BD';
  const title = isEnglish ? `${params.slug} | AlifWorld` : `${params.slug} | AlifWorld`;
  const description = isEnglish
    ? `View product details, pricing, availability, and seller information for ${params.slug}.`
    : `${params.slug}-এর বিস্তারিত, মূল্য, স্টক এবং বিক্রেতার তথ্য দেখুন।`;

  return buildSeoMetadata({
    path: `/products/${params.slug}`,
    locale,
    title,
    description,
    type: 'product',
  });
}

export default function ProductLayout({ children, params }: ProductLayoutProps) {
  return (
    <>
      {children}
      <SeoJsonLd
        data={buildBreadcrumbJsonLd(
          [
            { name: 'AlifWorld', path: '/' },
            { name: 'Products', path: '/products' },
            { name: params.slug, path: `/products/${params.slug}` },
          ],
          getServerLocale(headers())
        )}
      />
    </>
  );
}
