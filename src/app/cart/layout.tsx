import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Shopping cart | AlifWorld',
  'Your private AlifWorld shopping cart.'
);

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
