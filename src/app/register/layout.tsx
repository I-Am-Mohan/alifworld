import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Create account | AlifWorld',
  'Create a private AlifWorld customer account.'
);

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
