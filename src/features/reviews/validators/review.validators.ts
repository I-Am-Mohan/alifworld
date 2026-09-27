/**
 * Product Reviews, Ratings & Media Validators
 */

import { z } from 'zod';

export const ReviewMediaTypeEnum = z.enum(['IMAGE', 'VIDEO']);

export const ReviewMediaItemSchema = z.object({
  url: z.string().url('A valid media URL is required'),
  mediaType: ReviewMediaTypeEnum.default('IMAGE'),
  altText: z.string().max(200).optional().nullable(),
  displayOrder: z.number().int().min(0).max(10).default(0),
});

export const CreateProductReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional().nullable(),
  rating: z.number().int().min(1, 'Rating must be at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  title: z.string().max(150, 'Title cannot exceed 150 characters').optional().nullable(),
  comment: z
    .string()
    .min(10, 'Review comment must be at least 10 characters')
    .max(3000, 'Review comment cannot exceed 3000 characters'),
  media: z.array(ReviewMediaItemSchema).max(5, 'Maximum of 5 media attachments allowed').optional().default([]),
});

export const UpdateProductReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(150).optional().nullable(),
  comment: z.string().min(10).max(3000).optional(),
  media: z.array(ReviewMediaItemSchema).max(5).optional(),
});

export const SellerResponseReviewSchema = z.object({
  sellerResponse: z
    .string()
    .min(5, 'Seller response must be at least 5 characters')
    .max(2000, 'Seller response cannot exceed 2000 characters'),
});

export const AdminModerateReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'FLAGGED']),
  rejectionReason: z.string().max(500).optional().nullable(),
});

export const VoteReviewSchema = z.object({
  isHelpful: z.boolean(),
});

export const ListProductReviewsQuerySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  verifiedOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((val) => val === true || val === 'true'),
  withMediaOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((val) => val === true || val === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(['recent', 'rating_desc', 'rating_asc', 'helpful']).default('recent'),
});

export type CreateProductReviewInput = z.input<typeof CreateProductReviewSchema>;
export type UpdateProductReviewInput = z.input<typeof UpdateProductReviewSchema>;
export type SellerResponseReviewInput = z.infer<typeof SellerResponseReviewSchema>;
export type AdminModerateReviewInput = z.infer<typeof AdminModerateReviewSchema>;
export type VoteReviewInput = z.infer<typeof VoteReviewSchema>;
export type ListProductReviewsQueryInput = z.input<typeof ListProductReviewsQuerySchema>;
export type ListProductReviewsQuery = z.infer<typeof ListProductReviewsQuerySchema>;

