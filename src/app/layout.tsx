import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthWrapper } from '@/components/auth/auth-wrapper';

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
  return (
    <html lang="en-BD" className="light">
      <body className="antialiased bg-[#FAF9F6] text-slate-900 selection:bg-brand-orange selection:text-white min-h-screen">
        <AuthWrapper>{children}</AuthWrapper>
      </body>
    </html>
  );
}
