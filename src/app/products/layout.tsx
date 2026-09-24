import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getServerLocale } from '@/i18n/server';
import { buildSeoMetadata } from '@/shared/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const locale = getServerLocale(headerList as any);
  const isEnglish = locale === 'en-BD';
  return buildSeoMetadata({
    path: '/products',
    locale,
    title: isEnglish ? 'Products | AlifWorld' : 'পণ্যসমূহ | AlifWorld',
    description: isEnglish
      ? 'Discover products from trusted Bangladesh sellers on AlifWorld.'
      : 'AlifWorld-এ বাংলাদেশের বিশ্বস্ত বিক্রেতাদের পণ্য আবিষ্কার করুন।',
  });
}

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
