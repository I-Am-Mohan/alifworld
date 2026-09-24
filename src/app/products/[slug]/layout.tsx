import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getServerLocale } from '@/i18n/server';
import { buildBreadcrumbJsonLd, buildSeoMetadata } from '@/shared/seo/metadata';
import { SeoJsonLd } from '@/shared/seo/json-ld';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const headerList = await headers();
  const locale = getServerLocale(headerList as any);
  const { slug } = await params;
  const isEnglish = locale === 'en-BD';
  const title = isEnglish ? `${slug} | AlifWorld` : `${slug} | AlifWorld`;
  const description = isEnglish
    ? `View product details, pricing, availability, and seller information for ${slug}.`
    : `${slug}-এর বিস্তারিত, মূল্য, স্টক এবং বিক্রেতার তথ্য দেখুন।`;

  return buildSeoMetadata({
    path: `/products/${slug}`,
    locale,
    title,
    description,
    type: 'product',
  });
}

export default async function ProductLayout({ children, params }: ProductLayoutProps) {
  const headerList = await headers();
  const { slug } = await params;
  return (
    <>
      {children}
      <SeoJsonLd
        data={buildBreadcrumbJsonLd(
          [
            { name: 'AlifWorld', path: '/' },
            { name: 'Products', path: '/products' },
            { name: slug, path: `/products/${slug}` },
          ],
          getServerLocale(headerList as any)
        )}
      />
    </>
  );
}
