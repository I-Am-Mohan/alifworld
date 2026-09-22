import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AlifWorld | Bangladesh Premium Multi-Vendor Marketplace',
  description:
    'AlifWorld - Bangladesh leading multi-vendor e-commerce platform with transparent wallet ledgers, customer reward clubs, and seller empowerment.',
  icons: {
    icon: '/favicon.ico',
    apple: '/brand/logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn-BD" className="dark">
      <body className="antialiased bg-black text-white selection:bg-brand-orange selection:text-black">
        {children}
      </body>
    </html>
  );
}
