import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AlifWorld API Documentation',
  description: 'Interactive OpenAPI documentation and API testing console for AlifWorld developers.',
  robots: { index: false, follow: false },
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
