import { z } from 'zod';

export const SELLER_APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export type SellerApplicationStatus = (typeof SELLER_APPLICATION_STATUSES)[number];

export const SellerApplicationIdSchema = z.string().min(8).max(80);

export const SellerApplicationDraftSchema = z.object({
  businessName: z.string().trim().min(3).max(120),
  slug: z.string().trim().toLowerCase().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  tradeLicenseNumber: z.string().trim().max(50).nullable().optional(),
  binNumber: z.string().trim().regex(/^\d{9,13}$/).nullable().optional(),
  tinNumber: z.string().trim().regex(/^\d{10,12}$/).nullable().optional(),
});

export const SellerApplicationUpdateSchema = SellerApplicationDraftSchema.extend({
  version: z.number().int().positive(),
});

export const SellerApplicationReviewSchema = z.object({
  version: z.number().int().positive(),
  decision: z.enum(['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']),
  reason: z.string().trim().max(1000).optional(),
}).superRefine((value, ctx) => {
  if ((value.decision === 'CHANGES_REQUESTED' || value.decision === 'REJECTED') && (!value.reason || value.reason.length < 5)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A reason of at least 5 characters is required.' });
  }
});

export type SellerApplicationDraftInput = z.infer<typeof SellerApplicationDraftSchema>;
export type SellerApplicationUpdateInput = z.infer<typeof SellerApplicationUpdateSchema>;
export type SellerApplicationReviewInput = z.infer<typeof SellerApplicationReviewSchema>;

export function isSellerApplicationStatus(value: string): value is SellerApplicationStatus {
  return (SELLER_APPLICATION_STATUSES as readonly string[]).includes(value);
}
