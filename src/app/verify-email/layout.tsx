import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/shared/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Email verification | AlifWorld',
  'Private AlifWorld email verification flow.'
);

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
