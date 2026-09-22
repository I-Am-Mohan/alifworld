/**
 * Audit Log Query & Search Validation Schemas
 * 
 * Enforces strict typing, pagination constraints, and date parsing for
 * administrative audit trail exploration.
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 049
 */

import { z } from 'zod';

export const AuditLogQuerySchema = z.object({
  actorId: z.string().trim().min(1).optional(),
  actorRole: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  resource: z.string().trim().min(1).optional(),
  resourceId: z.string().trim().min(1).optional(),
  requestId: z.string().trim().min(1).optional(),
  startDate: z
    .string()
    .trim()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid start date format' })
    .optional(),
  endDate: z
    .string()
    .trim()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'Invalid end date format' })
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
