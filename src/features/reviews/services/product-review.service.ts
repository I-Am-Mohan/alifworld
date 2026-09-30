/**
 * Product Review, Ratings & Media Domain Service
 *
 * Implements verified-purchase checks, 1-5 star ratings, review media gallery,
 * community helpfulness voting, official seller responses, and admin moderation.
 *
 * Invariant: Zero customer PII leakage (names redacted, private order details stripped).
 * Invariant: Verified purchase requires delivered order items for that product/user.
 * Invariant: Seller tenant isolation strictly enforced on official seller responses.
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
} from '@/shared/errors/app-error';
import {
  ProductReviewDTO,
  ProductRatingSummaryDTO,
  CustomerReviewEligibilityDTO,
  ReviewMediaDTO,
} from '../types/review.types';
import {
  CreateProductReviewInput,
  UpdateProductReviewInput,
  SellerResponseReviewInput,
  AdminModerateReviewInput,
  ListProductReviewsQueryInput,
  ListProductReviewsQuerySchema,
} from '../validators/review.validators';

export class ProductReviewService {
  private db = prisma;

  /**
   * Checks whether a customer is eligible to submit a review for a specific product.
   * Enforces verified-purchase invariant: Requires a delivered order item.
   */
  public async checkCustomerEligibility(
    userId: string,
    productId: string
  ): Promise<CustomerReviewEligibilityDTO> {
    // 1. Check if user has already reviewed this product
    const existing = await (this.db as any).productReview.findFirst({
      where: { userId, productId, deletedAt: null },
    });

    if (existing) {
      return {
        canReview: false,
        isVerifiedPurchase: existing.isVerifiedPurchase,
        existingReviewId: existing.id,
        reason: 'You have already reviewed this product.',
      };
    }

    // 2. Query delivered order items for this user and product
    const deliveredItem = await (this.db as any).orderItem.findFirst({
      where: {
        order: { userId, deletedAt: null },
        variant: { productId, deletedAt: null },
        status: { in: ['DELIVERED', 'CONFIRMED'] },
        deletedAt: null,
      },
      include: {
        order: { select: { id: true } },
      },
    });

    if (!deliveredItem) {
      return {
        canReview: false,
        isVerifiedPurchase: false,
        reason:
          'Only customers who have purchased and received this product can leave a verified-purchase review.',
      };
    }

    return {
      canReview: true,
      isVerifiedPurchase: true,
      orderId: deliveredItem.order.id,
      orderItemId: deliveredItem.id,
    };
  }

  /**
   * Submits a customer review with 1-5 star rating and optional media attachments.
   * Authenticates verified-purchase status.
   */
  public async createReview(
    userId: string,
    input: CreateProductReviewInput
  ): Promise<ProductReviewDTO> {
    const eligibility = await this.checkCustomerEligibility(userId, input.productId);
    if (!eligibility.canReview) {
      throw new ValidationError(
        eligibility.reason || 'You are not eligible to review this product.'
      );
    }

    const user = await (this.db as any).user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new NotFoundError(`User '${userId}' not found.`);
    }

    const product = await (this.db as any).product.findFirst({
      where: { id: input.productId, deletedAt: null },
      include: { seller: { select: { id: true, businessName: true } } },
    });

    if (!product) {
      throw new NotFoundError(`Product '${input.productId}' not found.`);
    }

    const reviewId = `rev_${Math.random().toString(36).substring(2, 10)}`;

    const review = await (this.db as any).productReview.create({
      data: {
        id: reviewId,
        productId: input.productId,
        variantId: input.variantId || null,
        userId,
        orderId: eligibility.orderId || null,
        orderItemId: eligibility.orderItemId || null,
        rating: input.rating,
        title: input.title || null,
        comment: input.comment,
        isVerifiedPurchase: eligibility.isVerifiedPurchase,
        status: 'APPROVED', // Default approved for verified purchases; flaggable via moderation
        media: {
          create: (input.media || []).map((m, idx) => ({
            id: `rmed_${Math.random().toString(36).substring(2, 10)}`,
            url: m.url,
            mediaType: m.mediaType || 'IMAGE',
            altText: m.altText || null,
            displayOrder: m.displayOrder ?? idx,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        variant: { select: { id: true, title: true } },
        media: { orderBy: { displayOrder: 'asc' } },
        product: { include: { seller: { select: { businessName: true } } } },
      },
    });

    await this.recordOutboxEvent('product.review_submitted', reviewId, {
      reviewId,
      productId: input.productId,
      userId,
      rating: input.rating,
      isVerifiedPurchase: eligibility.isVerifiedPurchase,
    });

    return this.mapReviewToDTO(review);
  }

  /**
   * Retrieves paginated reviews for a product with zero PII leakage.
   */
  public async getProductReviews(
    productId: string,
    query: ListProductReviewsQueryInput,
    currentUserId?: string
  ): Promise<{
    reviews: ProductReviewDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const parsedQuery = ListProductReviewsQuerySchema.parse(query);
    const page = parsedQuery.page || 1;
    const limit = parsedQuery.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      productId,
      status: 'APPROVED',
      deletedAt: null,
      ...(parsedQuery.rating ? { rating: parsedQuery.rating } : {}),
      ...(parsedQuery.verifiedOnly ? { isVerifiedPurchase: true } : {}),
    };

    if (parsedQuery.withMediaOnly) {
      where.media = { some: {} };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (parsedQuery.sortBy === 'rating_desc') {
      orderBy = { rating: 'desc' };
    } else if (parsedQuery.sortBy === 'rating_asc') {
      orderBy = { rating: 'asc' };
    } else if (parsedQuery.sortBy === 'helpful') {
      orderBy = { helpfulVotesCount: 'desc' };
    }

    const [reviews, total] = await Promise.all([
      (this.db as any).productReview.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, name: true } },
          variant: { select: { id: true, title: true } },
          media: { orderBy: { displayOrder: 'asc' } },
          product: { include: { seller: { select: { businessName: true } } } },
          votes: currentUserId ? { where: { userId: currentUserId } } : false,
        },
      }),
      (this.db as any).productReview.count({ where }),
    ]);

    const mapped = reviews.map((r: any) => {
      const userVote = r.votes?.[0];
      return {
        ...this.mapReviewToDTO(r),
        currentUserVote: userVote ? (userVote.isHelpful ? 'HELPFUL' : 'UNHELPFUL') : null,
      };
    });

    return {
      reviews: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Computes aggregate rating and star distribution for a product.
   */
  public async getProductRatingSummary(productId: string): Promise<ProductRatingSummaryDTO> {
    const reviews = await (this.db as any).productReview.findMany({
      where: { productId, status: 'APPROVED', deletedAt: null },
      select: { rating: true, isVerifiedPurchase: true },
    });

    const totalReviews = reviews.length;
    let sumRating = 0;
    let verifiedPurchasesCount = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const r of reviews) {
      sumRating += r.rating;
      if (r.isVerifiedPurchase) {
        verifiedPurchasesCount++;
      }
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    }

    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0;

    return {
      productId,
      averageRating,
      totalReviews,
      verifiedPurchasesCount,
      distribution: {
        1: distribution[1] || 0,
        2: distribution[2] || 0,
        3: distribution[3] || 0,
        4: distribution[4] || 0,
        5: distribution[5] || 0,
      },
    };
  }

  /**
   * Updates an existing customer review.
   */
  public async updateReview(
    reviewId: string,
    userId: string,
    input: UpdateProductReviewInput
  ): Promise<ProductReviewDTO> {
    const review = await (this.db as any).productReview.findFirst({
      where: { id: reviewId, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found.`);
    }

    if (review.userId !== userId) {
      throw new AuthorizationError('You can only update your own review.');
    }

    const updated = await (this.db as any).productReview.update({
      where: { id: reviewId },
      data: {
        ...(input.rating ? { rating: input.rating } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.comment ? { comment: input.comment } : {}),
        version: { increment: 1 },
      },
      include: {
        user: { select: { id: true, name: true } },
        variant: { select: { id: true, title: true } },
        media: { orderBy: { displayOrder: 'asc' } },
        product: { include: { seller: { select: { businessName: true } } } },
      },
    });

    return this.mapReviewToDTO(updated);
  }

  /**
   * Soft deletes a review (by author or admin).
   */
  public async deleteReview(
    reviewId: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const review = await (this.db as any).productReview.findFirst({
      where: { id: reviewId, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found.`);
    }

    if (review.userId !== userId && !isAdmin) {
      throw new AuthorizationError('You do not have permission to delete this review.');
    }

    await (this.db as any).productReview.update({
      where: { id: reviewId },
      data: { deletedAt: new Date(), deletedBy: userId },
    });

    await this.recordOutboxEvent('product.review_deleted', reviewId, {
      reviewId,
      productId: review.productId,
      deletedBy: userId,
    });
  }

  /**
   * Official seller response to a review on their product.
   * Strictly enforces seller tenant isolation.
   */
  public async sellerRespondToReview(
    reviewId: string,
    sellerUserId: string,
    sellerId: string,
    input: SellerResponseReviewInput
  ): Promise<ProductReviewDTO> {
    const review = await (this.db as any).productReview.findFirst({
      where: { id: reviewId, deletedAt: null },
      include: {
        product: { select: { sellerId: true, businessName: true } },
      },
    });

    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found.`);
    }

    if (review.product.sellerId !== sellerId) {
      throw new AuthorizationError(
        'You can only respond to reviews for products in your own storefront.'
      );
    }

    const updated = await (this.db as any).productReview.update({
      where: { id: reviewId },
      data: {
        sellerResponse: input.sellerResponse,
        sellerRespondedAt: new Date(),
        sellerRespondedBy: sellerUserId,
        version: { increment: 1 },
      },
      include: {
        user: { select: { id: true, name: true } },
        variant: { select: { id: true, title: true } },
        media: { orderBy: { displayOrder: 'asc' } },
        product: { include: { seller: { select: { businessName: true } } } },
      },
    });

    await this.recordOutboxEvent('product.review_seller_responded', reviewId, {
      reviewId,
      sellerId,
      sellerUserId,
    });

    return this.mapReviewToDTO(updated);
  }

  /**
   * Casts a helpful or unhelpful vote on a review.
   */
  public async voteReview(
    reviewId: string,
    userId: string,
    isHelpful: boolean
  ): Promise<{ helpfulVotesCount: number; unhelpfulVotesCount: number }> {
    const review = await (this.db as any).productReview.findFirst({
      where: { id: reviewId, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found.`);
    }

    if (review.userId === userId) {
      throw new ValidationError('You cannot vote on your own review.');
    }

    const existingVote = await (this.db as any).productReviewVote.findFirst({
      where: { reviewId, userId },
    });

    let helpfulDelta = 0;
    let unhelpfulDelta = 0;

    if (!existingVote) {
      await (this.db as any).productReviewVote.create({
        data: {
          id: `vote_${Math.random().toString(36).substring(2, 10)}`,
          reviewId,
          userId,
          isHelpful,
        },
      });
      if (isHelpful) helpfulDelta = 1;
      else unhelpfulDelta = 1;
    } else if (existingVote.isHelpful !== isHelpful) {
      await (this.db as any).productReviewVote.update({
        where: { id: existingVote.id },
        data: { isHelpful },
      });
      if (isHelpful) {
        helpfulDelta = 1;
        unhelpfulDelta = -1;
      } else {
        helpfulDelta = -1;
        unhelpfulDelta = 1;
      }
    }

    const updated = await (this.db as any).productReview.update({
      where: { id: reviewId },
      data: {
        helpfulVotesCount: { increment: helpfulDelta },
        unhelpfulVotesCount: { increment: unhelpfulDelta },
      },
    });

    return {
      helpfulVotesCount: Math.max(0, updated.helpfulVotesCount),
      unhelpfulVotesCount: Math.max(0, updated.unhelpfulVotesCount),
    };
  }

  /**
   * Platform Admin moderates a review (APPROVED, REJECTED, FLAGGED).
   */
  public async adminModerateReview(
    reviewId: string,
    adminUserId: string,
    input: AdminModerateReviewInput
  ): Promise<ProductReviewDTO> {
    const review = await (this.db as any).productReview.findFirst({
      where: { id: reviewId, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found.`);
    }

    const updated = await (this.db as any).productReview.update({
      where: { id: reviewId },
      data: {
        status: input.status,
        rejectionReason: input.rejectionReason || null,
        version: { increment: 1 },
      },
      include: {
        user: { select: { id: true, name: true } },
        variant: { select: { id: true, title: true } },
        media: { orderBy: { displayOrder: 'asc' } },
        product: { include: { seller: { select: { businessName: true } } } },
      },
    });

    await this.recordOutboxEvent('product.review_moderated', reviewId, {
      reviewId,
      status: input.status,
      adminUserId,
      rejectionReason: input.rejectionReason || null,
    });

    return this.mapReviewToDTO(updated);
  }

  // ----------------------------------------------------------------------------
  // Helper & Mapping Methods
  // ----------------------------------------------------------------------------

  private mapReviewToDTO(review: any): ProductReviewDTO {
    return {
      id: review.id,
      productId: review.productId,
      variantId: review.variantId,
      variantTitle: review.variant?.title || null,
      authorDisplayName: this.redactAuthorName(review.user?.name),
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      status: review.status,
      helpfulVotesCount: review.helpfulVotesCount || 0,
      unhelpfulVotesCount: review.unhelpfulVotesCount || 0,
      sellerResponse: review.sellerResponse,
      sellerRespondedAt: review.sellerRespondedAt?.toISOString?.() || null,
      sellerStoreName: review.product?.seller?.businessName || null,
      createdAt: review.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: review.updatedAt?.toISOString?.() || new Date().toISOString(),
      media: (review.media || []).map((m: any) => ({
        id: m.id,
        mediaType: m.mediaType,
        url: m.url,
        altText: m.altText,
        displayOrder: m.displayOrder,
      })),
    };
  }

  /**
   * Redacts customer personal name to minimize PII exposure on public product pages.
   * e.g. "Mohammed Tanvir Hossain" -> "Mohammed H."
   */
  private redactAuthorName(name: string | null | undefined): string {
    if (!name || name.trim().length === 0) {
      return 'Verified Buyer';
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0];
    }
    const first = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase();
    return `${first} ${lastInitial}.`;
  }

  private async recordOutboxEvent(
    eventType: string,
    aggregateId: string,
    payload: any
  ): Promise<void> {
    try {
      await (this.db as any).outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType,
          aggregateType: 'PRODUCT_REVIEW',
          aggregateId,
          payload: payload ?? {},
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal outbox record error:', err);
    }
  }
}

export const productReviewService = new ProductReviewService();
