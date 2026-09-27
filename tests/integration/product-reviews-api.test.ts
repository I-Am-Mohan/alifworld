import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import {
  GET as listReviewsRoute,
  POST as createReviewRoute,
} from '@/app/api/v1/catalog/products/[id]/reviews/route';
import { GET as getSummaryRoute } from '@/app/api/v1/catalog/products/[id]/reviews/summary/route';
import { GET as checkEligibilityRoute } from '@/app/api/v1/catalog/products/[id]/reviews/eligibility/route';
import { POST as sellerResponseRoute } from '@/app/api/v1/reviews/[id]/seller-response/route';
import { POST as voteReviewRoute } from '@/app/api/v1/reviews/[id]/vote/route';
import { POST as moderateReviewRoute } from '@/app/api/v1/admin/reviews/[id]/moderate/route';
import { productReviewService } from '@/features/reviews';
import { NextRequest } from 'next/server';

describe('Milestone 125: Product Reviews & Ratings REST API Integration Tests', () => {
  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const sellerActor = {
    userId: 'usr_seller_01',
    roles: ['SELLER'],
    permissions: [],
    sellerId: 'sel_walton_store',
  };

  const adminActor = {
    userId: 'usr_admin_01',
    roles: ['ADMIN'],
    permissions: [],
    sellerId: null,
  };

  const mockReview = {
    id: 'rev_101',
    productId: 'prod_smartphone_01',
    variantId: null,
    variantTitle: null,
    authorDisplayName: 'Tanvir H.',
    rating: 5,
    title: 'Top Tier Experience',
    comment: 'Great display, responsive software, and fast charging.',
    isVerifiedPurchase: true,
    status: 'APPROVED' as const,
    helpfulVotesCount: 5,
    unhelpfulVotesCount: 0,
    sellerResponse: null,
    sellerRespondedAt: null,
    sellerStoreName: 'Walton Official Store',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    media: [],
  };

  const mockSummary = {
    productId: 'prod_smartphone_01',
    averageRating: 4.8,
    totalReviews: 12,
    verifiedPurchasesCount: 11,
    distribution: { 5: 10, 4: 2, 3: 0, 2: 0, 1: 0 },
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(productReviewService, 'getProductReviews').mockResolvedValue({
      reviews: [mockReview],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    spyOn(productReviewService, 'createReview').mockResolvedValue(mockReview);

    spyOn(productReviewService, 'getProductRatingSummary').mockResolvedValue(mockSummary);

    spyOn(productReviewService, 'checkCustomerEligibility').mockResolvedValue({
      canReview: true,
      isVerifiedPurchase: true,
      orderId: 'ord_100',
    });

    spyOn(productReviewService, 'sellerRespondToReview').mockResolvedValue({
      ...mockReview,
      sellerResponse: 'Thank you for your purchase!',
      sellerRespondedAt: new Date().toISOString(),
    });

    spyOn(productReviewService, 'voteReview').mockResolvedValue({
      helpfulVotesCount: 6,
      unhelpfulVotesCount: 0,
    });

    spyOn(productReviewService, 'adminModerateReview').mockResolvedValue({
      ...mockReview,
      status: 'APPROVED',
    });
  });

  it('GET /api/v1/catalog/products/[id]/reviews returns reviews list', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/prod_smartphone_01/reviews'
    );
    const res = await listReviewsRoute(req, {
      params: Promise.resolve({ id: 'prod_smartphone_01' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].authorDisplayName).toBe('Tanvir H.');
  });

  it('POST /api/v1/catalog/products/[id]/reviews submits a review', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/prod_smartphone_01/reviews',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 5,
          title: 'Top Tier Experience',
          comment: 'Great display, responsive software, and fast charging.',
        }),
      }
    );
    const res = await createReviewRoute(req, {
      params: Promise.resolve({ id: 'prod_smartphone_01' }),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isVerifiedPurchase).toBe(true);
  });

  it('GET /api/v1/catalog/products/[id]/reviews/summary returns rating summary and distribution', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/prod_smartphone_01/reviews/summary'
    );
    const res = await getSummaryRoute(req, {
      params: Promise.resolve({ id: 'prod_smartphone_01' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.averageRating).toBe(4.8);
    expect(body.data.totalReviews).toBe(12);
  });

  it('GET /api/v1/catalog/products/[id]/reviews/eligibility checks customer purchase status', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/prod_smartphone_01/reviews/eligibility'
    );
    const res = await checkEligibilityRoute(req, {
      params: Promise.resolve({ id: 'prod_smartphone_01' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.canReview).toBe(true);
  });

  it('POST /api/v1/reviews/[id]/seller-response adds official seller reply', async () => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    const req = new NextRequest(
      'http://localhost:3000/api/v1/reviews/rev_101/seller-response',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerResponse: 'Thank you for your purchase!',
        }),
      }
    );
    const res = await sellerResponseRoute(req, {
      params: Promise.resolve({ id: 'rev_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.sellerResponse).toBe('Thank you for your purchase!');
  });

  it('POST /api/v1/reviews/[id]/vote records helpful vote', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/reviews/rev_101/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isHelpful: true }),
    });
    const res = await voteReviewRoute(req, {
      params: Promise.resolve({ id: 'rev_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.helpfulVotesCount).toBe(6);
  });

  it('POST /api/v1/admin/reviews/[id]/moderate updates review moderation status', async () => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    const req = new NextRequest(
      'http://localhost:3000/api/v1/admin/reviews/rev_101/moderate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      }
    );
    const res = await moderateReviewRoute(req, {
      params: Promise.resolve({ id: 'rev_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('APPROVED');
  });
});
