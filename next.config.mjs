import fs from 'fs';
import path from 'path';

// Automatically ensure public directory and brand logo are populated
try {
  if (!fs.existsSync('./public')) fs.mkdirSync('./public', { recursive: true });
  if (fs.existsSync('./logo.png') && !fs.existsSync('./public/logo.png')) {
    fs.copyFileSync('./logo.png', './public/logo.png');
  }
} catch (e) {
  // Non-fatal if filesystem is read-only
}

const appCdnUrl = process.env.NEXT_PUBLIC_CDN_URL || process.env.S3_PUBLIC_BASE_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
let dynamicCdnHost = '';
try {
  if (appCdnUrl) {
    dynamicCdnHost = new URL(appCdnUrl).hostname;
  }
} catch (e) {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['lucide-react'],

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      ...(dynamicCdnHost ? [{
        protocol: appCdnUrl.startsWith('https') ? 'https' : 'http',
        hostname: dynamicCdnHost,
        pathname: '/**',
      }] : []),
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
