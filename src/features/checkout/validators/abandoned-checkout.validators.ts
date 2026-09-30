/**
 * Abandoned Checkout Recovery Validation Schemas
 */

import { z } from 'zod';

export const AbandonedStatusEnum = z.enum(['ABANDONED', 'NOTIFIED', 'RECOVERED', 'EXPIRED']);

export const QueryAbandonedCheckoutsSchema = z.object({
  status: AbandonedStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  minTotalPoisha: z.coerce.number().int().nonnegative().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const TriggerRecoverySchema = z.object({
  incentiveCouponCode: z.string().max(50).optional().nullable(),
  channel: z.enum(['EMAIL', 'SMS', 'BOTH']).default('BOTH'),
});

export type QueryAbandonedCheckoutsInput = z.infer<typeof QueryAbandonedCheckoutsSchema>;
export type TriggerRecoveryInput = z.infer<typeof TriggerRecoverySchema>;
