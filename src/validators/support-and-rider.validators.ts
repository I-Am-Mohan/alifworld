/**
 * Zod Validation Schemas for Support & Delivery Rider Subsystems
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0024, Milestone 046
 */

import { z } from 'zod';
import { isValidId, ID_PREFIXES } from '@/shared/utils/id';

function createPrefixedIdSchema(expectedPrefix: (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]) {
  return z.string().refine((val) => isValidId(val, expectedPrefix), {
    message: `Invalid identifier. Expected prefix: '${expectedPrefix}_'`,
  });
}

export const OrderIdSchema = createPrefixedIdSchema(ID_PREFIXES.ORDER);
export const UserIdSchema = createPrefixedIdSchema(ID_PREFIXES.USER);
export const SellerIdSchema = createPrefixedIdSchema(ID_PREFIXES.SELLER);

/**
 * Support Ticket Category Enum
 */
export const TicketCategoryEnum = z.enum([
  'ORDER_INQUIRY',
  'DELIVERY_DELAY',
  'PAYMENT_ISSUE',
  'REFUND_REQUEST',
  'PRODUCT_DEFECT',
  'ACCOUNT_SECURITY',
  'SELLER_ONBOARDING',
  'GENERAL_INQUIRY',
]);

export const TicketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const CreateSupportTicketSchema = z.object({
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  category: TicketCategoryEnum.default('ORDER_INQUIRY'),
  priority: TicketPriorityEnum.default('MEDIUM'),
  orderId: z.string().optional(),
  sellerId: z.string().optional(),
});

export type CreateSupportTicketInput = z.infer<typeof CreateSupportTicketSchema>;

export const ReplySupportTicketSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

export type ReplySupportTicketInput = z.infer<typeof ReplySupportTicketSchema>;

export const ResolveSupportTicketSchema = z.object({
  resolutionNote: z.string().trim().max(500).optional(),
});

export type ResolveSupportTicketInput = z.infer<typeof ResolveSupportTicketSchema>;

/**
 * Delivery Rider Schemas
 */
export const RiderAcceptAssignmentSchema = z.object({
  deliveryId: z.string().trim().min(5, 'Delivery / shipment identifier is required'),
  leaseToken: z.string().trim().optional(),
});

export type RiderAcceptAssignmentInput = z.infer<typeof RiderAcceptAssignmentSchema>;

export const RiderLocationUpdateSchema = z.object({
  deliveryId: z.string().trim().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(200).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracyGps: z.number().min(0).max(1000).optional(),
});

export type RiderLocationUpdateInput = z.infer<typeof RiderLocationUpdateSchema>;

export const RiderStatusUpdateSchema = z.object({
  deliveryId: z.string().trim().min(5, 'Delivery identifier is required'),
  status: z.enum([
    'PICKED_UP',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'FAILED_DELIVERY',
  ]),
  note: z.string().trim().max(255).optional(),
  location: z.string().trim().max(100).optional(),
});

export type RiderStatusUpdateInput = z.infer<typeof RiderStatusUpdateSchema>;
