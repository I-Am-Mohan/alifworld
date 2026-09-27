/**
 * B2B Buyer Organizations, RFQs & Negotiated Commerce Validators
 */

import { z } from 'zod';

export const BusinessTypeEnum = z.enum([
  'CORPORATION',
  'LLC',
  'PARTNERSHIP',
  'SOLE_PROPRIETORSHIP',
]);

export const BuyerMemberRoleEnum = z.enum(['ADMIN', 'PURCHASER', 'APPROVER', 'VIEWER']);

export const PaymentTermsEnum = z.enum(['IMMEDIATE', 'NET_15', 'NET_30', 'NET_60']);

export const InviteBuyerMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: BuyerMemberRoleEnum.default('PURCHASER'),
  spendingLimitPoisha: z.number().int().nonnegative().default(0),
});

export const UpdateBuyerMemberSchema = z.object({
  role: BuyerMemberRoleEnum.optional(),
  spendingLimitPoisha: z.number().int().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED']).optional(),
});

export const AdminReviewOrganizationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  rejectionReason: z.string().max(500).optional(),
});

export const AdminConfigureCreditTermsSchema = z.object({
  creditStatus: z.enum(['DISABLED', 'PENDING_APPROVAL', 'APPROVED', 'SUSPENDED']),
  creditLimitPoisha: z.number().int().nonnegative(),
  creditTermsDays: z.number().int().min(0).max(90).default(0),
  earnsProductPoints: z.boolean().default(false),
  rewardsRuleVersion: z.string().default('b2b-rewards-v1.0'),
});

export const CreateRfqItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional().nullable(),
  productTitle: z.string().min(1, 'Product title is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  targetPricePoisha: z.number().int().positive().optional().nullable(),
  specifications: z.string().max(1000).optional().nullable(),
});

export const CreateRfqSchema = z.object({
  sellerId: z.string().optional().nullable(),
  title: z.string().min(3, 'RFQ title must be at least 3 characters'),
  purchaseOrderRef: z.string().max(100).optional().nullable(),
  requiredDeliveryDate: z.string().datetime({ offset: true }).optional().nullable(),
  shippingAddress: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  expiresInDays: z.number().int().min(1).max(60).default(14),
  items: z.array(CreateRfqItemSchema).min(1, 'At least one line item is required'),
});

export const CreateQuoteItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional().nullable(),
  productTitle: z.string().min(1, 'Product title is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPricePoisha: z.number().int().positive('Unit price must be positive poisha'),
  quantityBreakTier: z.string().max(200).optional().nullable(),
  leadTimeDays: z.number().int().nonnegative().optional().nullable(),
});

export const CreateQuoteSchema = z.object({
  validUntilDays: z.number().int().min(1).max(60).default(7),
  shippingPoisha: z.number().int().nonnegative().default(0),
  taxPoisha: z.number().int().nonnegative().default(0),
  paymentTerms: PaymentTermsEnum.default('IMMEDIATE'),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(CreateQuoteItemSchema).min(1, 'At least one quote line item is required'),
});

export const NegotiateQuoteSchema = z.object({
  notes: z.string().min(1, 'Negotiation rationale is required').max(2000),
  paymentTerms: PaymentTermsEnum.optional(),
  items: z.array(CreateQuoteItemSchema).min(1).optional(),
});

export const InternalApproveQuoteSchema = z.object({
  notes: z.string().max(500).optional().nullable(),
});

export const AcceptQuoteSchema = z.object({
  purchaseOrderRef: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type InviteBuyerMemberInput = z.infer<typeof InviteBuyerMemberSchema>;
export type UpdateBuyerMemberInput = z.infer<typeof UpdateBuyerMemberSchema>;
export type AdminReviewOrganizationInput = z.infer<typeof AdminReviewOrganizationSchema>;
export type AdminConfigureCreditTermsInput = z.infer<typeof AdminConfigureCreditTermsSchema>;
export type CreateRfqInput = z.input<typeof CreateRfqSchema>;
export type CreateQuoteInput = z.input<typeof CreateQuoteSchema>;
export type NegotiateQuoteInput = z.infer<typeof NegotiateQuoteSchema>;
export type InternalApproveQuoteInput = z.infer<typeof InternalApproveQuoteSchema>;
export type AcceptQuoteInput = z.infer<typeof AcceptQuoteSchema>;
