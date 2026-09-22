/**
 * AlifWorld Wallet, Double-Entry Ledger, Points & Rewards Validation Schemas
 * 
 * Invariants: ADR-0022, ADR-0028, ADR-0029, 100% Split Sum invariant, BigInt Poisha
 */

import { z } from 'zod';

export const postingDirectionSchema = z.enum(['DEBIT', 'CREDIT']);

export const journalPostingSchema = z.object({
  accountCode: z.string().min(3).max(64),
  walletId: z.string().optional().nullable(),
  direction: postingDirectionSchema,
  amountPoisha: z
    .string()
    .regex(/^[1-9]\d*$/, 'Amount in poisha must be a positive integer string')
    .transform((val) => BigInt(val)),
  currency: z.string().length(3).default('BDT'),
  description: z.string().max(255).optional().nullable(),
});

export const recordJournalSchema = z.object({
  description: z.string().min(3).max(255),
  referenceType: z.enum([
    'ORDER_PAYMENT',
    'REWARD_DISTRIBUTION',
    'REFUND_ADJUSTMENT',
    'SETTLEMENT_CLEARING',
    'WITHDRAWAL',
    'MANUAL_AUDIT',
  ]),
  referenceId: z.string().optional().nullable(),
  totalPoisha: z
    .string()
    .regex(/^[1-9]\d*$/, 'Total amount in poisha must be a positive integer string')
    .transform((val) => BigInt(val)),
  idempotencyKey: z.string().max(128).optional().nullable(),
  ruleVersion: z.string().max(32).default('v1.0.0'),
  postings: z.array(journalPostingSchema).min(2, 'A balanced journal requires at least two postings (debit and credit)'),
});

export const createRewardRuleSchema = z
  .object({
    ruleCode: z.string().min(3).max(64),
    version: z.string().min(1).max(32).default('v1.0.0'),
    name: z.string().min(3).max(128),
    description: z.string().max(255).optional().nullable(),
    splits: z.record(z.string(), z.number().int().nonnegative()),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const totalBps = Object.values(data.splits).reduce((acc, curr) => acc + curr, 0);
      return totalBps === 10000;
    },
    {
      message: 'Reward rule splits must sum to exactly 10,000 basis points (100.00%)',
      path: ['splits'],
    }
  );

export const allocateRewardSchema = z.object({
  ruleCode: z.string().min(3).max(64),
  ruleVersion: z.string().default('v1.0.0'),
  sourceType: z.enum(['ORDER', 'CLUB_PERIOD', 'RANK_BONUS']),
  sourceId: z.string().min(1),
  beneficiaryType: z.enum(['CUSTOMER', 'SELLER']),
  beneficiaryId: z.string().min(1),
  basisPoisha: z
    .string()
    .regex(/^[1-9]\d*$/, 'Basis amount in poisha must be a positive integer string')
    .transform((val) => BigInt(val)),
});

export const createRankDefinitionSchema = z.object({
  category: z.enum(['CUSTOMER_CLUB', 'CUSTOMER_STAR', 'SELLER_CLUB', 'SELLER_STAR']),
  code: z.string().min(2).max(32),
  title: z.string().min(2).max(64),
  period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  pointThreshold: z.number().int().positive().optional().nullable(),
  starPositionMin: z.number().int().positive().optional().nullable(),
  starPositionMax: z.number().int().positive().optional().nullable(),
  poolShareBps: z.number().int().positive().max(10000).optional().nullable(),
  effectiveFrom: z.string().datetime().optional(),
  effectiveTo: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
});
