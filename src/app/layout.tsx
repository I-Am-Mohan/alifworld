import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { I18nProvider } from '@/i18n/context';
import { headers } from 'next/headers';
import { getServerLocale } from '@/i18n/server';
import {
  buildNoIndexMetadata,
  buildSeoMetadata,
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_TITLE,
} from '@/shared/seo/metadata';
import { buildOrganizationJsonLd } from '@/shared/seo/metadata';
import { SeoJsonLd } from '@/shared/seo/json-ld';

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = headers();
  const pathname = requestHeaders.get('x-pathname') || '/';
  const locale = getServerLocale(requestHeaders);
  const isPublicHome = pathname === '/' || pathname === '/bn-BD' || pathname === '/en-BD';
  const baseMetadata = isPublicHome
    ? buildSeoMetadata({
        path: '/',
        locale,
        title: SEO_DEFAULT_TITLE,
        description: SEO_DEFAULT_DESCRIPTION,
      })
    : buildNoIndexMetadata('AlifWorld', 'AlifWorld private or operational page.');

  return {
    ...baseMetadata,
    icons: {
      icon: '/logo.png',
      apple: '/logo.png',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#FF6A00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = getServerLocale(headers());

  return (
    <html lang={locale} className="light">
      <body className="antialiased bg-[#FAF9F6] text-slate-900 selection:bg-brand-orange selection:text-white min-h-screen">
        <I18nProvider initialLocale={locale}>
          <AuthWrapper>{children}</AuthWrapper>
        </I18nProvider>
        <SeoJsonLd data={buildOrganizationJsonLd()} />
      </body>
    </html>
  );
}
