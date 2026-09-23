import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Wallet | AlifWorld',
  'Private AlifWorld wallet and reward information.'
);

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children;
}
