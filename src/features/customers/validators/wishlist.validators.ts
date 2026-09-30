/**
 * AlifWorld Wishlist Validation Schemas
 *
 * Strict Zod validation for wishlist creation, updates, item addition,
 * and share link privacy configuration.
 *
 * Invariants: ADR-0003, ADR-0022
 */

import { z } from 'zod';

export const WishlistVisibilityEnum = z.enum(['PRIVATE', 'PUBLIC', 'SHARED_LINK']);

export const CreateWishlistSchema = z.object({
  title: z.string().trim().min(1, 'Wishlist title is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  visibility: WishlistVisibilityEnum.default('PRIVATE'),
});

export type CreateWishlistInput = z.input<typeof CreateWishlistSchema>;

export const UpdateWishlistSchema = CreateWishlistSchema.partial();
export type UpdateWishlistInput = z.input<typeof UpdateWishlistSchema>;

export const AddWishlistItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional().nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
});

export type AddWishlistItemInput = z.infer<typeof AddWishlistItemSchema>;

export const UpdateWishlistItemSchema = z.object({
  notes: z.string().trim().max(255).optional().nullable(),
});

export type UpdateWishlistItemInput = z.infer<typeof UpdateWishlistItemSchema>;

export const ShareWishlistSchema = z.object({
  action: z.enum(['GENERATE', 'REVOKE']),
  visibility: WishlistVisibilityEnum.optional(),
});

export type ShareWishlistInput = z.infer<typeof ShareWishlistSchema>;
