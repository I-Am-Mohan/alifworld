/**
 * AlifWorld Warehouse & Inventory Zod Validators
 * 
 * Strict validation for warehouse setups, stock intake, atomic reservations,
 * and ledger adjustments.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0016, ADR-0022, ADR-0026
 */

import { z } from 'zod';
import { MovementType, SourceType } from '../types';

const WAREHOUSE_CODE_REGEX = /^[A-Z0-9_-]{3,20}$/;

export const BangladeshDivisions = [
  'DHAKA',
  'CHITTAGONG',
  'RAJSHAHI',
  'KHULNA',
  'BARISAL',
  'SYLHET',
  'RANGPUR',
  'MYMENSINGH',
] as const;

export const CreateWarehouseSchema = z.object({
  sellerId: z.string().optional().nullable(),
  name: z.string().min(3, 'Warehouse name must be at least 3 characters').max(100),
  code: z.string().regex(WAREHOUSE_CODE_REGEX, 'Code must be uppercase alphanumeric (3-20 chars)'),
  division: z.enum(BangladeshDivisions, {
    errorMap: () => ({ message: 'Must be one of Bangladesh 8 administrative divisions' }),
  }),
  district: z.string().min(2, 'District is required').max(50),
  upazila: z.string().max(50).optional().nullable(),
  addressLine: z.string().min(5, 'Physical address line is required').max(255),
  postalCode: z.string().max(20).optional().nullable(),
  isPlatformHub: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial().extend({
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
});

export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;

export const ReceiveStockSchema = z.object({
  warehouseId: z.string().min(4, 'Warehouse ID is required'),
  variantId: z.string().min(4, 'Product Variant ID is required'),
  quantity: z.number().int().min(1, 'Intake quantity must be at least 1 unit'),
  sourceType: z.nativeEnum(SourceType).default(SourceType.PURCHASE_ORDER),
  sourceId: z.string().min(2, 'Source reference ID is required'),
  reason: z.string().max(255).optional().nullable(),
});

export type ReceiveStockInput = z.infer<typeof ReceiveStockSchema>;

export const ReserveStockSchema = z.object({
  warehouseId: z.string().min(4, 'Warehouse ID is required'),
  variantId: z.string().min(4, 'Product Variant ID is required'),
  quantity: z.number().int().min(1, 'Reservation quantity must be at least 1 unit'),
  orderId: z.string().optional().nullable(),
  cartId: z.string().optional().nullable(),
  ttlMinutes: z.number().int().min(1).max(1440).default(15), // Default 15-minute checkout reservation
});

export type ReserveStockInput = z.infer<typeof ReserveStockSchema>;

export const ReleaseReservationSchema = z.object({
  reservationId: z.string().min(4, 'Reservation ID is required'),
  reason: z.string().max(255).optional().nullable(),
});

export type ReleaseReservationInput = z.infer<typeof ReleaseReservationSchema>;

export const CommitReservationSchema = z.object({
  reservationId: z.string().min(4, 'Reservation ID is required'),
  orderId: z.string().min(2, 'Order ID is required to commit reservation'),
});

export type CommitReservationInput = z.infer<typeof CommitReservationSchema>;

export const AdjustStockSchema = z.object({
  stockBalanceId: z.string().min(4, 'Stock balance ID is required'),
  movementType: z.enum([MovementType.ADJUST, MovementType.DAMAGE, MovementType.WRITE_OFF]),
  quantityDelta: z.number().int().refine((val) => val !== 0, {
    message: 'Quantity delta cannot be zero',
  }),
  reason: z.string().min(5, 'Mandatory audit reason required for manual inventory adjustments'),
});

export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
