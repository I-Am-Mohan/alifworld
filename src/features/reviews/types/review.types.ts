/**
 * Product Reviews, Ratings & Media Domain Types
 *
 * Invariant: Zero customer PII leakage (names redacted, contact/order metadata stripped).
 * Invariant: Verified-purchase status strictly authenticated against delivered order items.
 * Invariant: Discrete 1-5 integer star ratings with distribution breakdowns.
 */

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export type ReviewMediaType = 'IMAGE' | 'VIDEO';

export interface ReviewMediaDTO {
  id: string;
  mediaType: ReviewMediaType;
  url: string;
  altText: string | null;
  displayOrder: number;
}

export interface ProductReviewDTO {
  id: string;
  productId: string;
  variantId: string | null;
  variantTitle?: string | null;
  authorDisplayName: string; // Redacted name: e.g. "Rafiqul I." or "Verified Buyer"
  rating: number; // 1 to 5
  title: string | null;
  comment: string;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  helpfulVotesCount: number;
  unhelpfulVotesCount: number;
  sellerResponse: string | null;
  sellerRespondedAt: string | null;
  sellerStoreName?: string | null;
  createdAt: string;
  updatedAt: string;
  media: ReviewMediaDTO[];
  currentUserVote?: 'HELPFUL' | 'UNHELPFUL' | null;
}

export interface ProductRatingSummaryDTO {
  productId: string;
  averageRating: number; // e.g. 4.7
  totalReviews: number;
  verifiedPurchasesCount: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CustomerReviewEligibilityDTO {
  canReview: boolean;
  isVerifiedPurchase: boolean;
  existingReviewId?: string | null;
  orderId?: string | null;
  orderItemId?: string | null;
  reason?: string | null;
}
