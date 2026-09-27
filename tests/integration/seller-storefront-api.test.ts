import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { GET as getStorefrontRoute } from '@/app/api/v1/sellers/[slug]/storefront/route';
import { sellerStorefrontService } from '@/features/seller/services/seller-storefront.service';
import { NextRequest } from 'next/server';

describe('Milestone 118: Public Seller Storefront REST API Integration Tests', () => {
  const mockStorefront = {
    store: {
      id: 'sel_001',
      businessName: 'Walton Official Store',
      slug: 'walton-official',
      isVerified: true,
      status: 'VERIFIED',
      memberSince: '2024',
      shippingPolicy: 'Nationwide delivery',
      returnPolicy: '7-day replacement',
      cancellationPolicy: 'Pre-shipment cancellation',
      vacationMode: false,
      rating: 4.8,
      reviewCount: 38,
    },
    products: [
      {
        id: 'prod_001',
        slug: 'walton-primo-s8',
        title: 'Walton Primo S8 Pro',
        sellerId: 'sel_001',
        minPricePoisha: 1850000,
        inStock: true,
      },
    ],
    totalHits: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  beforeEach(() => {
    spyOn(sellerStorefrontService, 'getPublicStorefront').mockResolvedValue(mockStorefront as any);
  });

  it('GET /api/v1/sellers/[slug]/storefront returns seller profile and catalog', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/sellers/walton-official/storefront', {
      method: 'GET',
    });

    const res = await getStorefrontRoute(req, {
      params: Promise.resolve({ slug: 'walton-official' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.store.businessName).toBe('Walton Official Store');
    expect(body.data.store.isVerified).toBe(true);
    expect(body.data.products.length).toBe(1);
    expect(body.data.products[0].sellerId).toBe('sel_001');
  });
});
