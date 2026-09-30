/**
 * Shipping Rate & Delivery Promise Validation Schemas
 *
 * Invariant: Input validation guarantees BDT poisha non-negative integers.
 * Invariant: Daily cutoff time validated against 24-hour HH:mm format.
 * Invariant: Standard Bangladesh 8 divisions supported.
 */

import { z } from 'zod';
import { BangladeshDivisionEnum } from './serviceability.validators';

export const ShippingMethodCodeEnum = z.enum([
  'STANDARD',
  'EXPRESS',
  'SAME_DAY',
  'NEXT_DAY',
  'HEAVY_FREIGHT',
]);

export const DeliveryZoneEnum = z.enum([
  'METRO_DHAKA',
  'DHAKA_SUBURBS',
  'MAJOR_CITIES',
  'REMOTE_UPAZILA',
  'ANY',
]);

export const ShippingClassCodeEnum = z.enum([
  'STANDARD',
  'FRAGILE',
  'HEAVY',
  'BULK',
  'HAZMAT',
  'PERISHABLE',
  'DIGITAL',
]);

export const ShippingAddressSchema = z.object({
  division: z.string().min(2, 'Division name is required'),
  district: z.string().min(2, 'District name is required'),
  upazila: z.string().nullable().optional(),
  postalCode: z.string().max(10).nullable().optional(),
  streetAddress: z.string().nullable().optional(),
});

export const ShippingItemInputSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  productTitle: z.string().min(1, 'Product title is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
  weightGrams: z.number().int().nonnegative().nullable().optional(),
  lengthMm: z.number().int().nonnegative().nullable().optional(),
  widthMm: z.number().int().nonnegative().nullable().optional(),
  heightMm: z.number().int().nonnegative().nullable().optional(),
  shippingClass: z.string().nullable().optional(),
  requiresShipping: z.boolean().optional(),
  unitPricePoisha: z.union([z.number().int().nonnegative(), z.bigint()]),
  sellerId: z.string().min(1, 'Seller ID is required'),
});

export const CalculateShippingRatesSchema = z
  .object({
    address: ShippingAddressSchema,
    cartId: z.string().optional(),
    items: z.array(ShippingItemInputSchema).optional(),
    shippingMethod: ShippingMethodCodeEnum.optional().default('STANDARD'),
  })
  .refine((data) => Boolean(data.cartId) || (Array.isArray(data.items) && data.items.length > 0), {
    message: 'Either cartId or a non-empty items array must be provided.',
    path: ['cartId'],
  });

export const CalculateShippingPromiseSchema = z.object({
  destinationDivision: z.string().min(2, 'Destination division is required'),
  destinationDistrict: z.string().min(2, 'Destination district is required'),
  destinationUpazila: z.string().nullable().optional(),
  originDivision: z.string().optional().default('DHAKA'),
  originDistrict: z.string().optional().default('Dhaka'),
  sellerId: z.string().optional(),
  shippingMethod: ShippingMethodCodeEnum.optional().default('STANDARD'),
  asOfDate: z.string().datetime().optional(),
});

export const CreateShippingRateRuleSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[A-Z0-9_-]+$/, 'Rule code must be uppercase alphanumeric with dashes/underscores'),
  name: z.string().min(3).max(128),
  nameBn: z.string().max(128).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  shippingMethod: ShippingMethodCodeEnum.default('STANDARD'),
  originZone: z.string().default('ANY'),
  destinationZone: z.string().default('ANY'),
  sellerId: z.string().nullable().optional(),
  courierProvider: z.string().nullable().optional(),
  baseRatePoisha: z.number().int().nonnegative(),
  baseWeightGrams: z.number().int().positive().default(1000),
  incrementalWeightGrams: z.number().int().positive().default(1000),
  incrementalRatePoisha: z.number().int().nonnegative().default(2000),
  freeShippingThresholdPoisha: z.number().int().nonnegative().nullable().optional(),
  handlingDays: z.number().int().min(0).max(14).default(1),
  transitDaysMin: z.number().int().min(0).max(14).default(1),
  transitDaysMax: z.number().int().min(1).max(30).default(3),
  cutoffTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Cutoff time must be 24-hr HH:mm format (e.g. 14:00)')
    .default('14:00'),
  isCodAllowed: z.boolean().default(true),
  maxCodAmountPoisha: z.number().int().nonnegative().default(5000000),
  fragileSurchargePoisha: z.number().int().nonnegative().default(0),
  heavySurchargePoisha: z.number().int().nonnegative().default(0),
  priority: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
  ruleVersion: z.string().default('v1.0.0'),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateShippingRateRuleSchema = CreateShippingRateRuleSchema.partial().extend({
  id: z.string().min(1, 'Rule ID is required'),
});

export type CalculateShippingRatesInput = z.infer<typeof CalculateShippingRatesSchema>;
export type CalculateShippingPromiseInput = z.infer<typeof CalculateShippingPromiseSchema>;
export type CreateShippingRateRuleInput = z.infer<typeof CreateShippingRateRuleSchema>;
export type UpdateShippingRateRuleInput = z.infer<typeof UpdateShippingRateRuleSchema>;
