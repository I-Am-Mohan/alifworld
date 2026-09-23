import { absoluteUrl } from '@/shared/seo/metadata';

export const DISALLOW_PREFIXES = ['/admin', '/seller', '/account', '/cart', '/checkout', '/orders', '/wallet', '/login', '/register', '/reset-password', '/verify-email', '/api'];

export function buildRobotsText(): string {
  const lines = [
    'User-agent: *',
    'Allow: /',
    ...DISALLOW_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
  ];

  return `${lines.join('\n')}\n`;
}
