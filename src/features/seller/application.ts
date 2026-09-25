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

export const SellerApplicationIdSchema = z.string().regex(/^sapp_[A-Za-z0-9]+$/, 'Invalid seller application identifier.');

export const SellerApplicationReviewIdempotencySchema = z.string().trim().min(8).max(128);
export const SellerApplicationAdminQuerySchema = z.object({
  status: z.enum(SELLER_APPLICATION_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

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
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A reason of at least 5 characters is required for this decision.' });
  }
});

export const SELLER_APPLICATION_TRANSITIONS: Record<SellerApplicationStatus, readonly SellerApplicationStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED'],
  UNDER_REVIEW: ['CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
  CHANGES_REQUESTED: ['SUBMITTED'],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function canTransitionSellerApplication(from: SellerApplicationStatus, to: SellerApplicationStatus): boolean {
  return SELLER_APPLICATION_TRANSITIONS[from].includes(to);
}

export type SellerApplicationDraftInput = z.infer<typeof SellerApplicationDraftSchema>;
export type SellerApplicationUpdateInput = z.infer<typeof SellerApplicationUpdateSchema>;
export type SellerApplicationReviewInput = z.infer<typeof SellerApplicationReviewSchema>;

export function isSellerApplicationStatus(value: string): value is SellerApplicationStatus {
  return (SELLER_APPLICATION_STATUSES as readonly string[]).includes(value);
}
