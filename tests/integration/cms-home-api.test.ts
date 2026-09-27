import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as getHomeRoute, PUT as putHomeRoute } from '@/app/api/v1/cms/home/route';
import { cmsService } from '@/features/cms/services/cms-service';
import { NextRequest } from 'next/server';

describe('Milestone 115: CMS Storefront Home REST API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const mockHomepage = {
    slug: 'storefront-home',
    locale: 'en-BD' as const,
    version: 1,
    sections: [
      {
        id: 'sec_hero',
        type: 'HERO_CAROUSEL' as const,
        title: 'Featured Campaigns',
        order: 1,
        isActive: true,
        data: {
          banners: [
            {
              id: 'b1',
              title: 'Walton Primo S8 Pro',
              imageUrl: '/images/b1.jpg',
              ctaText: 'Shop',
              ctaLink: '/search',
              order: 1,
              isActive: true,
            },
          ],
        },
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    spyOn(cmsService, 'getStorefrontHomepage').mockResolvedValue(mockHomepage);

    spyOn(cmsService, 'updateHomepageLayout').mockResolvedValue({
      id: 'cms_001',
      slug: 'storefront-home',
      contentType: 'HOMEPAGE_LAYOUT',
      version: 2,
      status: 'PUBLISHED',
      sections: mockHomepage.sections as any,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('GET /api/v1/cms/home should return localized homepage layout', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cms/home?locale=en-BD', {
      method: 'GET',
    });

    const res = await getHomeRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe('storefront-home');
    expect(body.data.sections.length).toBe(1);
    expect(body.data.sections[0].type).toBe('HERO_CAROUSEL');
  });

  it('PUT /api/v1/cms/home should allow platform admin to update layout', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cms/home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        status: 'PUBLISHED',
        sections: [
          {
            id: 'sec_hero',
            type: 'HERO_CAROUSEL',
            title: 'Updated Campaigns',
            order: 1,
            isActive: true,
            data: {},
          },
        ],
      }),
    });

    const res = await putHomeRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.version).toBe(2);
  });
});
