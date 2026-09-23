import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Order tracking | AlifWorld',
  'Private AlifWorld order tracking details.'
);

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
