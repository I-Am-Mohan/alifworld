/**
 * Product Q&A Domain Types
 *
 * Invariant: Zero customer PII leakage (names redacted, contact details stripped).
 * Invariant: Official seller answers strictly scoped to the verified seller owning the product.
 * Invariant: Moderation states (APPROVED, PENDING, REJECTED, FLAGGED) govern public visibility.
 */

export type QnaStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export interface ProductAnswerDTO {
  id: string;
  questionId: string;
  sellerId: string | null;
  authorDisplayName: string; // e.g. "Walton Official Store" or "Store Staff"
  answer: string;
  isOfficialSeller: boolean;
  status: QnaStatus;
  upvotesCount: number;
  createdAt: string;
  updatedAt: string;
  currentUserVoted?: boolean;
}

export interface ProductQuestionDTO {
  id: string;
  productId: string;
  productTitle?: string;
  authorDisplayName: string; // Redacted name: e.g. "Arif K." or "Verified Shopper"
  question: string;
  status: QnaStatus;
  isAnswered: boolean;
  upvotesCount: number;
  answers: ProductAnswerDTO[];
  answersCount: number;
  createdAt: string;
  updatedAt: string;
  currentUserVoted?: boolean;
}

export interface ProductQnaSummaryDTO {
  productId: string;
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
}
