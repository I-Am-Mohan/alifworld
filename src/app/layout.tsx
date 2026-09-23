import type { Metadata, Viewport } from 'next';
import { AuthWrapper } from '@/components/auth/auth-wrapper';
import { I18nProvider } from '@/i18n/context';
import { headers } from 'next/headers';
import { getServerLocale } from '@/i18n/server';

export const metadata: Metadata = {
  title: 'AlifWorld | Bangladesh Premium Multi-Vendor Marketplace',
  description:
    'AlifWorld - Bangladesh leading multi-vendor e-commerce platform with transparent wallet ledgers, customer reward clubs, and seller empowerment.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

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
      </body>
    </html>
  );
}
