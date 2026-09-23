import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Seller Center | AlifWorld',
  'Private seller operations workspace for AlifWorld merchants.'
);

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
