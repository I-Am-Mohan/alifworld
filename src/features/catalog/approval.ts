import { z } from 'zod';

export const ApprovalDecisionSchema = z.object({
  version: z.number().int().positive(),
  reason: z.string().trim().max(1000).optional().nullable(),
  reviewNotes: z.string().trim().max(2000).optional().nullable(),
});
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;

export const SubmitProductApprovalSchema = z.object({
  version: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
});
export type SubmitProductApprovalInput = z.infer<typeof SubmitProductApprovalSchema>;

export const ProductApprovalActionSchema = z.object({
  version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(1000).optional().nullable(),
  reviewNotes: z.string().trim().max(2000).optional().nullable(),
});
export type ProductApprovalActionInput = z.infer<typeof ProductApprovalActionSchema>;
