import { z } from 'zod';

export const ProductMediaUploadSchema = z.object({
  productId: z.string().min(4),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  isPrimary: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  altText: z.string().max(255).optional().nullable(),
  altTextBn: z.string().max(255).optional().nullable(),
});

export const ProductMediaMetaSchema = z.object({
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  mimeType: z.string().max(100),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024),
});

export const PRODUCT_MEDIA_LIMITS = {
  IMAGE_MAX_BYTES: 10 * 1024 * 1024,
  VIDEO_MAX_BYTES: 100 * 1024 * 1024,
  MAX_PER_PRODUCT: 30,
} as const;

export function validateProductMediaFile(mediaType: 'IMAGE' | 'VIDEO', mimeType: string, fileSize: number): void {
  const normalized = mimeType.toLowerCase();
  const validImage = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(normalized);
  const validVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(normalized);
  if (mediaType === 'IMAGE' && (!validImage || fileSize > PRODUCT_MEDIA_LIMITS.IMAGE_MAX_BYTES)) throw new Error('Invalid image type or size.');
  if (mediaType === 'VIDEO' && (!validVideo || fileSize > PRODUCT_MEDIA_LIMITS.VIDEO_MAX_BYTES)) throw new Error('Invalid video type or size.');
}
