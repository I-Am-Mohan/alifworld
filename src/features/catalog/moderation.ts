import { z } from 'zod';

export const ModerationResolveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'REQUEST_CHANGES', 'DISMISSED']),
  reason: z.string().trim().min(3).max(1000).optional().nullable(),
});
export type ModerationResolveInput = z.infer<typeof ModerationResolveSchema>;

export const DuplicateRecheckSchema = z.object({ reason: z.string().trim().max(500).optional().nullable() });
export type DuplicateRecheckInput = z.infer<typeof DuplicateRecheckSchema>;
