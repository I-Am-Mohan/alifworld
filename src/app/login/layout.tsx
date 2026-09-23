import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Account | AlifWorld',
  'Private AlifWorld account access.'
);

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
