import { describe, expect, it, beforeEach } from 'bun:test';
import { ProductReviewService } from '@/features/reviews/services/product-review.service';
import { NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';

class MockPrismaReviewDb {
  public reviews: any[] = [];
  public reviewMedia: any[] = [];
  public reviewVotes: any[] = [];
  public products: any[] = [];
  public users: any[] = [];
  public orderItems: any[] = [];
  public outboxEvents: any[] = [];

  public productReview = {
    findFirst: async ({ where }: any) => {
      return (
        this.reviews.find((r) => {
          if (where.id && r.id !== where.id) return false;
          if (where.userId && r.userId !== where.userId) return false;
          if (where.productId && r.productId !== where.productId) return false;
          if (where.deletedAt === null && r.deletedAt !== null) return false;
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const review = {
        ...data,
        helpfulVotesCount: 0,
        unhelpfulVotesCount: 0,
        sellerResponse: null,
        sellerRespondedAt: null,
        sellerRespondedBy: null,
        version: 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        media: data.media?.create || [],
      };
      this.reviews.push(review);
      const user = this.users.find((u) => u.id === review.userId);
      const product = this.products.find((p) => p.id === review.productId);
      return { ...review, user, product };
    },
    update: async ({ where, data }: any) => {
      const idx = this.reviews.findIndex((r) => r.id === where.id);
      if (idx === -1) throw new Error('Not found');
      const current = this.reviews[idx];
      let helpfulVotes = current.helpfulVotesCount;
      if (data.helpfulVotesCount?.increment !== undefined) {
        helpfulVotes += data.helpfulVotesCount.increment;
      }
      let unhelpfulVotes = current.unhelpfulVotesCount;
      if (data.unhelpfulVotesCount?.increment !== undefined) {
        unhelpfulVotes += data.unhelpfulVotesCount.increment;
      }

      this.reviews[idx] = {
        ...current,
        ...data,
        helpfulVotesCount: helpfulVotes,
        unhelpfulVotesCount: unhelpfulVotes,
        version: (current.version || 1) + 1,
        updatedAt: new Date(),
      };
      const user = this.users.find((u) => u.id === this.reviews[idx].userId);
      const product = this.products.find((p) => p.id === this.reviews[idx].productId);
      return { ...this.reviews[idx], user, product };
    },
    findMany: async ({ where }: any) => {
      return this.reviews
        .filter((r) => {
          if (where.productId && r.productId !== where.productId) return false;
          if (where.status && r.status !== where.status) return false;
          if (where.rating && r.rating !== where.rating) return false;
          if (where.isVerifiedPurchase && !r.isVerifiedPurchase) return false;
          return !r.deletedAt;
        })
        .map((r) => {
          const user = this.users.find((u) => u.id === r.userId);
          const product = this.products.find((p) => p.id === r.productId);
          return { ...r, user, product };
        });
    },
    count: async ({ where }: any) => {
      return this.reviews.filter((r) => {
        if (where.productId && r.productId !== where.productId) return false;
        if (where.status && r.status !== where.status) return false;
        return !r.deletedAt;
      }).length;
    },
  };

  public productReviewVote = {
    findFirst: async ({ where }: any) => {
      return (
        this.reviewVotes.find((v) => v.reviewId === where.reviewId && v.userId === where.userId) ||
        null
      );
    },
    create: async ({ data }: any) => {
      const vote = { ...data, createdAt: new Date() };
      this.reviewVotes.push(vote);
      return vote;
    },
    update: async ({ where, data }: any) => {
      const idx = this.reviewVotes.findIndex((v) => v.id === where.id);
      if (idx !== -1) {
        this.reviewVotes[idx] = { ...this.reviewVotes[idx], ...data };
        return this.reviewVotes[idx];
      }
      return null;
    },
  };

  public orderItem = {
    findFirst: async ({ where }: any) => {
      return (
        this.orderItems.find((item) => {
          if (where.order?.userId && item.order?.userId !== where.order.userId) return false;
          if (where.variant?.productId && item.variant?.productId !== where.variant.productId)
            return false;
          if (where.status?.in && !where.status.in.includes(item.status)) return false;
          if (where.deletedAt === null && item.deletedAt !== null) return false;
          return true;
        }) || null
      );
    },
  };

  public product = {
    findFirst: async ({ where }: any) => {
      return this.products.find((p) => p.id === where.id && !p.deletedAt) || null;
    },
  };

  public user = {
    findFirst: async ({ where }: any) => {
      return this.users.find((u) => u.id === where.id && !u.deletedAt) || null;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 125: Verified-Purchase Reviews, Ratings & Media Unit Tests', () => {
  let mockDb: MockPrismaReviewDb;
  let service: ProductReviewService;

  beforeEach(() => {
    mockDb = new MockPrismaReviewDb();
    service = new ProductReviewService();
    (service as any).db = mockDb;

    // Seed mock user and product
    mockDb.users.push({
      id: 'usr_customer_01',
      name: 'Tanvir Hossain',
      email: 'tanvir@example.com',
      deletedAt: null,
    });
    mockDb.users.push({
      id: 'usr_customer_02',
      name: 'Nusrat Jahan',
      email: 'nusrat@example.com',
      deletedAt: null,
    });

    mockDb.products.push({
      id: 'prod_smartphone_01',
      title: 'Walton Primo S8 Pro',
      sellerId: 'sel_walton_store',
      seller: { id: 'sel_walton_store', businessName: 'Walton Official Store' },
      deletedAt: null,
    });
  });

  describe('1. Verified Purchase Invariant & Eligibility', () => {
    it('grants review eligibility to customer with a delivered order', async () => {
      mockDb.orderItems.push({
        id: 'itm_001',
        status: 'DELIVERED',
        order: { id: 'ord_100', userId: 'usr_customer_01' },
        variant: { productId: 'prod_smartphone_01' },
        deletedAt: null,
      });

      const eligibility = await service.checkCustomerEligibility(
        'usr_customer_01',
        'prod_smartphone_01'
      );

      expect(eligibility.canReview).toBe(true);
      expect(eligibility.isVerifiedPurchase).toBe(true);
      expect(eligibility.orderId).toBe('ord_100');
    });

    it('denies review creation to customer who did not purchase the product', async () => {
      await expect(
        service.createReview('usr_customer_01', {
          productId: 'prod_smartphone_01',
          rating: 5,
          comment: 'Never bought this product, just leaving a review.',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('prevents duplicate reviews by the same customer for the same product', async () => {
      mockDb.orderItems.push({
        id: 'itm_001',
        status: 'DELIVERED',
        order: { id: 'ord_100', userId: 'usr_customer_01' },
        variant: { productId: 'prod_smartphone_01' },
        deletedAt: null,
      });

      await service.createReview('usr_customer_01', {
        productId: 'prod_smartphone_01',
        rating: 5,
        comment: 'Great phone, camera quality is top tier in Bangladesh.',
      });

      await expect(
        service.createReview('usr_customer_01', {
          productId: 'prod_smartphone_01',
          rating: 4,
          comment: 'Attempting second review.',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('2. Review Creation, Media & Zero PII Redaction', () => {
    it('creates review with media and redacts customer name for privacy', async () => {
      mockDb.orderItems.push({
        id: 'itm_001',
        status: 'DELIVERED',
        order: { id: 'ord_100', userId: 'usr_customer_01' },
        variant: { productId: 'prod_smartphone_01' },
        deletedAt: null,
      });

      const review = await service.createReview('usr_customer_01', {
        productId: 'prod_smartphone_01',
        rating: 5,
        title: 'Excellent Value',
        comment: 'Fast battery charging and crisp display. Highly recommend!',
        media: [
          {
            url: 'https://cdn.alifworld.com/reviews/unboxing.jpg',
            mediaType: 'IMAGE',
            altText: 'Phone in hand',
          },
        ],
      });

      expect(review.rating).toBe(5);
      expect(review.isVerifiedPurchase).toBe(true);
      expect(review.authorDisplayName).toBe('Tanvir H.'); // Privacy redacted: Zero PII leakage!
      expect(review.media.length).toBe(1);
      expect(review.media[0].url).toBe('https://cdn.alifworld.com/reviews/unboxing.jpg');
    });
  });

  describe('3. Rating Summary & Star Distribution', () => {
    it('computes accurate average rating and star distribution breakdown', async () => {
      mockDb.reviews.push(
        {
          id: 'r1',
          productId: 'prod_smartphone_01',
          rating: 5,
          isVerifiedPurchase: true,
          status: 'APPROVED',
          deletedAt: null,
        },
        {
          id: 'r2',
          productId: 'prod_smartphone_01',
          rating: 5,
          isVerifiedPurchase: true,
          status: 'APPROVED',
          deletedAt: null,
        },
        {
          id: 'r3',
          productId: 'prod_smartphone_01',
          rating: 4,
          isVerifiedPurchase: false,
          status: 'APPROVED',
          deletedAt: null,
        }
      );

      const summary = await service.getProductRatingSummary('prod_smartphone_01');

      expect(summary.totalReviews).toBe(3);
      expect(summary.averageRating).toBe(4.7); // (5 + 5 + 4) / 3 = 4.666... rounded to 4.7
      expect(summary.verifiedPurchasesCount).toBe(2);
      expect(summary.distribution[5]).toBe(2);
      expect(summary.distribution[4]).toBe(1);
      expect(summary.distribution[1]).toBe(0);
    });
  });

  describe('4. Official Seller Response & Tenant Scoping', () => {
    it('allows seller owner of the product to post an official response', async () => {
      mockDb.reviews.push({
        id: 'rev_101',
        productId: 'prod_smartphone_01',
        userId: 'usr_customer_01',
        product: { sellerId: 'sel_walton_store', businessName: 'Walton Official Store' },
        deletedAt: null,
      });

      const updated = await service.sellerRespondToReview(
        'rev_101',
        'usr_seller_admin',
        'sel_walton_store',
        { sellerResponse: 'Thank you for your valuable feedback, sir!' }
      );

      expect(updated.sellerResponse).toBe('Thank you for your valuable feedback, sir!');
      expect(updated.sellerRespondedAt).not.toBeNull();
    });

    it('rejects response from an unauthorized seller tenant', async () => {
      mockDb.reviews.push({
        id: 'rev_101',
        productId: 'prod_smartphone_01',
        userId: 'usr_customer_01',
        product: { sellerId: 'sel_walton_store', businessName: 'Walton Official Store' },
        deletedAt: null,
      });

      await expect(
        service.sellerRespondToReview(
          'rev_101',
          'usr_other_seller',
          'sel_apex_store', // Wrong seller tenant!
          { sellerResponse: 'Attempting cross-tenant response.' }
        )
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('5. Helpfulness Community Voting', () => {
    it('records helpful vote and prevents author from voting on self review', async () => {
      mockDb.reviews.push({
        id: 'rev_101',
        productId: 'prod_smartphone_01',
        userId: 'usr_customer_01',
        helpfulVotesCount: 0,
        unhelpfulVotesCount: 0,
        deletedAt: null,
      });

      // Self-voting must fail
      await expect(service.voteReview('rev_101', 'usr_customer_01', true)).rejects.toThrow(
        ValidationError
      );

      // Other customer votes helpful
      const votes = await service.voteReview('rev_101', 'usr_customer_02', true);
      expect(votes.helpfulVotesCount).toBe(1);
    });
  });

  describe('6. Admin Moderation', () => {
    it('allows platform admin to moderate review status and rejection reason', async () => {
      mockDb.reviews.push({
        id: 'rev_101',
        productId: 'prod_smartphone_01',
        status: 'APPROVED',
        deletedAt: null,
      });

      const moderated = await service.adminModerateReview('rev_101', 'usr_admin_01', {
        status: 'REJECTED',
        rejectionReason: 'Spam promotional content detected.',
      });

      expect(moderated.status).toBe('REJECTED');
    });
  });
});
