/**
 * Payment, Refund, Commission & Settlement Validators
 * 
 * Defines runtime Zod validation schemas for gateway payments, webhooks,
 * item-level refunds, periodic settlements, and merchant payout disbursals.
 * 
 * Reference: docs/architecture/payments-refunds-commissions-settlements-and-payouts.md
 */

import { z } from 'zod';
import { CurrencyCodeSchema } from '@/shared/types/currency';

export const GatewayProviderSchema = z.enum([
  'BKASH',
  'NAGAD',
  'UPAY',
  'ROCKET',
  'SSLCOMMERZ',
  'COD',
]);

export const PayoutChannelSchema = z.enum([
  'BEFTN',
  'RTGS',
  'NPSB',
  'BKASH_DISBURSEMENT',
  'NAGAD_DISBURSEMENT',
]);

export const PoishaInputSchema = z
  .bigint()
  .or(z.number().int().positive().transform(BigInt))
  .or(z.string().regex(/^\d+$/).transform(BigInt));

export const PoishaNonNegativeInputSchema = z
  .bigint()
  .or(z.number().int().nonnegative().transform(BigInt))
  .or(z.string().regex(/^\d+$/).transform(BigInt));

export const InitiatePaymentSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  gatewayProvider: GatewayProviderSchema,
  amountPoisha: PoishaInputSchema,
  currency: CurrencyCodeSchema.default('BDT'),
  idempotencyKey: z.string().min(8).optional(),
});

export const GatewayWebhookSchema = z.object({
  gatewayProvider: GatewayProviderSchema,
  eventType: z.string().min(1, 'Event type is required'),
  externalEventId: z.string().optional(),
  signature: z.string().optional(),
  payload: z.record(z.unknown()),
});

export const RefundItemSchema = z.object({
  orderItemId: z.string().min(1, 'Order Item ID is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  amountPoisha: PoishaInputSchema,
  taxPoisha: PoishaNonNegativeInputSchema.optional(),
  productPoints: z.number().int().nonnegative().optional(),
});

export const ProcessRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  orderId: z.string().min(1, 'Order ID is required'),
  fulfillmentGroupId: z.string().optional(),
  amountPoisha: PoishaInputSchema,
  reversalPoints: z.number().int().nonnegative().optional(),
  reason: z.enum([
    'DAMAGED_GOODS',
    'DEFECTIVE',
    'OUT_OF_STOCK',
    'CUSTOMER_CANCEL',
    'FRAUD',
    'OTHER',
  ]),
  idempotencyKey: z.string().min(8).optional(),
  items: z.array(RefundItemSchema).optional(),
});

export const CreateSettlementBatchSchema = z.object({
  sellerId: z.string().min(1, 'Seller ID is required'),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
});

export const DisbursePayoutSchema = z.object({
  settlementId: z.string().min(1, 'Settlement ID is required'),
  sellerId: z.string().min(1, 'Seller ID is required'),
  channel: PayoutChannelSchema,
  bankName: z.string().optional(),
  accountNumber: z.string().min(4, 'Valid account number required'),
  accountTitle: z.string().optional(),
  routingNumber: z.string().optional(),
  amountPoisha: PoishaInputSchema,
});

export type InitiatePaymentInput = z.infer<typeof InitiatePaymentSchema>;
export type GatewayWebhookInput = z.infer<typeof GatewayWebhookSchema>;
export type ProcessRefundInput = z.infer<typeof ProcessRefundSchema>;
export type CreateSettlementBatchInput = z.infer<typeof CreateSettlementBatchSchema>;
export type DisbursePayoutInput = z.infer<typeof DisbursePayoutSchema>;

// Backward-compatible camelCase aliases
export const createPaymentSchema = InitiatePaymentSchema;
export const paymentWebhookSchema = GatewayWebhookSchema;
export const processRefundSchema = ProcessRefundSchema;
export const createSettlementSchema = CreateSettlementBatchSchema;
export const createPayoutSchema = DisbursePayoutSchema;
